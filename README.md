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

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/callback/google

# Better Auth
BETTER_AUTH_SECRET=your-random-secret-key
BETTER_AUTH_URL=http://localhost:3001
NEXT_PUBLIC_URL=http://localhost:3000
```

## API Endpoints

### Authentication
- `POST /api/auth/sign-up/email` - Email/password signup
- `POST /api/auth/sign-in/email` - Email/password sign-in
- `POST /api/auth/sign-out` - Sign out
- `GET /api/auth/session` - Get current session

### Payment Sources (Protected)
- `GET /api/payment-sources` - List user's payment sources
- `POST /api/payment-sources` - Create payment source
- `PUT /api/payment-sources/:id` - Update payment source
- `DELETE /api/payment-sources/:id` - Delete payment source

### Recurring Payments (Protected)
- `GET /api/recurring-payments` - List user's recurring payments
- `POST /api/recurring-payments` - Create recurring payment
- `PUT /api/recurring-payments/:id` - Update recurring payment
- `DELETE /api/recurring-payments/:id` - Delete recurring payment

`payment_source_id` and `category` are optional (nullable).

### Rates & Preferences
- `GET /api/rates` - USD-based exchange rates (fetched from open.er-api.com, cached server-side for 24h)
- `GET /api/preferences` - Current user's preferences (Protected)
- `PUT /api/preferences` - Update preferences, e.g. `{ "display_currency": "INR" }` (Protected)

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

The backend is configured to accept requests from:
- `http://localhost:3000` (development)
- `https://recr.shadowlanes.com` (production)

If you need to add more origins, update `src/backend/src/index.ts`

