# Cloudflare Pages Deployment Guide

## Overview

This guide walks you through deploying the Next.js frontend to Cloudflare Pages while keeping the backend on Railway.

**Architecture:**
- **Frontend:** Cloudflare Pages (`recr.shadowlanes.com`)
- **Backend:** Railway (`api.recr.shadowlanes.com`)
- **Database:** Railway PostgreSQL

## Prerequisites

- [x] Backend deployed to Railway at `api.recr.shadowlanes.com`
- [x] Cloudflare account
- [x] GitHub repository with your code
- [x] Domain configured in Cloudflare DNS

## Step-by-Step Deployment

### 1. Prepare Your Repository

Ensure your code is pushed to GitHub:

```bash
git add .
git commit -m "Prepare for Cloudflare deployment"
git push origin main
```

### 2. Create Cloudflare Pages Project

1. **Login to Cloudflare:**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Select your account

2. **Create Pages Project:**
   - Click **Workers & Pages** in the sidebar
   - Click **Create application**
   - Select **Pages** tab
   - Click **Connect to Git**

3. **Connect GitHub:**
   - Authorize Cloudflare to access your GitHub account
   - Select the `recr-monkey` repository
   - Click **Begin setup**

### 3. Configure Build Settings

Set the following configuration:

| Setting | Value |
|---------|-------|
| **Project name** | `recr-monkey` (or your preferred name) |
| **Production branch** | `main` |
| **Framework preset** | Next.js |
| **Build command** | `npm run build:cf` |
| **Build output directory** | `.vercel/output/static` |
| **Root directory** | `src/web` |
| **Functions directory** | `.vercel/output/functions` |

### 4. Environment Variables

Click **Add environment variable** and add:

```bash
NEXT_PUBLIC_API_URL=https://api.recr.shadowlanes.com
```

**Important:** 
- The `NEXT_PUBLIC_` prefix is required for the variable to be accessible in the browser
- This tells your frontend where to find the backend API
 
Also enable Node.js compatibility in your Pages project (required by Next.js runtime):

- Go to Project → Settings → Functions → Compatibility flags
- Add: `nodejs_compat`

### 5. Deploy

1. Click **Save and Deploy**
2. Cloudflare will:
   - Clone your repository
   - Install dependencies
   - Build your Next.js app
   - Deploy to their global network

3. Wait for the build to complete (usually 2-5 minutes)

### 6. Configure Custom Domain

After successful deployment:

1. **Go to Project Settings:**
   - Click on your project
   - Navigate to **Custom domains**

2. **Add Custom Domain:**
   - Click **Set up a custom domain**
   - Enter `recr.shadowlanes.com`
   - Click **Continue**

3. **Verify DNS:**
   - If your domain is already on Cloudflare, it will auto-configure
   - If not, add the CNAME record as instructed:
     ```
     CNAME  recr  your-project.pages.dev
     ```

4. **Wait for SSL:**
   - Cloudflare will automatically provision an SSL certificate
   - This usually takes 1-2 minutes

### 7. Verify Deployment

Test your deployment:

1. **Check the site loads:**
   ```bash
   curl https://recr.shadowlanes.com
   ```

2. **Test API connection:**
   - Open https://recr.shadowlanes.com in your browser
   - Try to sign up/sign in
   - Check browser console for any CORS errors

3. **Verify environment variables:**
   - Open browser DevTools → Network tab
   - Look at API requests - they should go to `api.recr.shadowlanes.com`

## Automatic Deployments

Cloudflare Pages automatically deploys when you push to your repository:

- **Production:** Pushes to `main` branch → deploys to `recr.shadowlanes.com`
- **Preview:** Pull requests → get unique preview URLs

To trigger a new deployment:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

## Troubleshooting

### Build Fails

**Check build logs:**
1. Go to Cloudflare Pages dashboard
2. Click on your project
3. View **Deployments** → Click failed deployment
4. Review build logs for errors

**Common issues:**
- Missing dependencies: Check `package.json`
- TypeScript errors: Fix in your code
- Environment variables: Ensure `NEXT_PUBLIC_API_URL` is set

### CORS Errors

If you see CORS errors in the browser:

1. **Verify backend CORS configuration:**
   - Check `src/backend/src/index.ts`
   - Ensure `https://recr.shadowlanes.com` is in `allowedOrigins`
   - Ensure `credentials: true` is set

2. **Current backend CORS config:**
   ```typescript
   const allowedOrigins = [
     'http://localhost:3000',
     'https://recr.shadowlanes.com'
   ];
   ```

3. **Redeploy backend if needed:**
   - Changes to CORS config require backend redeployment
   - Railway will auto-deploy on git push

### API Calls Failing

**Check environment variable:**
```bash
# In your browser console
console.log(process.env.NEXT_PUBLIC_API_URL)
// Should output: https://api.recr.shadowlanes.com
```

**If undefined:**
1. Go to Cloudflare Pages → Settings → Environment variables
2. Verify `NEXT_PUBLIC_API_URL` is set for **Production**
3. Trigger a new deployment (the variable won't apply to existing builds)

### Authentication Issues

**Cookies not working:**
- Ensure backend uses `credentials: true` in CORS
- Ensure frontend API client uses `credentials: 'include'` in fetch calls
- Check that both domains use HTTPS (required for secure cookies)

**Current frontend config (already set):**
```typescript
fetch(url, {
  credentials: 'include',  // ✓ Already configured
  // ...
})
```

## Configuration Summary

### Frontend (Cloudflare Pages)
- **URL:** `https://recr.shadowlanes.com`
- **Environment Variable:** `NEXT_PUBLIC_API_URL=https://api.recr.shadowlanes.com`
- **Root Directory:** `src/web`
- **Build Command:** `npm run build:cf`
- **Output Directory:** `.vercel/output/static`
- **Functions Directory:** `.vercel/output/functions`
- **Compatibility flag:** `nodejs_compat`

### Backend (Railway)
- **URL:** `https://api.recr.shadowlanes.com`
- **CORS Origins:** `localhost:3000`, `recr.shadowlanes.com`
- **Environment Variables:** DB credentials, BETTER_AUTH_SECRET, etc.

## Monitoring & Logs

### View Deployment Logs
1. Cloudflare Dashboard → Pages → Your Project
2. Click on a deployment
3. View build and function logs

### View Runtime Logs
- Cloudflare Pages uses Edge Functions for SSR
- Logs are available in the deployment details

### Analytics
- Cloudflare provides built-in analytics
- Go to your project → Analytics tab
- View page views, bandwidth, requests, etc.

## Cost

Cloudflare Pages offers:
- **Free tier:** Unlimited bandwidth, 500 builds/month, unlimited requests
- **Paid tier:** $20/month for more builds and advanced features

For most projects, the free tier is sufficient! 🎉

## Next Steps

After successful deployment:

1. ✅ Test all features (signup, signin, payment tracking)
2. ✅ Set up monitoring/alerts
3. ✅ Configure analytics
4. ✅ Add custom error pages
5. ✅ Optimize performance (caching, CDN, etc.)

## Useful Commands

```bash
# View recent deployments
# (in Cloudflare Dashboard)

# Rollback to previous deployment
# (click on previous deployment → Rollback)

# Delete deployment
# (click on deployment → Delete)
```

## Additional Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Next.js on Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [Environment Variables Guide](https://developers.cloudflare.com/pages/platform/build-configuration/)
