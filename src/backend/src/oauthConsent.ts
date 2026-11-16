import { createHmac, timingSafeEqual } from 'crypto';
import { Router, Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth, WEB_URL } from './auth-config';
import { pool } from './database';
import { requireSession } from './middleware';
import { sendError } from './http';
import { ServiceError } from './services/errors';

// Why this file exists: the installed better-auth MCP plugin issues an
// authorization code to any registered client as soon as a signed-in user
// lands on /mcp/authorize, and anyone can register a client. Without a
// consent step, opening a crafted link would hand a stranger a token.
//
// The gate below only lets an authorize request through when it carries a
// short-lived consent token that this server signed for exactly this user,
// client and redirect URI. The token is minted by POST /api/oauth/consent,
// which only the web app's own origin can call (credentialed CORS).

const CONSENT_PARAM = 'recr_consent';
const CONSENT_TTL_MS = 5 * 60 * 1000;

export interface ConsentClaims {
  userId: string;
  clientId: string;
  redirectUri: string;
}

function secret(): string {
  const value = process.env.BETTER_AUTH_SECRET;
  if (!value) throw new Error('BETTER_AUTH_SECRET must be set to sign OAuth consent');
  return value;
}

const sign = (payload: string) =>
  createHmac('sha256', secret()).update(`oauth-consent:${payload}`).digest('base64url');

export function signConsent(claims: ConsentClaims, now: number = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({
      u: claims.userId,
      c: claims.clientId,
      r: claims.redirectUri,
      e: now + CONSENT_TTL_MS,
    }),
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyConsent(
  token: unknown,
  expected: ConsentClaims,
  now: number = Date.now(),
): boolean {
  if (typeof token !== 'string') return false;
  const [payload, signature, ...rest] = token.split('.');
  if (!payload || !signature || rest.length) return false;

  const given = Buffer.from(signature);
  const wanted = Buffer.from(sign(payload));
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return false;

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return (
      claims.u === expected.userId &&
      claims.c === expected.clientId &&
      claims.r === expected.redirectUri &&
      typeof claims.e === 'number' &&
      claims.e > now
    );
  } catch {
    return false;
  }
}

const single = (value: unknown): string => (typeof value === 'string' ? value : '');

// Mounted on /api/auth/mcp/authorize, ahead of better-auth.
export async function consentGate(req: Request, res: Response, next: NextFunction) {
  const query = new URLSearchParams(req.originalUrl.split('?')[1] || '');
  const token = query.get(CONSENT_PARAM);
  query.delete(CONSENT_PARAM);
  const toConsentPage = () => res.redirect(302, `${WEB_URL}/authorize?${query.toString()}`);

  try {
    if (!token) return toConsentPage();
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    const approved =
      !!session?.user &&
      verifyConsent(token, {
        userId: session.user.id,
        clientId: query.get('client_id') || '',
        redirectUri: query.get('redirect_uri') || '',
      });
    if (!approved) return toConsentPage();

    // Hand better-auth the request without our parameter.
    req.url = `${req.url.split('?')[0]}?${query.toString()}`;
    req.originalUrl = `${req.originalUrl.split('?')[0]}?${query.toString()}`;
    next();
  } catch (error) {
    console.error('OAuth consent gate error:', error);
    toConsentPage();
  }
}

interface OAuthClient {
  clientId: string;
  name: string;
  redirectUris: string[];
}

async function findClient(clientId: string): Promise<OAuthClient | null> {
  if (!clientId) return null;
  const { rows } = await pool.query(
    `SELECT "clientId", name, "redirectURLs" FROM "oauthApplication"
     WHERE "clientId" = $1 AND disabled IS NOT TRUE`,
    [clientId],
  );
  if (!rows[0]) return null;
  return {
    clientId: rows[0].clientId,
    name: rows[0].name,
    redirectUris: String(rows[0].redirectURLs || '')
      .split(',')
      .filter(Boolean),
  };
}

function hostOf(uri: string): string {
  try {
    return new URL(uri).host;
  } catch {
    return '';
  }
}

const router = Router();

router.use(requireSession);

// What the consent page shows about the client asking for access.
router.get('/client', async (req: Request, res: Response) => {
  try {
    const client = await findClient(single(req.query.client_id));
    if (!client) throw new ServiceError(404, 'Unknown application');
    const redirectUri = single(req.query.redirect_uri);
    const registered = client.redirectUris.includes(redirectUri);
    res.json({
      data: {
        client_id: client.clientId,
        name: client.name,
        redirect_host: hostOf(registered ? redirectUri : client.redirectUris[0] || ''),
        redirect_uri_valid: registered,
      },
      error: null,
    });
  } catch (error) {
    sendError(res, error, 'Failed to load application');
  }
});

// The user clicked Allow.
router.post('/consent', async (req: Request, res: Response) => {
  try {
    const clientId = single(req.body?.client_id);
    const redirectUri = single(req.body?.redirect_uri);
    const client = await findClient(clientId);
    if (!client) throw new ServiceError(404, 'Unknown application');
    if (!client.redirectUris.includes(redirectUri)) {
      throw new ServiceError(400, 'redirect_uri is not registered for this application');
    }
    res.json({
      data: { consent: signConsent({ userId: req.user!.id, clientId, redirectUri }) },
      error: null,
    });
  } catch (error) {
    sendError(res, error, 'Failed to record consent');
  }
});

// Assistants that currently hold a token for this user.
router.get('/connections', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT t."clientId" AS client_id, a.name, MIN(t."createdAt") AS connected_at
       FROM "oauthAccessToken" t
       JOIN "oauthApplication" a ON a."clientId" = t."clientId"
       WHERE t."userId" = $1
       GROUP BY t."clientId", a.name
       ORDER BY connected_at DESC`,
      [req.user!.id],
    );
    res.json({ data: rows, error: null });
  } catch (error) {
    sendError(res, error, 'Failed to list connected assistants');
  }
});

// Revokes access and refresh tokens together (they share a row).
router.delete('/connections/:clientId', async (req: Request, res: Response) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM "oauthAccessToken" WHERE "userId" = $1 AND "clientId" = $2',
      [req.user!.id, req.params.clientId],
    );
    if (!rowCount) throw new ServiceError(404, 'Connection not found');
    res.json({ data: null, error: null });
  } catch (error) {
    sendError(res, error, 'Failed to disconnect assistant');
  }
});

export default router;
