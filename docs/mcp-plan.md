# Plan: AI access to recr-monkey (service layer, API keys, MCP, OAuth)

Branch: `feature/mcp` (already created from `rewrite_v3`).

This plan is written to be executed top to bottom by an engineer who has not
seen the design discussion. Read `CLAUDE.md` first; its conventions apply
(`{ data, error }` envelopes, no hardcoded colors, commits **without** a
Claude co-author line).

## Goal

Let AI assistants read and change a user's subscriptions:

1. **Phase 1, service layer.** One set of per-user functions that REST and MCP
   both call. Upcoming-charge and spend math moves server-side.
2. **Phase 2, API keys + MCP server.** Personal API keys, and an MCP endpoint
   at `POST /mcp`. Works locally with Claude Code, Gemini CLI, scripts.
3. **Phase 3, OAuth + public URL.** OAuth 2.1 so cloud assistants (claude.ai,
   ChatGPT connectors) can connect, plus a way to expose the app publicly.

Out of scope: WhatsApp/Telegram bot, renewal reminders.

## Decisions already made (do not revisit)

| Decision | Reason |
|---|---|
| Stay on `better-auth@1.3.29`. Do **not** upgrade. | 1.7.x is ESM-only and moved MCP/API-key into separate packages; the backend is CommonJS. 1.3.29 already exports `mcp`, `oAuthDiscoveryMetadata`, `oAuthProtectedResourceMetadata` from `better-auth/plugins`. |
| MCP SDK: `@modelcontextprotocol/sdk@1.32.2` (the 1.x line), pinned exactly. | Ships CommonJS, works with the current `tsconfig.json` unchanged. Do not use the v2 `@modelcontextprotocol/server` package. |
| API keys are hand-rolled (own table, SHA-256). Do **not** use better-auth's `apiKey` plugin. | The plugin defaults to a 10-requests-per-day rate limit and its permission fields are server-only; our own table is ~60 lines and fully under our control. |
| OAuth uses better-auth's `mcp` plugin, with **our own consent step** in front of it. | In 1.3.29 the `mcp` plugin has no consent screen: a signed-in user who opens an authorize link is approved silently, for any self-registered client. See Phase 3. |
| MCP transport is stateless Streamable HTTP, one server instance per request. | No session store, survives restarts. |
| Shared math is **copied** into the backend, not put in a shared package. | Two ~90-line pure files. A shared package would need new Docker build contexts and Next config. Both copies carry a "keep in sync" header. |
| OAuth tokens grant read + write. API keys are `read` or `write` (write implies read). | The 1.3.29 plugin only supports OIDC scopes; per-tool scopes are not worth forcing in. |

## Facts verified against the installed packages

These were checked in a throwaway spike. Rely on them.

- `npx tsc --noEmit` passes with these imports under the existing tsconfig:
  ```ts
  import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
  import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
  import { z } from 'zod';
  import { mcp, oAuthDiscoveryMetadata, oAuthProtectedResourceMetadata } from 'better-auth/plugins';
  ```
- A stateless `POST /mcp` built as shown in Phase 2 answers `initialize` and
  `tools/call` correctly (response is `text/event-stream` with one `message`
  event).
- With the `mcp` plugin enabled, better-auth serves under `/api/auth`:
  `/mcp/authorize`, `/mcp/token`, `/mcp/register`, `/mcp/userinfo`,
  `/mcp/jwks`, `/mcp/get-session`, `/.well-known/oauth-authorization-server`.
  The metadata's `issuer` is `BETTER_AUTH_URL`.
- `auth.api.getMcpSession({ headers })` looks the bearer token up in the
  `oauthAccessToken` table and returns the row (`userId`, `clientId`,
  `scopes`, `accessTokenExpiresAt`, ...) or `null`. **It does not check
  expiry.** We must.
- `/mcp/authorize` redirects to `loginPage?<original query>` when there is no
  session, and otherwise issues a code immediately (no consent).

Not verified (needs a database, so verify while implementing): the exact
table and column names better-auth creates for the OAuth models. After the
migration runs, check with `psql -h localhost -U user recr_monkey_db -c '\d "oauthApplication"'`.

---

# Phase 1: service layer

Backend only. No behaviour change for the web app except stricter validation.

## 1.1 Dependencies and test runner

In `src/backend`:

```bash
npm install zod@^4
```

Add to `package.json` scripts:

```json
"test": "node -r ts-node/register --test \"src/**/*.test.ts\""
```

Tests use `node:test` and `node:assert/strict`. No jest in the backend.

## 1.2 Migration `02_created_via.sql`

New file `src/backend/migrations/02_created_via.sql`:

```sql
-- Which client created the row: web | api | mcp
ALTER TABLE recurring_payments
  ADD COLUMN IF NOT EXISTS created_via TEXT NOT NULL DEFAULT 'web';
```

Add `created_via: 'web' | 'api' | 'mcp'` to `RecurringPayment` in
`src/backend/src/types.ts`, and add the column to every `SELECT` / `RETURNING`
list and to the `INSERT` in `RecurringPaymentsDB` (`db-operations.ts`).
`update` must not change it. Add optional `created_via?: string` to the web
type in `src/web/app/types/index.ts` (not displayed anywhere yet).

While in `types.ts`, delete the unused Supabase-era `User` interface.

## 1.3 Copy the math

Create `src/backend/src/lib/money.ts` and `src/backend/src/lib/upcoming.ts`
by copying from `src/web/app/lib/`:

