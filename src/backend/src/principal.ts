import { IncomingHttpHeaders } from 'http';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './auth-config';
import { KEY_PREFIX, verifyKey } from './services/apiKeys';

// Who is calling, however they authenticated. Every protected entry point
// (REST and MCP) resolves the caller through here.
export interface Principal {
  userId: string;
  via: 'session' | 'api_key' | 'oauth';
  canWrite: boolean;
}

function bearerToken(headers: IncomingHttpHeaders): string | null {
  const header = headers.authorization;
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : '';
}

async function resolveOAuthToken(token: string): Promise<Principal | null> {
  const record = await auth.api.getMcpSession({
    headers: new Headers({ authorization: `Bearer ${token}` }),
  });
  if (!record?.userId) return null;
  // The plugin returns the stored row without checking expiry.
  if (new Date(record.accessTokenExpiresAt).getTime() <= Date.now()) return null;
  return { userId: record.userId, via: 'oauth', canWrite: true };
}

export async function resolvePrincipal(headers: IncomingHttpHeaders): Promise<Principal | null> {
  const token = bearerToken(headers);

  // A request that presents a bearer credential stands or falls on it:
  // never fall back to cookies.
  if (token !== null) {
    if (!token) return null;
    if (token.startsWith(KEY_PREFIX)) {
      const key = await verifyKey(token);
      return key ? { userId: key.userId, via: 'api_key', canWrite: key.scope === 'write' } : null;
    }
    return resolveOAuthToken(token);
  }

  const session = await auth.api.getSession({ headers: fromNodeHeaders(headers) });
  if (!session?.user) return null;
  return { userId: session.user.id, via: 'session', canWrite: true };
}
