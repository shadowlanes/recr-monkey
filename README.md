# recr-monkey
Track all your recurring payments and subscriptions

## Project Structure

- `src/web/` - Next.js frontend application
- `src/backend/` - Node.js/Express TypeScript backend API
- `src/backend/migrations/` - Database migration files

## Authentication

This project uses [better-auth](https://www.better-auth.com/) for authentication with support for:
- Email/password authentication
- Google OAuth (configurable)

### Database Schema Management

Better-auth manages its own database tables (`user`, `session`, `account`, `verification`) automatically. Application-specific tables (`payment_sources`, `recurring_payments`) are managed through custom migrations.

#### Running Better-Auth Migrations

After starting the database, run the better-auth migration command to create/update authentication tables:

```bash
cd src/backend
DB_HOST=localhost DB_PORT=5432 DB_NAME=recr_monkey_db DB_USER=user DB_PASSWORD=password \
  npx @better-auth/cli@latest migrate --config src/auth-config.ts -y
```

**Note:** The `-y` flag auto-confirms the migration. Remove it if you want to review changes before applying.

#### For Docker Setup

If running in Docker, the backend container automatically runs custom migrations on startup. After the containers are up, run the better-auth migration from your host machine:

```bash
cd src/backend
DB_HOST=localhost DB_PORT=5432 DB_NAME=recr_monkey_db DB_USER=user DB_PASSWORD=password \
  npx @better-auth/cli@latest migrate --config src/auth-config.ts -y
```

## Development Setup

### Using Docker

1. Start all services:
```bash
cd src
docker compose up -d
```

2. Run better-auth migrations:
```bash
cd backend
DB_HOST=localhost DB_PORT=5432 DB_NAME=recr_monkey_db DB_USER=user DB_PASSWORD=password \
  npx @better-auth/cli@latest migrate --config src/auth-config.ts -y
```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

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

## Tech Stack

- **Frontend:** Next.js 15, React, TypeScript, TailwindCSS
- **Backend:** Node.js 24, Express, TypeScript
- **Database:** PostgreSQL (latest)
- **Authentication:** better-auth
- **Containerization:** Docker, Docker Compose
