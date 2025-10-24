# Backend API Documentation

Base URL: `http://localhost:3001`

## Authentication APIs

### 1. Sign Up
**Endpoint:** `POST /api/auth/signup`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "user_metadata": {},
    "app_metadata": {},
    "aud": "authenticated",
    "created_at": "2025-01-01T00:00:00.000Z"
  },
  "session": {
    "access_token": "mock-token",
    "user": { ... }
  }
}
```

### 2. Sign In
**Endpoint:** `POST /api/auth/signin`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** Same as Sign Up

### 3. Sign Out
**Endpoint:** `POST /api/auth/signout`

**Response:**
```json
{
  "error": null
}
```

### 4. Get Current User
**Endpoint:** `GET /api/auth/user`

**Response:**
```json
{
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      ...
    }
  },
  "error": null
}
```

### 5. OAuth Sign In
**Endpoint:** `POST /api/auth/oauth/:provider`

**Parameters:**
- `provider`: github, google, etc.

**Request Body:**
```json
{
  "redirectTo": "/dashboard/onboarding"
}
```

**Response:**
```json
{
  "data": {
    "url": "/dashboard/onboarding"
  },
  "error": null
}
```

## Payment Sources APIs

### 6. Get All Payment Sources
**Endpoint:** `GET /api/payment-sources`

**Response:**
```json
{
  "data": [
    {
      "id": "ps-1234567890",
      "user_id": "user-123",
      "name": "Chase Checking",
      "type": "bank_account",
      "identifier": "****1234",
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "error": null
}
```

### 7. Create Payment Source
**Endpoint:** `POST /api/payment-sources`

**Request Body:**
```json
{
  "name": "Chase Checking",
  "type": "bank_account",
  "identifier": "****1234"
}
```

**Response:**
```json
{
  "data": [
    {
      "id": "ps-1234567890",
      "user_id": "user-123",
      "name": "Chase Checking",
      "type": "bank_account",
      "identifier": "****1234",
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "error": null
}
```

### 8. Update Payment Source
**Endpoint:** `PUT /api/payment-sources/:id`

**Request Body:**
```json
{
  "name": "Chase Checking Updated",
  "type": "bank_account",
  "identifier": "****5678"
}
```

**Response:** Same as Create Payment Source

### 9. Delete Payment Source
**Endpoint:** `DELETE /api/payment-sources/:id`

**Response:**
```json
{
  "data": null,
  "error": null
}
```

**Error Response (if in use):**
```json
{
  "data": null,
  "error": {
    "message": "This payment source is used by recurring payments"
  }
}
```

## Recurring Payments APIs

### 10. Get All Recurring Payments
**Endpoint:** `GET /api/recurring-payments`

**Response:**
```json
{
  "data": [
    {
      "id": "rp-1234567890",
      "user_id": "user-123",
      "name": "Netflix Subscription",
      "amount": 15.99,
      "currency": "USD",
      "frequency": "monthly",
      "payment_source_id": "ps-1234567890",
      "start_date": "2025-01-01",
      "category": "Entertainment",
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "error": null
}
```

### 11. Check If User Has Recurring Payments
**Endpoint:** `GET /api/recurring-payments/check`

**Response:**
```json
{
  "data": [
    {
      "id": "rp-1234567890",
      ...
    }
  ],
  "error": null
}
```

### 12. Create Recurring Payment
**Endpoint:** `POST /api/recurring-payments`

**Request Body:**
```json
{
  "name": "Netflix Subscription",
  "amount": 15.99,
  "currency": "USD",
  "frequency": "monthly",
  "payment_source_id": "ps-1234567890",
  "start_date": "2025-01-01",
  "category": "Entertainment"
}
```

**Response:**
```json
{
  "data": [
    {
      "id": "rp-1234567890",
      "user_id": "user-123",
      "name": "Netflix Subscription",
      "amount": 15.99,
      "currency": "USD",
      "frequency": "monthly",
      "payment_source_id": "ps-1234567890",
      "start_date": "2025-01-01",
      "category": "Entertainment",
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "error": null
}
```

### 13. Update Recurring Payment
**Endpoint:** `PUT /api/recurring-payments/:id`

**Request Body:**
```json
{
  "name": "Netflix Premium",
  "amount": 19.99,
  "currency": "USD",
  "frequency": "monthly",
  "payment_source_id": "ps-1234567890",
  "start_date": "2025-01-01",
  "category": "Entertainment"
}
```

**Response:** Same as Create Recurring Payment

### 14. Delete Recurring Payment
**Endpoint:** `DELETE /api/recurring-payments/:id`

**Response:**
```json
{
  "data": null,
  "error": null
}
```

## Data Types

### Payment Source Types
- `bank_account`
- `debit_card`
- `credit_card`

### Payment Frequencies
- `weekly`
- `monthly`
- `4weeks`
- `yearly`

### Supported Currencies
- USD, INR, AED, AUD, CAD, EUR, GBP, JPY

## Error Responses

All endpoints follow this error format:
```json
{
  "data": null,
  "error": {
    "message": "Error description"
  }
}
```

## Notes

- All authentication endpoints always succeed (no real auth validation)
- Data is stored in-memory and will be lost on server restart
- All endpoints return mock data compatible with Supabase response format
- CORS is enabled for all origins