- `money.ts`: keep only `Frequency`, `Rates`, `convert`, `monthlyAmount`.
  Drop labels and `formatMoney`.
- `upcoming.ts`: copy whole file unchanged.

Put this header on both backend copies **and** on both web originals:

```ts
// DUPLICATED between src/web/app/lib and src/backend/src/lib.
// Change both copies together; both have unit tests.
```

Copy `src/web/app/lib/__tests__/upcoming.test.ts` and the `convert` /
`monthlyAmount` cases from `money.test.ts` into
`src/backend/src/lib/upcoming.test.ts` and `money.test.ts`, converting from
jest to `node:test` (`describe`/`it` come from `node:test`;
`expect(a).toBe(b)` becomes `assert.equal(a, b)`, `toEqual` becomes
`assert.deepEqual`, `toBeCloseTo(x, n)` becomes
`assert.ok(Math.abs(a - x) < 10 ** -n)`).

Dates are computed in the server's local timezone. Add `TZ=${TZ:-Asia/Kolkata}`
to the backend `environment` in `src/docker-compose.yml` and `TZ=Asia/Kolkata`
to `src/backend/.env.example`, with a comment that it decides what "today"
means for upcoming charges.

## 1.4 `src/backend/src/services/errors.ts`

```ts
export class ServiceError extends Error {
  constructor(public status: 400 | 404, message: string) {
    super(message);
  }
}
```

## 1.5 `src/backend/src/services/subscriptions.ts`

Every function takes `userId` first. No Express types in this file.

Schemas (zod):

```ts
const frequency = z.enum(['weekly', 'monthly', '4weeks', 'yearly']);
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')
  .refine((s) => !Number.isNaN(Date.parse(s)), 'not a real date');

export const subscriptionInput = z.object({
  name: z.string().trim().min(1).max(200),
  amount: z.coerce.number().positive(),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'must be a 3-letter code'),
  frequency,
  start_date: dateOnly,
  payment_source_id: z.string().min(1).nullish().transform((v) => v || null),
  category: z.string().trim().max(60).nullish().transform((v) => v || null),
});
export type SubscriptionInput = z.infer<typeof subscriptionInput>;
export const subscriptionPatch = subscriptionInput.partial();
```

Functions:

| Function | Behaviour |
|---|---|
| `listSubscriptions(userId)` | `RecurringPaymentsDB.getAll`. |
| `getSubscription(userId, id)` | Row or throw `ServiceError(404, 'Subscription not found')`. Needs a new `RecurringPaymentsDB.getById(id, userId)`. |
| `createSubscription(userId, raw, via)` | Parse with `subscriptionInput`; on failure throw `ServiceError(400, <first issue as "field: message">)`. If `payment_source_id` is set, verify it belongs to the user (see below) else `ServiceError(400, 'payment_source_id not found')`. Insert with `created_via = via`. |
| `updateSubscription(userId, id, rawPatch)` | Load existing (404 if missing), parse patch with `subscriptionPatch`, merge over existing, same source-ownership check, then `RecurringPaymentsDB.update` with the full merged row. |
| `deleteSubscription(userId, id)` | 404 if nothing deleted. |
| `upcomingCharges(userId, days)` | See 1.6. |
| `spendSummary(userId)` | See 1.6. |

Source ownership: replace `PaymentSourcesDB.exists(id)` with
`exists(id, userId)` (`WHERE id = $1 AND user_id = $2`). Today the REST API
accepts another user's source id; this closes that. Delete the unused
`isUsedByPayments`.

## 1.6 Read models (in the same service file)

Rates come from `getRates()` in `src/backend/src/rates.ts`; display currency
from `PreferencesDB.get(userId).display_currency`. Round every money value
with `Math.round(x * 100) / 100`. Never store converted amounts.

`upcomingCharges(userId, days)` (`days` clamped to 1..365, default 30)
returns:

```ts
{
  from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', display_currency: 'INR',
  total_in_display_currency: number,
  charges: Array<{
    date: 'YYYY-MM-DD', subscription_id: string, name: string,
    amount: number, currency: string,          // native billing currency
    amount_in_display_currency: number, category: string | null,
  }>
}
```

Build it with `upcomingCharges()` from `lib/upcoming.ts`. Format dates from
local parts (`getFullYear/getMonth/getDate`), never `toISOString()` (that
shifts the day in non-UTC zones).

`spendSummary(userId)` returns:

```ts
{
  display_currency: string, subscription_count: number,
  monthly_total: number, yearly_total: number,   // yearly = monthly * 12
  by_category: Array<{ category: string, monthly_total: number, count: number }>, // null category => 'Other', sorted desc
  rates_fetched_at: string,
}
```

Per subscription: `convert(monthlyAmount(amount, frequency), currency, display, rates)`.

## 1.7 `src/backend/src/services/paymentSources.ts`

`listSources`, `createSource`, `updateSource`, `deleteSource`, thin wrappers
over `PaymentSourcesDB` with zod validation: `name` 1..100 chars, `type` one
of `bank_account | debit_card | credit_card`, `identifier` string up to 20
chars (may be empty). 404 via `ServiceError`.

## 1.8 Rewire the routes

`recurringPayments.ts` and `paymentSources.ts` call the services. Add one
helper (for example in `src/backend/src/http.ts`):

```ts
export function sendError(res: Response, error: unknown, fallback: string) {
  if (error instanceof ServiceError) {
    return res.status(error.status).json({ data: null, error: { message: error.message } });
  }
  console.error(fallback, error);
  return res.status(500).json({ data: null, error: { message: fallback } });
}
```

