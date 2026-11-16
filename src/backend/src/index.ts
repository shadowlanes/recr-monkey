import express from 'express';
import cors from 'cors';
import authRouter from './auth';
import devAuthRouter, { devAuthEnabled } from './dev-auth';
import paymentSourcesRouter from './paymentSources';
import recurringPaymentsRouter from './recurringPayments';
import ratesRouter from './rates';
import preferencesRouter from './preferences';
import { runMigrations } from './database';

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);

// CORS configuration for development and production
const allowedOrigins = [
  'http://localhost:3000',
  'https://recr.shadowlanes.com'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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

// Health check endpoint
app.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});

// Routes
if (devAuthEnabled) {
  console.warn('⚠️  DEV_AUTH_BYPASS is ON: POST /api/auth/dev-login accepts any credentials');
  app.use('/api/auth', devAuthRouter); // must precede the better-auth catch-all
}
app.use('/api/auth', authRouter);
app.use('/api/recurring-payments', recurringPaymentsRouter);
app.use('/api/payment-sources', paymentSourcesRouter);
app.use('/api/rates', ratesRouter);
app.use('/api/preferences', preferencesRouter);

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
  });
});
