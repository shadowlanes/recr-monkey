const express = require('express');
const cors = require('cors');
const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock user database (in-memory)
const mockUser = {
  id: 'user-123',
  email: 'user@example.com',
  user_metadata: {},
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString()
};

// Mock data stores
let paymentSources = [];
let recurringPayments = [];

// ==================== Authentication APIs ====================

// Sign up (always succeeds)
app.post('/api/auth/signup', (req, res) => {
  const { email, password } = req.body;
  console.log('Signup request:', { email });
  res.json({ 
    user: { ...mockUser, email },
    session: { access_token: 'mock-token', user: mockUser }
  });
});

// Sign in (always succeeds)
app.post('/api/auth/signin', (req, res) => {
  const { email, password } = req.body;
  console.log('Signin request:', { email });
  res.json({ 
    user: { ...mockUser, email },
    session: { access_token: 'mock-token', user: mockUser }
  });
});

// Sign out (always succeeds)
app.post('/api/auth/signout', (req, res) => {
  console.log('Signout request');
  res.json({ error: null });
});

// Get current user (always returns mock user)
app.get('/api/auth/user', (req, res) => {
  console.log('Get user request');
  res.json({ 
    data: { user: mockUser },
    error: null 
  });
});

// OAuth sign in (redirects)
app.post('/api/auth/oauth/:provider', (req, res) => {
  const { provider } = req.params;
  console.log('OAuth request for provider:', provider);
  res.json({ 
    data: { url: `${req.body.redirectTo || '/dashboard/onboarding'}` },
    error: null 
  });
});

// ==================== Payment Sources APIs ====================

// Get all payment sources
app.get('/api/payment-sources', (req, res) => {
  console.log('Get payment sources');
  res.json({ 
    data: paymentSources,
    error: null 
  });
});

// Create payment source
app.post('/api/payment-sources', (req, res) => {
  const { name, type, identifier } = req.body;
  const newSource = {
    id: `ps-${Date.now()}`,
    user_id: mockUser.id,
    name,
    type,
    identifier,
    created_at: new Date().toISOString()
  };
  paymentSources.push(newSource);
  console.log('Created payment source:', newSource);
  res.json({ 
    data: [newSource],
    error: null 
  });
});

// Update payment source
app.put('/api/payment-sources/:id', (req, res) => {
  const { id } = req.params;
  const { name, type, identifier } = req.body;
  
  const index = paymentSources.findIndex(s => s.id === id);
  if (index !== -1) {
    paymentSources[index] = {
      ...paymentSources[index],
      name,
      type,
      identifier
    };
    console.log('Updated payment source:', paymentSources[index]);
    res.json({ 
      data: [paymentSources[index]],
      error: null 
    });
  } else {
    res.status(404).json({ 
      data: null,
      error: { message: 'Payment source not found' }
    });
  }
});

// Delete payment source
app.delete('/api/payment-sources/:id', (req, res) => {
  const { id } = req.params;
  
  // Check if it's used by any recurring payment
  const isUsed = recurringPayments.some(p => p.payment_source_id === id);
  if (isUsed) {
    return res.status(400).json({
      data: null,
      error: { message: 'This payment source is used by recurring payments' }
    });
  }
  
  paymentSources = paymentSources.filter(s => s.id !== id);
  console.log('Deleted payment source:', id);
  res.json({ 
    data: null,
    error: null 
  });
});

// ==================== Recurring Payments APIs ====================

// Get all recurring payments
app.get('/api/recurring-payments', (req, res) => {
  console.log('Get recurring payments');
  res.json({ 
    data: recurringPayments,
    error: null 
  });
});

// Check if user has recurring payments
app.get('/api/recurring-payments/check', (req, res) => {
  console.log('Check recurring payments');
  res.json({ 
    data: recurringPayments.slice(0, 1),
    error: null 
  });
});

// Create recurring payment
app.post('/api/recurring-payments', (req, res) => {
  const { name, amount, currency, frequency, payment_source_id, start_date, category } = req.body;
  const newPayment = {
    id: `rp-${Date.now()}`,
    user_id: mockUser.id,
    name,
    amount,
    currency,
    frequency,
    payment_source_id,
    start_date,
    category,
    created_at: new Date().toISOString()
  };
  recurringPayments.push(newPayment);
  console.log('Created recurring payment:', newPayment);
  res.json({ 
    data: [newPayment],
    error: null 
  });
});

// Update recurring payment
app.put('/api/recurring-payments/:id', (req, res) => {
  const { id } = req.params;
  const { name, amount, currency, frequency, payment_source_id, start_date, category } = req.body;
  
  const index = recurringPayments.findIndex(p => p.id === id);
  if (index !== -1) {
    recurringPayments[index] = {
      ...recurringPayments[index],
      name,
      amount,
      currency,
      frequency,
      payment_source_id,
      start_date,
      category
    };
    console.log('Updated recurring payment:', recurringPayments[index]);
    res.json({ 
      data: [recurringPayments[index]],
      error: null 
    });
  } else {
    res.status(404).json({ 
      data: null,
      error: { message: 'Recurring payment not found' }
    });
  }
});

// Delete recurring payment
app.delete('/api/recurring-payments/:id', (req, res) => {
  const { id } = req.params;
  recurringPayments = recurringPayments.filter(p => p.id !== id);
  console.log('Deleted recurring payment:', id);
  res.json({ 
    data: null,
    error: null 
  });
});

// ==================== Health Check ====================

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Backend API is running!',
    timestamp: new Date().toISOString()
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Backend API listening on port ${port}`);
  console.log('Available endpoints:');
  console.log('  - POST /api/auth/signup');
  console.log('  - POST /api/auth/signin');
  console.log('  - POST /api/auth/signout');
  console.log('  - GET  /api/auth/user');
  console.log('  - POST /api/auth/oauth/:provider');
  console.log('  - GET  /api/payment-sources');
  console.log('  - POST /api/payment-sources');
  console.log('  - PUT  /api/payment-sources/:id');
  console.log('  - DELETE /api/payment-sources/:id');
  console.log('  - GET  /api/recurring-payments');
  console.log('  - GET  /api/recurring-payments/check');
  console.log('  - POST /api/recurring-payments');
  console.log('  - PUT  /api/recurring-payments/:id');
  console.log('  - DELETE /api/recurring-payments/:id');
});