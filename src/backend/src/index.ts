import express from 'express';
import cors from 'cors';
import authRouter from './auth';
import paymentSourcesRouter from './paymentSources';
import recurringPaymentsRouter from './recurringPayments';
import { runMigrations } from './database';

const app = express();
const port = 3001;

// CORS configuration for credentials
app.use(cors({
  origin: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Initialize database and run migrations
async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    await runMigrations();
    console.log('Database migrations completed');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

// Routes
app.use('/api/auth', authRouter);
app.use('/api/recurring-payments', recurringPaymentsRouter);
app.use('/api/payment-sources', paymentSourcesRouter);

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend API is running!',
    timestamp: new Date().toISOString()
  });
});

// Start server after database initialization
initializeDatabase().then(() => {
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
});
