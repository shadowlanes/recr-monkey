# recr-monkey
Track all your recurring payments and subscriptions.

One number for your monthly spend, a 30-day view of upcoming charges, and
multi-currency support: each subscription keeps its billing currency
(INR, USD, AED, …) while totals convert to a per-user display currency
using daily exchange rates.

## App Screens

- **Overview** (`/dashboard`) — monthly-spend hero, upcoming 30-day agenda, category breakdown
- **Subscriptions** (`/dashboard/subscriptions`) — sortable table with normalized monthly cost
- **Settings** (`/dashboard/settings`) — payment sources (optional metadata) and display currency
- A global quick-add dialog: only name, amount, and frequency are required

## Project Structure

- `src/web/` - Next.js frontend application
- `src/backend/` - Node.js/Express TypeScript backend API
- `src/backend/migrations/` - Database migration files
- `docs/mcp-plan.md` - Design notes for the AI access features

## Authentication

This project uses [better-auth](https://www.better-auth.com/) for authentication with support for:
- Email/password authentication
- Google OAuth (configurable)

### Database Schema Management

Better-auth manages its own tables (`user`, `session`, `account`, `verification`).
App tables (`payment_sources`, `recurring_payments`, `user_preferences`) come from
the custom migrations. Both run automatically on backend start.

## Development Setup

Requires a Postgres on `localhost:5432` (user `user`, password `password`) with an
empty database `recr_monkey_db`:

```bash
createdb -h localhost -U user recr_monkey_db
```

### Using Docker

```bash
cd src
docker compose up -d --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Without Docker

```bash
cd src/backend && npm install && npm run migrate && npm run dev   # :3001
cd src/web && npm install && npm run dev                          # :3000
```

### Local dev login

With `DEV_AUTH_BYPASS=true` (backend) and `NEXT_PUBLIC_DEV_AUTH=true` (web), any
email/password signs in (the user is auto-created). Ignored when
`NODE_ENV=production`.

## AI access (MCP and API keys)

An AI assistant can read and manage your subscriptions through the built-in
[MCP](https://modelcontextprotocol.io) server at `POST /mcp`, or through the
REST API. Both accept the same credentials.

### API keys

Create a key under **Settings → AI access**. A key is either read-only or
read-and-write, is shown once, and is stored only as a hash. Revoking it cuts
off access immediately.

Claude Code:

```bash
claude mcp add --transport http recr-monkey http://localhost:3001/mcp \
  --header "Authorization: Bearer recr_..."
```

Gemini CLI (`~/.gemini/settings.json`):

```json
{
  "mcpServers": {
    "recr-monkey": {
      "httpUrl": "http://localhost:3001/mcp",
      "headers": { "Authorization": "Bearer recr_..." }
    }
  }
}
```

REST with the same key:

```bash
curl -H "Authorization: Bearer recr_..." http://localhost:3001/api/recurring-payments/upcoming?days=14
```

### MCP tools

Assistants discover these automatically: each tool describes itself, and the server sends a short rules-of-use text on connect (`src/backend/src/mcp/instructions.ts`). For plain HTTP clients, the REST API is described at `GET /openapi.json` (OpenAPI 3.0, public, no data). Request bodies in the spec come from the same zod schemas the services validate with; paths and responses are written by hand in `src/backend/src/openapi.ts`, so update it when you change a route.

| Tool | What it does | Needs write |
|---|---|---|
| `list_subscriptions` | All subscriptions with native amount, currency, frequency | |
| `get_upcoming_charges` | Charges due in the next N days (default 30) | |
| `get_spend_summary` | Monthly and yearly totals in the display currency, by category | |
| `list_payment_sources` | Cards and accounts subscriptions can attach to | |
| `add_subscription` | Add a recurring payment | yes |
| `update_subscription` | Change some fields of a subscription | yes |
| `delete_subscription` | Delete a subscription | yes |

A read-only key does not see the write tools.

### Connect a cloud assistant (OAuth)

Assistants that run in the cloud (Claude on the web, ChatGPT connectors) call
the server from the internet and sign in with OAuth instead of a key. The
server implements discovery, dynamic client registration and PKCE. Before any
access is granted you see a consent page naming the assistant, and you can
disconnect it later under **Settings → AI access**.

This needs the app to be reachable over HTTPS on two hostnames of the same
domain (one for the web app, one for the API). The included override does
that with a Cloudflare tunnel:

1. In Cloudflare Zero Trust, create a tunnel with two public hostnames:
   `recr.shadowlanes.com → http://web:3000` and
   `api.recr.shadowlanes.com → http://backend:3001`.
2. In `src/.env` set `TUNNEL_TOKEN`, a real `BETTER_AUTH_SECRET`
   (`openssl rand -base64 32`), and `WEB_HOST` / `API_HOST` if yours differ.
3. Start in public mode:

   ```bash
   cd src
   docker compose -f docker-compose.yml -f docker-compose.public.yml up -d --build
   ```

4. In the assistant, add a custom connector / MCP server with the URL
   `https://api.recr.shadowlanes.com/mcp`. Your browser opens the consent page.

> **Warning: read before going public**
>
> - **Dev login is off in public mode, and must stay off.** With
>   `DEV_AUTH_BYPASS=true` on a public URL anyone can sign in as anyone.
> - **Accounts created through dev login have a password that is in this
>   repository** (`src/backend/src/dev-auth.ts`). Do not expose an instance
>   that holds such accounts: sign in with Google, or create a fresh account
>   with a real password and delete the dev one
>   (`DELETE FROM "user" WHERE email = '...'`; its data is removed with it).
> - **Use a real `BETTER_AUTH_SECRET`.** The local default is a known string.
> - **Sign-up is closed by default** (`DISABLE_SIGNUP=true`). To create your
>   account, start once with `DISABLE_SIGNUP=false`, sign up, then restart.

Custom MCP servers in the consumer Gemini app are not confirmed to work;
Gemini CLI works with an API key as shown above.

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/callback/google

# Better Auth
BETTER_AUTH_SECRET=your-random-secret-key
BETTER_AUTH_URL=http://localhost:3001   # public origin of the API
NEXT_PUBLIC_URL=http://localhost:3000   # public origin of the web app (CORS, consent page)
TZ=Asia/Kolkata                         # what "today" means for upcoming charges
```

## API Endpoints

### Authentication
- `POST /api/auth/sign-up/email` - Email/password signup
- `POST /api/auth/sign-in/email` - Email/password sign-in
- `POST /api/auth/sign-out` - Sign out
- `GET /api/auth/session` - Get current session

Protected endpoints accept a browser session, an API key
(`Authorization: Bearer recr_...`) or an OAuth access token. Read-only keys
are limited to `GET`.

### Payment Sources (Protected)
- `GET /api/payment-sources` - List user's payment sources
- `POST /api/payment-sources` - Create payment source
- `PUT /api/payment-sources/:id` - Update payment source
- `DELETE /api/payment-sources/:id` - Delete payment source

### Recurring Payments (Protected)
- `GET /api/recurring-payments` - List user's recurring payments
- `GET /api/recurring-payments/upcoming?days=30` - Charges due in the window, with display-currency totals
- `GET /api/recurring-payments/summary` - Monthly/yearly spend in the display currency, by category
- `POST /api/recurring-payments` - Create recurring payment
- `PUT /api/recurring-payments/:id` - Update recurring payment
- `DELETE /api/recurring-payments/:id` - Delete recurring payment

`payment_source_id` and `category` are optional (nullable).

### Rates & Preferences
- `GET /api/rates` - USD-based exchange rates (fetched from open.er-api.com, cached server-side for 24h)
- `GET /api/preferences` - Current user's preferences (Protected)
- `PUT /api/preferences` - Update preferences, e.g. `{ "display_currency": "INR" }` (Protected)

### AI access
- `POST /mcp` - MCP server (Streamable HTTP, bearer auth only)
- `GET|POST /api/api-keys`, `DELETE /api/api-keys/:id` - Manage API keys (browser session only)
- `GET /api/oauth/connections`, `DELETE /api/oauth/connections/:clientId` - Connected assistants (browser session only)
- `GET /.well-known/oauth-protected-resource`, `GET /.well-known/oauth-authorization-server` - OAuth discovery

## Tech Stack

- **Frontend:** Next.js 16, React, TypeScript, TailwindCSS
- **Backend:** Node.js 24, Express, TypeScript
- **Database:** PostgreSQL
- **Authentication:** better-auth
- **Containerization:** Docker, Docker Compose

## Migrations

The backend runs app migrations (`src/backend/migrations/`) and the better-auth
migration automatically on container start (`npm run startDocker`). Never edit an
applied migration; add a new numbered file.

### CORS Configuration

The web app's API accepts credentialed requests from `NEXT_PUBLIC_URL` and
`http://localhost:3000`. `/mcp` and the OAuth discovery, token and
registration endpoints accept any origin and never use cookies.
