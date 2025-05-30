import { Router } from 'express';
import authRoutes from './auth';
import paymentSourcesRoutes from './paymentSources';
import recurringPaymentsRoutes from './recurringPayments';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/payment-sources', paymentSourcesRoutes);
router.use('/recurring-payments', recurringPaymentsRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
