import express from 'express';
import cors from 'cors';
import authRouter from './auth';
import paymentSourcesRouter, { checkPaymentSourceUsage, paymentSources } from './paymentSources';
import recurringPaymentsRouter, { recurringPayments } from './recurringPayments';

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/recurring-payments', recurringPaymentsRouter);

// Payment sources with dependency check middleware
app.use('/api/payment-sources', (req, res, next) => {
  // Check for delete operations
  if (req.method === 'DELETE') {
    const sourceId = req.params.id || req.url.split('/').pop();
    
    if (sourceId && checkPaymentSourceUsage(sourceId, recurringPayments)) {
      return res.status(400).json({
        data: null,
        error: { message: 'This payment source is used by recurring payments' }
      });
    }
  }
  next();
}, paymentSourcesRouter);

// Health check
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