Keep every existing response shape exactly (create/update still return
`data: [row]`; `/check` unchanged). REST creates pass `via = 'api'` when the
request was authenticated with an API key (Phase 2), otherwise `'web'`; for
Phase 1 pass `'web'`.

Add two routes to the recurring-payments router, **declared before**
`/:id` routes:

- `GET /api/recurring-payments/upcoming?days=30` → `{ data: <upcoming>, error: null }`
- `GET /api/recurring-payments/summary` → `{ data: <summary>, error: null }`

Remove the stale `console.log('Available endpoints: ...')` block in
`index.ts` (it lists routes that do not exist).

## 1.9 Tests

`src/backend/src/services/subscriptions.test.ts`: test the zod schemas only
(no DB): valid input passes; lowercase currency is uppercased; amount `0`,
frequency `daily`, date `2026-13-40`, empty name all fail; empty-string
`category` and `payment_source_id` become `null`.

## 1.10 Phase 1 acceptance

```bash
cd src/backend && npx tsc --noEmit && npm test
cd src/web && npx tsc --noEmit && npx jest && npm run build
cd src && docker compose up -d --build
```

Then in the browser at http://localhost:3000: add, edit and delete a
subscription. And:

```bash
curl -s -c /tmp/c.txt -H 'Content-Type: application/json' \
  -d '{"email":"plan@test.dev","password":"x"}' localhost:3001/api/auth/dev-login >/dev/null
curl -s -b /tmp/c.txt 'localhost:3001/api/recurring-payments/upcoming?days=30'
curl -s -b /tmp/c.txt localhost:3001/api/recurring-payments/summary
```

Commit: `Extract service layer; server-side upcoming and summary`.

---

# Phase 2: API keys and MCP server

## 2.1 Migration `03_api_keys.sql`

```sql
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,      -- sha256 hex of the full key
  key_hint TEXT NOT NULL,             -- last 4 chars, for display
  scope TEXT NOT NULL CHECK (scope IN ('read', 'write')),
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON api_keys(user_id);
```

Migration order problem: on a brand-new database the app migrations run
**before** better-auth creates `"user"`, so this FK would fail. Fix by
swapping the order in `package.json`:
`"migrate": "npm run migrate:better-auth && npm run migrate:app"`. Also
`index.ts` calls `runMigrations()` on start; that stays, it is a no-op after
`npm run migrate`. For `npm run dev` on a fresh DB the README must say to run
`npm run migrate` first (it already does).

## 2.2 `src/backend/src/services/apiKeys.ts`

```ts
import { createHash, randomBytes } from 'crypto';

const PREFIX = 'recr_';
export const hashKey = (key: string) => createHash('sha256').update(key).digest('hex');

// createKey(userId, name, scope) -> { id, name, scope, key_hint, created_at, key }
//   key = PREFIX + randomBytes(32).toString('base64url'); store hashKey(key) only.
//   `key` is returned exactly once and never stored.
// listKeys(userId)   -> rows without key_hash, newest first
// revokeKey(userId, id) -> ServiceError(404) if nothing deleted
// verifyKey(key) -> { userId, scope } | null
//   lookup by key_hash; on hit, UPDATE last_used_at = NOW() (do not await failure into the request)
```

Limit: at most 20 keys per user (`ServiceError(400, ...)`). `name` 1..60 chars.

## 2.3 One way to identify the caller: `src/backend/src/principal.ts`

```ts
export interface Principal {
  userId: string;
  via: 'session' | 'api_key' | 'oauth';
  canWrite: boolean;
}

export async function resolvePrincipal(headers: IncomingHttpHeaders): Promise<Principal | null>
```

Order:

1. `Authorization: Bearer <token>` present:
   - token starts with `recr_` → `verifyKey` → `{ via: 'api_key', canWrite: scope === 'write' }` or `null`.
   - otherwise (Phase 3) → OAuth access token lookup, see 3.3. In Phase 2 return `null`.
   - A bearer header that fails is `null`. Do **not** fall through to cookies.
2. No bearer header → `auth.api.getSession({ headers: fromNodeHeaders(headers) })`
   (`fromNodeHeaders` from `better-auth/node`) → `{ via: 'session', canWrite: true }`.

Rewrite `middleware.ts`:

- `requireAuth`: `resolvePrincipal`; `null` → existing 401 envelope. Set
  `req.principal` and keep `req.user = { id: principal.userId }` (narrow the
  `Express.Request.user` type to `{ id: string }`; only `.id` is used). If
  the method is not `GET`/`HEAD` and `!principal.canWrite` → 403
  `{ data: null, error: { message: 'This API key is read-only' } }`.
- `requireSession`: like `requireAuth` but also 403 unless
  `principal.via === 'session'`. Used for key management and consent.
- Delete `optionalAuth` (unused; confirm with grep).

In `recurringPayments.ts` create: `via = req.principal.via === 'session' ? 'web' : 'api'`.

CORS: add `'Authorization'` is already in `allowedHeaders`; nothing to change.

## 2.4 Key management routes: `src/backend/src/apiKeys.ts`

Mounted at `/api/api-keys`, all behind `requireSession` (a key must never be
able to mint or revoke keys).

- `GET /` → `{ data: Key[], error: null }`
- `POST /` body `{ name, scope }` → `{ data: Key & { key: string }, error: null }`
- `DELETE /:id` → `{ data: null, error: null }`

## 2.5 MCP server

