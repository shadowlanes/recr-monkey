import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { PaymentSource, PaymentSourceType } from '../entities';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { body, param, validationResult } from 'express-validator';

const router = Router();
const paymentSourceRepository = AppDataSource.getRepository(PaymentSource);

// Validation middleware
const validatePaymentSource = [
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('type').isIn(Object.values(PaymentSourceType)).withMessage('Invalid payment source type'),
  body('identifier').notEmpty().trim().withMessage('Identifier is required'),
];

const validateUUID = [
  param('id').isUUID().withMessage('Invalid ID format'),
];

// Helper function to check validation results
const checkValidation = (req: Request, res: Response): boolean => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
    return false;
  }
  return true;
};

// GET /api/payment-sources - Get all payment sources for the authenticated user
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paymentSources = await paymentSourceRepository.find({
      where: { user_id: req.user!.id },
      order: { created_at: 'DESC' },
    });

    res.json({
      success: true,
      data: paymentSources,
    });
  } catch (error) {
    console.error('Error fetching payment sources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment sources',
    });
  }
});

// GET /api/payment-sources/:id - Get a specific payment source
router.get('/:id', authenticateToken, validateUUID, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkValidation(req, res)) return;

  try {
    const paymentSource = await paymentSourceRepository.findOne({
      where: { id: req.params.id, user_id: req.user!.id },
    });

    if (!paymentSource) {
      return res.status(404).json({
        success: false,
        error: 'Payment source not found',
      });
    }

    res.json({
      success: true,
      data: paymentSource,
    });
  } catch (error) {
    console.error('Error fetching payment source:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment source',
    });
  }
});

// POST /api/payment-sources - Create a new payment source
router.post('/', authenticateToken, validatePaymentSource, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkValidation(req, res)) return;

  try {
    const { name, type, identifier } = req.body;

    const paymentSource = paymentSourceRepository.create({
      name,
      type,
      identifier,
      user_id: req.user!.id,
    });

    const savedPaymentSource = await paymentSourceRepository.save(paymentSource);

    res.status(201).json({
      success: true,
      data: savedPaymentSource,
    });
  } catch (error) {
    console.error('Error creating payment source:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment source',
    });
  }
});

// PUT /api/payment-sources/:id - Update a payment source
router.put('/:id', authenticateToken, validateUUID, validatePaymentSource, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkValidation(req, res)) return;

  try {
    const { name, type, identifier } = req.body;

    const paymentSource = await paymentSourceRepository.findOne({
      where: { id: req.params.id, user_id: req.user!.id },
    });

    if (!paymentSource) {
      return res.status(404).json({
        success: false,
        error: 'Payment source not found',
      });
    }

    paymentSource.name = name;
    paymentSource.type = type;
    paymentSource.identifier = identifier;

    const updatedPaymentSource = await paymentSourceRepository.save(paymentSource);

    res.json({
      success: true,
      data: updatedPaymentSource,
    });
  } catch (error) {
    console.error('Error updating payment source:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update payment source',
    });
  }
});

// DELETE /api/payment-sources/:id - Delete a payment source
router.delete('/:id', authenticateToken, validateUUID, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkValidation(req, res)) return;

  try {
    const paymentSource = await paymentSourceRepository.findOne({
      where: { id: req.params.id, user_id: req.user!.id },
    });

    if (!paymentSource) {
      return res.status(404).json({
        success: false,
        error: 'Payment source not found',
      });
    }

    await paymentSourceRepository.remove(paymentSource);

    res.json({
      success: true,
      message: 'Payment source deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting payment source:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete payment source',
    });
  }
});

export default router;
