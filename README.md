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

## Railway Deployment

### Prerequisites

1. Railway account with PostgreSQL addon
2. Custom domains configured:
   - Backend: `api.recr.shadowlanes.com`
   - Frontend: `recr.shadowlanes.com`

### Backend Deployment

1. **Create a new Railway project** and add a PostgreSQL database

2. **Configure environment variables** in Railway:
   ```bash
   # Database (automatically set by Railway PostgreSQL addon)
   DB_HOST=<from Railway>
   DB_PORT=<from Railway>
   DB_NAME=<from Railway>
   DB_USER=<from Railway>
   DB_PASSWORD=<from Railway>
   
   # Better Auth
   BETTER_AUTH_SECRET=<generate-a-random-32-char-string>
   BETTER_AUTH_URL=https://api.recr.shadowlanes.com
   
   # Google OAuth (optional)
   GOOGLE_CLIENT_ID=<your-google-client-id>
   GOOGLE_CLIENT_SECRET=<your-google-client-secret>
   GOOGLE_REDIRECT_URI=https://api.recr.shadowlanes.com/api/auth/callback/google
   
   # Frontend URL
   FRONTEND_URL=https://recr.shadowlanes.com
   ```

3. **Deploy the backend:**
   - Set root directory to `src/backend`
   - Build command: `npm install && npm run build`
   - Start command: `npm start` (migrations run automatically via `prestart` script)
   - Port: Railway will set `PORT` automatically

4. **Configure custom domain:**
   - Add `api.recr.shadowlanes.com` as custom domain in Railway settings

### Migration Strategy

The backend is configured to automatically run migrations before starting:
- `startDocker` script in `package.json` runs both application and better-auth migrations
- Ensures database schema is always up-to-date on each deployment
- Zero-downtime deployments with automatic schema updates

### Frontend Deployment (Cloudflare Pages)

#### Prerequisites
1. Cloudflare account
2. Domain configured: `recr.shadowlanes.com`
3. Backend already deployed to Railway at `api.recr.shadowlanes.com`

#### Deployment Steps

1. **Push your code to GitHub** (if not already):
   ```bash
   git push origin main
   ```

2. **Connect to Cloudflare Pages:**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Navigate to **Workers & Pages** → **Create application** → **Pages**
   - Connect your GitHub repository
   - Select the `recr-monkey` repository

3. **Configure build settings:**
   - **Project name:** `recr-monkey`
   - **Production branch:** `main`
   - **Framework preset:** Next.js
   - **Build command:** `npm run build`
   - **Build output directory:** `.next`
   - **Root directory:** `src/web`

4. **Set environment variables:**
   Click on **Environment variables** and add:
   ```
   NEXT_PUBLIC_API_URL=https://api.recr.shadowlanes.com
   ```

5. **Configure custom domain:**
   - After deployment, go to **Custom domains**
   - Add `recr.shadowlanes.com`
   - Update your DNS records as instructed by Cloudflare

6. **Deploy:**
   - Click **Save and Deploy**
   - Cloudflare will build and deploy your application

#### Important Notes for Cloudflare Pages

- **Static Export:** Cloudflare Pages works best with Next.js static exports or with their Next.js runtime
- **Environment Variables:** All API URLs must use `NEXT_PUBLIC_` prefix to be accessible in the browser
- **CORS:** Ensure your backend at `api.recr.shadowlanes.com` allows requests from `recr.shadowlanes.com`
- **Automatic Deployments:** Every push to `main` branch will trigger a new deployment

#### Alternative: Using Wrangler CLI

You can also deploy using Cloudflare's CLI:

```bash
cd src/web

# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy
npx @cloudflare/next-on-pages@1

# Or use their Pages integration
wrangler pages deploy .next --project-name=recr-monkey
```

### CORS Configuration

The backend is configured to accept requests from:
- `http://localhost:3000` (development)
- `https://recr.shadowlanes.com` (production)

If you need to add more origins, update `src/backend/src/index.ts`