```bash
cd src/backend && npm install --save-exact @modelcontextprotocol/sdk@1.32.2
```

### `src/backend/src/mcp/server.ts`

`export function buildMcpServer(principal: Principal): McpServer`.
`new McpServer({ name: 'recr-monkey', version: '1.0.0' })`, then register
tools with `server.registerTool(name, { title, description, inputSchema, annotations }, handler)`.
`inputSchema` is a plain object of zod fields (not `z.object(...)`).

Register write tools **only if** `principal.canWrite`.

Every handler goes through one wrapper:

```ts
const ok = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] });
const run = async (fn: () => Promise<unknown>) => {
  try { return ok(await fn()); }
  catch (e) {
    const message = e instanceof ServiceError ? e.message : 'Internal error';
    if (!(e instanceof ServiceError)) console.error('MCP tool error:', e);
    return { content: [{ type: 'text' as const, text: message }], isError: true };
  }
};
```

Tools:

| Tool | Input | Calls | Annotations |
|---|---|---|---|
| `list_subscriptions` | none | `listSubscriptions` | `readOnlyHint: true` |
| `get_upcoming_charges` | `days?: int 1..365 (default 30)` | `upcomingCharges` | `readOnlyHint: true` |
| `get_spend_summary` | none | `spendSummary` | `readOnlyHint: true` |
| `list_payment_sources` | none | `listSources` | `readOnlyHint: true` |
| `add_subscription` | `name, amount, currency, frequency, start_date?, category?, payment_source_id?` | `createSubscription(..., 'mcp')` | `readOnlyHint: false, destructiveHint: false` |
| `update_subscription` | `id` + any subset of the add fields | `updateSubscription` | `readOnlyHint: false, destructiveHint: false, idempotentHint: true` |
| `delete_subscription` | `id` | `deleteSubscription` | `readOnlyHint: false, destructiveHint: true` |

Strip `user_id` from every returned subscription/source.

Descriptions matter; the model picks tools from them. Use these:

- `list_subscriptions`: "List all of the user's recurring payments and subscriptions with their native billing amount, currency, frequency and start date. Use this to find a subscription's id before updating or deleting it."
- `get_upcoming_charges`: "List every charge due in the next N days (default 30), in date order, with the amount in its billing currency and converted to the user's display currency. Use this for 'what is due next' or 'what do I pay this week'."
- `get_spend_summary`: "Total monthly and yearly spend across all subscriptions, converted to the user's display currency, with a per-category breakdown."
- `add_subscription`: "Add a recurring payment. amount is in the billing currency (3-letter ISO code such as INR, USD, AED). frequency is weekly, monthly or yearly. start_date (YYYY-MM-DD) is the first or most recent charge date and anchors future charge dates; it defaults to today. category is optional, one of: Subscription, Entertainment, Housing, Utilities, Health, Insurance, Transport, Other."
- `update_subscription`: "Change fields on an existing subscription. Only pass the fields to change. Get the id from list_subscriptions."
- `delete_subscription`: "Permanently delete a subscription. This cannot be undone. Confirm with the user before calling."

`add_subscription.frequency` is `z.enum(['weekly','monthly','yearly'])`
(`4weeks` is legacy and hidden from add flows). `update_subscription.frequency`
allows all four. `start_date` default: today's local date as `YYYY-MM-DD`.

### `src/backend/src/mcp/route.ts`

```ts
export const mcpRouter = Router();

mcpRouter.post('/', async (req, res) => {
  const principal = await resolvePrincipal(req.headers);
  if (!principal || principal.via === 'session') {
    const base = process.env.BETTER_AUTH_URL || 'http://localhost:3001';
    res.setHeader('WWW-Authenticate', `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource"`);
    return res.status(401).json({
      jsonrpc: '2.0', id: null,
      error: { code: -32000, message: 'Unauthorized: send an API key or OAuth token as a Bearer token' },
    });
  }
  const server = buildMcpServer(principal);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => { transport.close(); server.close(); });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP request failed:', error);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Internal server error' } });
    }
  }
});

