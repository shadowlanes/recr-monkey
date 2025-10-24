# Railway Deployment Guide

## Quick Start

### 1. Create Railway Project

1. Go to [Railway](https://railway.app)
2. Create a new project
3. Add PostgreSQL database from the service catalog

### 2. Configure Backend Service

1. **Add a new service** → Deploy from GitHub repo (or upload)
2. **Set root directory:** `src/backend`
3. **Configure build settings:**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Railway will automatically set `PORT` environment variable

### 3. Environment Variables

Add these in Railway's environment variables section:

#### Database (Auto-configured by Railway PostgreSQL)
These should be automatically set when you connect the PostgreSQL service:
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

If not, you can reference them from the PostgreSQL service using Railway's variable references:
```
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
```

#### Application Configuration
```bash
# Better Auth - REQUIRED
BETTER_AUTH_SECRET=<generate-random-32-char-string>
BETTER_AUTH_URL=https://api.recr.shadowlanes.com

# Frontend URL
FRONTEND_URL=https://recr.shadowlanes.com

# Google OAuth - OPTIONAL
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_REDIRECT_URI=https://api.recr.shadowlanes.com/api/auth/callback/google
```

#### Generate BETTER_AUTH_SECRET
```bash
# On macOS/Linux
openssl rand -base64 32

# Or Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4. Configure Custom Domain

1. In Railway project settings, add custom domain
2. Point `api.recr.shadowlanes.com` to the backend service
3. Update your DNS records as instructed by Railway

### 5. Deploy

Railway will automatically deploy when you push to your connected branch. The deployment process:

1. **Install dependencies:** `npm install`
2. **Build TypeScript:** `npm run build`
3. **Run migrations:** `npm run migrate` (via `prestart` hook)
   - Runs application migrations (`migrate:app`)
   - Runs better-auth migrations (`migrate:better-auth`)
4. **Start server:** `node dist/index.js`

### 6. Verify Deployment

Check that migrations ran successfully in Railway logs:
```
Initializing database...
Running application migrations...
Running better-auth migrations...
Database migrations completed
Server is running on port <PORT>
```

Test the API:
```bash
curl https://api.recr.shadowlanes.com/api/auth/session
```

## Migration Behavior

The `prestart` script ensures migrations always run before the server starts:
- **Safe for redeployments:** Migrations are idempotent
- **Zero downtime:** Schema updates happen automatically
- **No manual steps:** Everything is automated

## Troubleshooting

### Migration Errors

If migrations fail, check Railway logs:
```bash
railway logs
```

Common issues:
- Database connection variables not set
- TypeScript not compiled before migration (`npm run build` first)
- Better-auth CLI not finding config file (ensure root directory is `src/backend`)

### CORS Errors

If frontend can't connect:
1. Verify `FRONTEND_URL` is set correctly
2. Check `src/backend/src/index.ts` includes your frontend domain in `allowedOrigins`
3. Ensure frontend uses `credentials: 'include'` in API calls

### Port Issues

Railway automatically sets `PORT` environment variable. The backend is configured to use:
```typescript
const port = parseInt(process.env.PORT || '3001', 10);
```

Don't manually set `PORT` unless needed for debugging.

## Frontend Deployment (Separate)

Deploy the Next.js frontend to Vercel or another platform:

1. Set environment variables:
   ```bash
   NEXT_PUBLIC_API_URL=https://api.recr.shadowlanes.com
   ```

2. Configure domain: `recr.shadowlanes.com`

3. The frontend will automatically connect to your Railway backend

## Monitoring

Use Railway dashboard to:
- View deployment logs
- Monitor resource usage
- Check database metrics
- Set up alerts

## Database Backups

Railway PostgreSQL includes:
- Automatic daily backups
- Point-in-time recovery
- Manual backup options in dashboard
