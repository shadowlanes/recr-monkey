import { betterAuth } from "better-auth";
import { mcp } from "better-auth/plugins";
import { Pool } from "pg";

// Create PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'recr_monkey_db',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'password',
});

// Public origins of the web app and of this API. Both default to local dev.
export const WEB_URL = (process.env.NEXT_PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');
export const API_URL = (process.env.BETTER_AUTH_URL || 'http://localhost:3001').replace(/\/$/, '');

// Browser origins allowed to call the API with cookies.
export const WEB_ORIGINS = [...new Set([WEB_URL, 'http://localhost:3000'])];

// Where the OAuth flow sends the user to sign in and approve a client.
const AUTHORIZE_PAGE = `${WEB_URL}/authorize`;

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true, // Enable email/password authentication
    // Close registration on a publicly reachable instance.
    disableSignUp: process.env.DISABLE_SIGNUP === 'true',
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      redirectURI: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/api/auth/callback/google",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  cookieCache: {
    enabled: true,
    maxAge: 5 * 60, // Cache duration in seconds
  },
  trustedOrigins: WEB_ORIGINS,
  plugins: [
    // OAuth 2.1 authorization server for MCP clients (discovery, dynamic
    // client registration, PKCE). This plugin version has no consent step of
    // its own; oauthConsent.ts gates /mcp/authorize. Do not remove that gate.
    mcp({
      loginPage: AUTHORIZE_PAGE,
      resource: `${API_URL}/mcp`,
      oidcConfig: {
        loginPage: AUTHORIZE_PAGE,
        allowDynamicClientRegistration: true,
        requirePKCE: true,
        accessTokenExpiresIn: 60 * 60,
        refreshTokenExpiresIn: 60 * 60 * 24 * 30,
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