// Stateless server: no SSE stream to open, no session to delete.
const methodNotAllowed = (_req: Request, res: Response) =>
  res.status(405).set('Allow', 'POST').json({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Method not allowed' } });
mcpRouter.get('/', methodNotAllowed);
mcpRouter.delete('/', methodNotAllowed);
```

Cookie sessions are rejected on `/mcp` on purpose: it removes any CSRF
surface from the MCP endpoint.

### Mounting in `index.ts`

`/mcp` must be reachable by non-browser clients and by browser-based MCP
tools, without cookies. Mount it **before** the global `app.use(cors(...))`
with its own CORS, and after `express.json()` is available to it:

```ts
const openCors = cors({
  origin: true, credentials: false,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Mcp-Protocol-Version', 'Mcp-Session-Id', 'Last-Event-ID'],
  exposedHeaders: ['WWW-Authenticate', 'Mcp-Session-Id'],
});
app.use('/mcp', openCors, express.json(), mcpRouter);
```

Then the existing global `cors` and `express.json()` for everything else.

## 2.6 Frontend: "API access" section on Settings

`src/web/app/lib/api-client.ts`: add `ApiKey` type and
`listApiKeys()`, `createApiKey(name, scope)`, `revokeApiKey(id)` in the same
style as the other methods (`credentials: 'include'`, throw on `error`).
Export `API_URL` so the page can show the MCP URL.

`src/web/app/dashboard/settings/page.tsx`: add a third `<section>` after
display currency, heading "AI access", matching the existing sections'
classes (same `h2`, same `bg-surface border border-line rounded-2xl` list).
Keep the key state local to this page (do not add it to `data-context`).
If the page passes ~450 lines, move the section to
`src/web/app/dashboard/settings/ai-access.tsx`.

Contents:

- Intro line: "Connect an AI assistant to read and manage your subscriptions."
- MCP URL row: `{API_URL}/mcp` in the mono font with a Copy button.
- List of keys: name, scope ("Read only" / "Read and write"), `recr_••••{key_hint}`
  in mono, last used (or "Never used"), and a "Revoke" action with the same
  two-step confirm pattern the payment dialog uses for delete.
- "Create key" button → `Dialog` with `Field`/`Input` for name and
  `ChipGroup` for scope (default "Read and write").
- After creation the dialog switches to a one-time reveal: the full key in a
  mono, selectable box, a Copy button, the text "Copy it now. It is not shown
  again.", and a ready-to-paste command:
  `claude mcp add --transport http recr-monkey {API_URL}/mcp --header "Authorization: Bearer {key}"`
- Empty state uses the muted bordered paragraph style of the sources section.

Use only the components in `components/ui/` and existing tokens. No
hardcoded colors.

## 2.7 Docs

README: new "AI access (MCP and API keys)" section: how to create a key, the
`claude mcp add` command above, the Gemini CLI `settings.json` form:

```json
{ "mcpServers": { "recr-monkey": {
  "httpUrl": "http://localhost:3001/mcp",
  "headers": { "Authorization": "Bearer recr_..." } } } }
```

and a curl example using the REST API with a bearer key. Add the tool table.
Update the API endpoint list (`/upcoming`, `/summary`, `/api/api-keys`,
`/mcp`). CLAUDE.md: add `services/`, `principal.ts`, `mcp/` to the
architecture notes; note that both auth paths end in `resolvePrincipal`, and
the duplicated-math rule.

## 2.8 Phase 2 acceptance

```bash
cd src/backend && npx tsc --noEmit && npm test
cd src/web && npx tsc --noEmit && npx jest && npm run build
cd src && docker compose up -d --build
```

Create a write key and a read key in the UI, then:

```bash
K=recr_...   # write key
H1='Content-Type: application/json'; H2='Accept: application/json, text/event-stream'
# 401 with WWW-Authenticate when no token
curl -si -H "$H1" -H "$H2" localhost:3001/mcp -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | head -5
# tools/list shows 7 tools
curl -s -H "$H1" -H "$H2" -H "Authorization: Bearer $K" localhost:3001/mcp \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
# add, then confirm it appears in the web UI
curl -s -H "$H1" -H "$H2" -H "Authorization: Bearer $K" localhost:3001/mcp \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"add_subscription","arguments":{"name":"MCP Test","amount":9.99,"currency":"USD","frequency":"monthly"}}}'
# REST with the same key
curl -s -H "Authorization: Bearer $K" localhost:3001/api/recurring-payments/summary
```

Also verify: the read key lists only 4 tools; the read key gets 403 on
`POST /api/recurring-payments`; a revoked key gets 401; a key gets 403 on
`GET /api/api-keys`; user A's key never returns user B's rows.

Optional real-client check: `npx @modelcontextprotocol/inspector`, transport
"Streamable HTTP", URL `http://localhost:3001/mcp`, bearer token set.

Commit: `Add API keys and MCP server`.

---

# Phase 3: OAuth for cloud assistants, and public exposure

Cloud assistants call the server from the internet and authenticate with
OAuth 2.1 (discovery, dynamic client registration, PKCE). Flow:

```
assistant ── POST /mcp (no token) ──▶ 401 + WWW-Authenticate: resource_metadata=…
assistant ── GET /.well-known/oauth-protected-resource ──▶ authorization server
assistant ── GET /.well-known/oauth-authorization-server ──▶ endpoints
assistant ── POST /api/auth/mcp/register ──▶ client_id
browser   ── GET  /api/auth/mcp/authorize?… ──▶ (our gate) web /authorize page
user signs in if needed, clicks Allow
browser   ── GET  /api/auth/mcp/authorize?…&recr_consent=… ──▶ redirect with code
assistant ── POST /api/auth/mcp/token ──▶ access + refresh token
assistant ── POST /mcp  Authorization: Bearer <token>
```

## 3.1 Enable the plugin (`auth-config.ts`)

```ts
import { mcp } from 'better-auth/plugins';

const webUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
const apiUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3001';

plugins: [
  mcp({
    loginPage: `${webUrl}/authorize`,
    resource: `${apiUrl}/mcp`,
    oidcConfig: {
      loginPage: `${webUrl}/authorize`,
      allowDynamicClientRegistration: true,
      requirePKCE: true,
      accessTokenExpiresIn: 60 * 60,
      refreshTokenExpiresIn: 60 * 60 * 24 * 30,
    },
  }),
],
```

Also in this file: make `trustedOrigins` `[webUrl, 'http://localhost:3000']`
de-duplicated (drop the hardcoded production origin; it now comes from
`NEXT_PUBLIC_URL`), and add
`emailAndPassword: { enabled: true, disableSignUp: process.env.DISABLE_SIGNUP === 'true' }`.
Do the same for the CORS allowlist in `index.ts` (`NEXT_PUBLIC_URL` plus
`http://localhost:3000`).

The migration is automatic: `npm run migrate:better-auth` creates the OAuth
tables. After it runs, record the real table/column names (see "Facts").

