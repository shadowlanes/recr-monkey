# Supabase to Self-Hosted API Migration Guide

This document maps all Supabase functionality used in the app to the new self-hosted backend APIs.

## Overview

The backend provides **14 REST API endpoints** that replicate all Supabase functionality:
- **5 Authentication endpoints** (no real auth - always succeeds)
- **4 Payment Sources endpoints** (full CRUD)
- **5 Recurring Payments endpoints** (full CRUD + check)

## API Mapping

### Authentication Operations

| Supabase Code | Backend Endpoint | Notes |
|---------------|------------------|-------|
| `supabase.auth.signUp({ email, password })` | `POST /api/auth/signup` | Always succeeds |
| `supabase.auth.signInWithPassword({ email, password })` | `POST /api/auth/signin` | Always succeeds |
| `supabase.auth.signInWithOAuth({ provider })` | `POST /api/auth/oauth/:provider` | Returns redirect URL |
| `supabase.auth.getUser()` | `GET /api/auth/user` | Returns mock user |
| `supabase.auth.signOut()` | `POST /api/auth/signout` | Always succeeds |
| `supabase.auth.onAuthStateChange()` | Client-side only | Handle with state management |

### Payment Sources Operations

| Supabase Code | Backend Endpoint | Notes |
|---------------|------------------|-------|
| `supabase.from('payment_sources').select('*')` | `GET /api/payment-sources` | Returns all sources |
| `supabase.from('payment_sources').insert([...])` | `POST /api/payment-sources` | Creates new source |
| `supabase.from('payment_sources').update({...})` | `PUT /api/payment-sources/:id` | Updates existing source |
| `supabase.from('payment_sources').delete()` | `DELETE /api/payment-sources/:id` | Deletes source (checks dependencies) |

### Recurring Payments Operations

| Supabase Code | Backend Endpoint | Notes |
|---------------|------------------|-------|
| `supabase.from('recurring_payments').select('*')` | `GET /api/recurring-payments` | Returns all payments |
| `supabase.from('recurring_payments').select('id').limit(1)` | `GET /api/recurring-payments/check` | Check if user has any payments |
| `supabase.from('recurring_payments').insert([...])` | `POST /api/recurring-payments` | Creates new payment |
| `supabase.from('recurring_payments').update({...})` | `PUT /api/recurring-payments/:id` | Updates existing payment |
| `supabase.from('recurring_payments').delete()` | `DELETE /api/recurring-payments/:id` | Deletes payment |

## Response Format

All endpoints follow Supabase's response structure:

**Success Response:**
```javascript
{
  data: [...],  // Array of results or single object
  error: null
}
```

**Error Response:**
```javascript
{
  data: null,
  error: {
    message: "Error description"
  }
}
```

## Files That Need Updates

### 1. `/src/web/app/lib/supabase.ts`
- Keep currency utilities (no Supabase dependency)
- Replace `createClient()` with fetch-based API client

### 2. `/src/web/app/components/auth/auth-provider.tsx`
- Replace all `supabase.auth.*` calls with fetch to backend
- Update auth state management
- Remove `onAuthStateChange` (use session storage instead)

### 3. `/src/web/app/contexts/data-context.tsx`
- Replace all `supabase.from()` calls with fetch to backend
- Update all CRUD operations
- Keep same error handling pattern

### 4. Other files using Supabase:
- `/src/web/app/dashboard/payment-sources/page.tsx`
- `/src/web/app/dashboard/recurring-payments/page.tsx`
- Any other components making Supabase queries

## Environment Variables

Update docker-compose.yml to point to the backend:

```yaml
environment:
  - NEXT_PUBLIC_API_URL=http://backend:3001
```

## Migration Steps

1. ✅ **Backend created** with all 14 API endpoints
2. ⏳ **Create API client** to replace Supabase client
3. ⏳ **Update auth-provider** to use new APIs
4. ⏳ **Update data-context** to use new APIs
5. ⏳ **Test all features** work with new backend
6. ⏳ **Remove Supabase** dependencies from package.json

## Backend Features

### ✅ Implemented
- All authentication endpoints (mock - no real validation)
- Full CRUD for payment sources
- Full CRUD for recurring payments
- Dependency checking (can't delete source if used by payments)
- CORS enabled for frontend access
- Request/response logging
- In-memory data storage

### 🚧 To Be Implemented Later (if needed)
- PostgreSQL integration for persistent storage
- Real authentication with JWT tokens
- User session management
- Data validation
- Rate limiting
- API documentation UI (Swagger)

## Testing the Backend

```bash
# Health check
curl http://localhost:3001/

# Create payment source
curl -X POST http://localhost:3001/api/payment-sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Bank",
    "type": "bank_account",
    "identifier": "****1234"
  }'

# Get all payment sources
curl http://localhost:3001/api/payment-sources

# Create recurring payment
curl -X POST http://localhost:3001/api/recurring-payments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Netflix",
    "amount": 15.99,
    "currency": "USD",
    "frequency": "monthly",
    "payment_source_id": "ps-123",
    "start_date": "2025-01-01",
    "category": "Entertainment"
  }'

# Get all recurring payments
curl http://localhost:3001/api/recurring-payments
```

## Next Steps

Would you like me to:
1. Create the new API client to replace Supabase?
2. Update the auth-provider to use the new backend?
3. Update the data-context to use the new backend?
4. Connect backend to PostgreSQL for persistent storage?
