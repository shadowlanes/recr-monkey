import openApiRouter from './openapi';
import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import cors from 'cors';
import { fromNodeHeaders } from 'better-auth/node';
import { oAuthDiscoveryMetadata, oAuthProtectedResourceMetadata } from 'better-auth/plugins';
import authRouter from './auth';
import { auth, API_URL, WEB_ORIGINS } from './auth-config';
import oauthRouter, { consentGate } from './oauthConsent';
import devAuthRouter, { devAuthEnabled } from './dev-auth';
import paymentSourcesRouter from './paymentSources';
import recurringPaymentsRouter from './recurringPayments';
import ratesRouter from './rates';
import preferencesRouter from './preferences';
import apiKeysRouter from './apiKeys';
import { mcpRouter } from './mcp/route';
import { runMigrations } from './database';

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);

// Bearer-token endpoints for non-browser and third-party clients: any origin,
// never cookies. Mounted ahead of the credentialed allowlist below.
const openCors = cors({
  origin: true,
  credentials: false,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Mcp-Protocol-Version',
    'Mcp-Session-Id',
    'Last-Event-ID',
  ],
  exposedHeaders: ['WWW-Authenticate', 'Mcp-Session-Id'],
});

app.use('/mcp', openCors, express.json(), mcpRouter);

// OAuth discovery. Clients look for these at the origin root, sometimes with
// the resource path appended, not under /api/auth where better-auth serves them.
const toExpress =
  (handler: (request: Request) => Promise<Response>) =>
  async (req: ExpressRequest, res: ExpressResponse) => {
    try {
      const response = await handler(
        new Request(`${API_URL}${req.originalUrl}`, { headers: fromNodeHeaders(req.headers) }),
      );
      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.send(await response.text());
    } catch (error) {
      console.error('OAuth discovery error:', error);
      res.status(500).json({ error: 'server_error' });
    }
  };

app.get(
  ['/.well-known/oauth-authorization-server', '/.well-known/oauth-authorization-server/*'],
  openCors,
  toExpress(oAuthDiscoveryMetadata(auth)),
);
app.use('/openapi.json', openCors, openApiRouter);
app.get(
  ['/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/*'],
  openCors,
  toExpress(oAuthProtectedResourceMetadata(auth)),
);

// Token, registration and userinfo are called by OAuth clients from anywhere.
// The authorize endpoint is deliberately not opened up.
const OPEN_AUTH_PATHS = [
  '/api/auth/mcp/token',
  '/api/auth/mcp/register',
  '/api/auth/mcp/userinfo',
  '/api/auth/.well-known/',
];
const isOpenAuthPath = (path: string) => OPEN_AUTH_PATHS.some((open) => path.startsWith(open));

// Everything else is the web app's API: cookies, from known origins only.
const credentialedCors = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, server-to-server)
    if (!origin) return callback(null, true);

    if (WEB_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

app.use((req, res, next) =>
  isOpenAuthPath(req.path) ? openCors(req, res, next) : credentialedCors(req, res, next),
);

// Must run before better-auth: no authorization code without explicit consent.
app.all('/api/auth/mcp/authorize', consentGate);
if (devAuthEnabled) {
  console.warn('⚠️  DEV_AUTH_BYPASS is ON: POST /api/auth/dev-login accepts any credentials');
  app.use('/api/auth', devAuthRouter); // must precede the better-auth catch-all
}
// better-auth reads the raw request body itself (the OAuth token endpoint is
// form-encoded), so it must be mounted before express.json().
app.use('/api/auth', authRouter);

app.use(express.json());

// Initialize database and run migrations
async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    await runMigrations();
    console.log('Database migrations completed');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

// Health check endpoint
app.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});

// Routes
app.use('/api/recurring-payments', recurringPaymentsRouter);
app.use('/api/payment-sources', paymentSourcesRouter);
app.use('/api/rates', ratesRouter);
app.use('/api/preferences', preferencesRouter);
app.use('/api/api-keys', apiKeysRouter);
app.use('/api/oauth', oauthRouter);

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend API is running!',
    timestamp: new Date().toISOString()
  });
});

// Start server after database initialization
initializeDatabase().then(() => {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Backend API listening on port ${port}`);
  });
});