## 3.2 Discovery endpoints (`index.ts`)

Clients look for metadata at the origin root, not under `/api/auth`. Add,
before the global CORS, using `openCors` from 2.5:

```ts
const toExpress = (handler: (req: Request) => Promise<Response>) =>
  async (req: express.Request, res: express.Response) => {
    const base = process.env.BETTER_AUTH_URL || 'http://localhost:3001';
    const response = await handler(new Request(`${base}${req.originalUrl}`, { headers: fromNodeHeaders(req.headers) }));
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.send(await response.text());
  };

app.get(['/.well-known/oauth-authorization-server', '/.well-known/oauth-authorization-server/*'],
  openCors, toExpress(oAuthDiscoveryMetadata(auth)));
app.get(['/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/*'],
  openCors, toExpress(oAuthProtectedResourceMetadata(auth)));
```

(`Request`/`Response` here are the global fetch types; alias the Express ones
on import to avoid the name clash.) The `/*` variants exist because some
clients append the resource path (`…/oauth-protected-resource/mcp`).

The token, register and userinfo endpoints are called server-to-server or by
browser-based tools from other origins. Mount `openCors` for exactly
`/api/auth/mcp/token`, `/api/auth/mcp/register` and `/api/auth/mcp/userinfo`
before the global CORS. Do **not** open CORS for `/api/auth/mcp/authorize`.

## 3.3 Accept OAuth tokens in `resolvePrincipal`

For a bearer token that does not start with `recr_`:

```ts
const token = await auth.api.getMcpSession({ headers: new Headers({ authorization: `Bearer ${raw}` }) });
if (!token || !token.userId) return null;
if (new Date(token.accessTokenExpiresAt).getTime() <= Date.now()) return null; // plugin does not check this
return { userId: token.userId, via: 'oauth', canWrite: true };
```

`createSubscription` via REST with an OAuth token uses `via = 'api'`.

## 3.4 Consent gate (security-critical)

Without this, any website can register a client and, if the signed-in user
merely opens a link, receive a token for their account.

### Backend: `src/backend/src/oauthConsent.ts`

Consent token = `base64url(payload) + '.' + base64url(HMAC-SHA256(payload, BETTER_AUTH_SECRET))`
where `payload = JSON.stringify({ u: userId, c: client_id, r: redirect_uri, e: expiryEpochMs })`,
expiry 5 minutes. Compare signatures with `crypto.timingSafeEqual`.

Refuse to start if `BETTER_AUTH_SECRET` is unset when signing (throw).

1. **Gate middleware** on `GET /api/auth/mcp/authorize`, mounted before the
   better-auth router (and before `devAuthRouter`):
   - Read `recr_consent`, `client_id`, `redirect_uri` from the query.
   - Resolve the session (`auth.api.getSession`).
   - If there is a session **and** the consent token verifies **and** its
     `u`, `c`, `r` equal the session user id and the query's `client_id` /
     `redirect_uri` **and** it has not expired → `next()` (better-auth issues
     the code).
   - Otherwise → `302` to `${NEXT_PUBLIC_URL}/authorize?<original query string without recr_consent>`.
2. **`GET /api/oauth/client?client_id=…`** (`requireSession`) →
   `{ data: { client_id, name, redirect_host }, error: null }`, read from the
   OAuth application table via `pool` (verify table/column names; expected
   `"oauthApplication"` with `"clientId"`, `name`, `"redirectURLs"`
   comma-separated). `redirect_host` is the hostname of the first redirect
   URL. 404 envelope if unknown.
3. **`POST /api/oauth/consent`** (`requireSession`) body
   `{ client_id, redirect_uri }` → verify the client exists and
   `redirect_uri` is one of its registered URLs (400 otherwise) →
   `{ data: { consent: <token> }, error: null }`.
   This is a JSON POST under the global credentialed CORS allowlist, so only
   the web app's origin can call it; that is what makes the token
   unforgeable by other sites.

Unit-test sign/verify in `oauthConsent.test.ts`: round trip passes; tampered
payload, wrong user, wrong client, wrong redirect, and expired all fail.

### Frontend: `src/web/app/authorize/page.tsx`

A public page (outside `/dashboard`), client component, reads the query with
`useSearchParams` (wrap in `<Suspense>` as Next requires).

- Not signed in (`useAuth().user` null, not loading): render the existing
  `AuthForm` with a line above it: "Sign in to connect an assistant." The
  landing page redirects signed-in users to `/dashboard`; this page must
  **not** redirect. Check how `auth-form.tsx` / `auth-provider.tsx` navigate
  after sign-in: `signInWithEmail` currently pushes to `/dashboard`. Add an
  optional "stay on page" path (for example an `onSuccess` prop on
  `AuthForm`, or a `redirectTo` argument) so that after sign-in the user
  stays on `/authorize` with the query intact. For Google sign-in pass the
  current full URL as `callbackURL`.
- Signed in: call `api.getOAuthClient(client_id)`. Show a card:
  "**{name}** wants to access your recr-monkey account", the
  `redirect_host` in mono, the signed-in email, and a short list: "Read your
  subscriptions and payment sources", "Add, change and delete
  subscriptions". Buttons: **Allow** (primary) and **Cancel**.
- Allow → `api.grantOAuthConsent(client_id, redirect_uri)` → then
  `window.location.href = `${API_URL}/api/auth/mcp/authorize?${originalQuery}&recr_consent=${encodeURIComponent(token)}``.
- Cancel → if `redirect_uri` and `state` are present, navigate to
  `redirect_uri?error=access_denied&state=…`; else go to `/dashboard`.
- Missing `client_id` or unknown client → an error card, no buttons.

Build it from `components/ui` and tokens, visually consistent with the auth
card on the landing page.

Known edge: if the session expires in the seconds between Allow and the
redirect, better-auth sends the browser back to `/authorize` and the user
clicks Allow again. Acceptable.

## 3.5 Connected apps (Settings → AI access)

Below the API keys list, a "Connected assistants" list so access can be
revoked:

- `GET /api/oauth/connections` (`requireSession`) → distinct clients that
  hold a token for this user: `{ client_id, name, connected_at }` (join the
  access-token table to the application table; verify names).
- `DELETE /api/oauth/connections/:clientId` (`requireSession`) → delete that
  user's access-token rows for the client.

UI mirrors the keys list with a two-step "Disconnect". Hidden when empty.

## 3.6 Public exposure

Requirement: the web app and the API must be reachable over HTTPS on two
hostnames of the **same registrable domain**, so the session cookie set by
the API is sent on fetches from the web app (same-site). The project's
existing hostnames fit: `recr.shadowlanes.com` (web) and
`api.recr.shadowlanes.com` (API).

Recommended: a Cloudflare named tunnel from the local machine. This assumes
the domain's DNS is on Cloudflare. The human must create the tunnel in the
Cloudflare dashboard (two public hostnames: `recr.shadowlanes.com →
http://web:3000`, `api.recr.shadowlanes.com → http://backend:3001`) and
supply `TUNNEL_TOKEN`. **Do not attempt to create the tunnel or touch DNS;
stop and hand these steps to the user.**

Add `src/docker-compose.public.yml` (an override, used as
`docker compose -f docker-compose.yml -f docker-compose.public.yml up -d --build`):

```yaml
services:
  web:
    build:
      context: ./web
      args:
        NEXT_PUBLIC_API_URL: https://api.recr.shadowlanes.com
        NEXT_PUBLIC_DEV_AUTH: "false"
  backend:
    environment:
      - NODE_ENV=production
      - DEV_AUTH_BYPASS=false
      - DISABLE_SIGNUP=${DISABLE_SIGNUP:-true}
      - BETTER_AUTH_URL=https://api.recr.shadowlanes.com
      - NEXT_PUBLIC_URL=https://recr.shadowlanes.com
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET:?set a real secret in src/.env}
      - GOOGLE_REDIRECT_URI=https://api.recr.shadowlanes.com/api/auth/callback/google
  tunnel:
    image: cloudflare/cloudflared:latest
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${TUNNEL_TOKEN:?set TUNNEL_TOKEN in src/.env}
    depends_on: [web, backend]
```

Check that list-style `environment` entries in the override merge by key
with the base file (`docker compose -f … -f … config`); if not, convert both
files' `environment` blocks to map style.

Add `TUNNEL_TOKEN=`, `BETTER_AUTH_SECRET=`, `DISABLE_SIGNUP=true` to
`src/.env.example` with comments.

### Public-mode safety rules (must be in the README, in a warning block)

- **Dev login must be off.** With `DEV_AUTH_BYPASS=true` on a public URL
  anyone can sign in as anyone. The override sets it false and
  `NODE_ENV=production` double-locks it.
- **Dev-login accounts have a publicly known password**
  (`dev-bypass-password-not-secret` in `dev-auth.ts`). Before going public,
  the account must get a real password or use Google sign-in. Change
  `dev-auth.ts` so the dev password is
  `HMAC-SHA256(BETTER_AUTH_SECRET, 'dev-login:' + email)` hex instead of the
  constant. Existing dev users then fail dev login with the current 500
  message; document the reset: delete the user row
  (`DELETE FROM "user" WHERE email = '…'`; data cascades) or sign up fresh
  under a different email. Call this out to the user before changing it,
  since it invalidates their current local account.
- **Use a real `BETTER_AUTH_SECRET`** (`openssl rand -base64 32`). The
  compose default is a known string.
- **Sign-up is closed by default** in public mode (`DISABLE_SIGNUP=true`).
  To create the first account, start once with `DISABLE_SIGNUP=false`, sign
  up, then restart with it true.

## 3.7 Docs

README "Connect a cloud assistant" section: public-mode start command, the
safety block above, and connector setup: in Claude (Settings → Connectors →
Add custom connector) or ChatGPT (connectors / developer mode), enter
`https://api.recr.shadowlanes.com/mcp`; the browser opens the consent page.
Note that support for custom MCP servers in the consumer Gemini app is not
confirmed; Gemini CLI works with an API key (Phase 2). CLAUDE.md: add the
consent gate and why it exists, and the public-mode rules, to Gotchas.

## 3.8 Phase 3 acceptance

Local (no tunnel needed), stack running with the normal compose file:

```bash
npx tsc --noEmit && npm test            # backend
curl -s localhost:3001/.well-known/oauth-protected-resource
curl -s localhost:3001/.well-known/oauth-authorization-server
# 1. register a client
curl -s -H 'Content-Type: application/json' localhost:3001/api/auth/mcp/register \
  -d '{"client_name":"Plan Test","redirect_uris":["http://localhost:9999/cb"],"token_endpoint_auth_method":"none","grant_types":["authorization_code","refresh_token"],"response_types":["code"]}'
```

2. Make a PKCE pair (`verifier` = 43+ random chars, `challenge` =
   base64url(sha256(verifier))). Open in the browser:
   `http://localhost:3001/api/auth/mcp/authorize?response_type=code&client_id=<id>&redirect_uri=http://localhost:9999/cb&code_challenge=<challenge>&code_challenge_method=S256&state=abc&scope=openid`
3. Expect: redirect to `localhost:3000/authorize`, consent card naming
   "Plan Test". Allow → browser lands on `localhost:9999/cb?code=…&state=abc`
   (connection refused is fine; copy the code).
4. Exchange: `curl -s localhost:3001/api/auth/mcp/token -d grant_type=authorization_code -d code=<code> -d client_id=<id> -d redirect_uri=http://localhost:9999/cb -d code_verifier=<verifier>`
5. Call `tools/list` on `/mcp` with the access token → 7 tools.
6. Negative checks: opening the authorize URL while signed in, **without**
   clicking Allow, never reaches `localhost:9999`; a consent token minted
   for one client is rejected for another; after "Disconnect" in Settings
   the token gets 401.

Easier end-to-end alternative for steps 1–5: `npx @modelcontextprotocol/inspector`,
URL `http://localhost:3001/mcp`, use its OAuth flow.

Public mode and real connector tests need the user's tunnel token; list them
as manual steps for the user rather than attempting them.

Commit: `Add OAuth for MCP with consent gate; public compose override`.

---

## File map

New (backend, under `src/backend/`):

```
migrations/02_created_via.sql
migrations/03_api_keys.sql
src/lib/money.ts, upcoming.ts (+ .test.ts)
src/services/errors.ts, subscriptions.ts (+ .test.ts), paymentSources.ts, apiKeys.ts
src/http.ts
src/principal.ts
src/apiKeys.ts                 (routes)
src/mcp/server.ts, route.ts
src/oauthConsent.ts (+ .test.ts)   (gate, client info, consent, connections)
```

Changed (backend): `package.json`, `src/index.ts`, `src/middleware.ts`,
`src/auth-config.ts`, `src/dev-auth.ts`, `src/db-operations.ts`,
`src/types.ts`, `src/recurringPayments.ts`, `src/paymentSources.ts`,
`.env.example`.

New (web): `app/authorize/page.tsx`, optionally
`app/dashboard/settings/ai-access.tsx`.

Changed (web): `app/lib/api-client.ts`, `app/dashboard/settings/page.tsx`,
`app/components/auth/auth-form.tsx` and/or `auth-provider.tsx`,
`app/types/index.ts`, header comments on `app/lib/money.ts` and `upcoming.ts`.

Other: `src/docker-compose.yml` (TZ), `src/docker-compose.public.yml` (new),
`src/.env.example`, `README.md`, `CLAUDE.md`.

## Rules for the implementer

- One commit per phase, after that phase's acceptance checks pass. No
  co-author line.
- Never trust a client-sent user id. Every query filters by the principal's
  `userId`.
- Never log API keys, OAuth tokens or consent tokens.
- Do not upgrade `better-auth`, `express`, or switch the backend to ESM.
- If a better-auth call in this plan does not typecheck, read the types in
  `src/backend/node_modules/better-auth/dist/plugins/index.d.ts` rather than
  guessing, and keep the behaviour described here.
- Stop and ask the user before: changing the dev-login password scheme
  (3.6), anything involving Cloudflare, DNS, or real Google OAuth
  credentials.

---

## Implementation notes (what differs from the plan above)

All three phases are implemented on `feature/mcp`. Deviations and things
learned while building:

- **better-auth is mounted before `express.json()`** (not after, as it was).
  better-auth reads the raw body; with the JSON parser first, the
  form-encoded OAuth token request arrived empty. `dev-login` parses its own
  JSON for the same reason.
- **CORS is split by path** rather than layered: `/mcp`, discovery, and the
  OAuth token/register/userinfo endpoints take the open, cookie-less policy;
  everything else takes the credentialed allowlist. Layering the open policy
  in front did not work because the allowlist still rejected foreign origins.
- **`03_api_keys.sql` adds its foreign key conditionally**, like the earlier
  migrations, so a fresh database works whichever migration runs first. The
  `migrate` script order was still swapped (better-auth first).
- **REST `PUT` stays a full replace** (`replaceSubscription`); the partial
  `updateSubscription` is used by the MCP tool only.
- **`GET /api/oauth/client` also takes `redirect_uri`** and reports whether
  it is registered, so the consent page's Cancel can never redirect to an
  unregistered URL.
- **better-auth is pinned to exactly `1.3.29`.** Installing another package
  bumped the `^1.3.29` range to 1.4.x mid-implementation.
- **After a token refresh the previous access token keeps working until it
  expires** (one hour); the plugin adds a row rather than replacing it.
  "Disconnect" removes every row for the client.
- **Not done: the dev-login password change in 3.6.** It invalidates existing
  local dev accounts, so it is left for an explicit decision. The README
  warns not to expose an instance holding dev-login accounts.
- **Not done: anything needing the Cloudflare tunnel.** The compose override
  is written and its merge was checked with `docker compose config`, but
  public mode and real claude.ai / ChatGPT connectors have not been run.

Verified locally: unit tests (backend 45, web 25), typecheck and production
build of both apps, the Docker stack, the full OAuth flow by curl (register,
gate, consent, code exchange, PKCE failure, code replay, refresh, expiry,
disconnect, cross-user and cross-client consent reuse), and the consent and
settings screens in headless Chrome.
