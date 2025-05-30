import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { RecurringPayment, PaymentFrequency, PaymentSource } from '../entities';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { body, param, validationResult } from 'express-validator';

const router = Router();
const recurringPaymentRepository = AppDataSource.getRepository(RecurringPayment);
const paymentSourceRepository = AppDataSource.getRepository(PaymentSource);

// Validation middleware
const validateRecurringPayment = [
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('currency').isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
  body('frequency').isIn(Object.values(PaymentFrequency)).withMessage('Invalid frequency'),
  body('paymentSourceId').isUUID().withMessage('Invalid payment source ID'),
  body('startDate').isISO8601().toDate().withMessage('Invalid start date'),
  body('category').optional().trim(),
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

// GET /api/recurring-payments - Get all recurring payments for the authenticated user
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const recurringPayments = await recurringPaymentRepository.find({
      where: { userId: req.user!.id },
      relations: ['paymentSource'],
      order: { createdAt: 'DESC' },
    });

    res.json({
      success: true,
      data: recurringPayments,
    });
  } catch (error) {
    console.error('Error fetching recurring payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recurring payments',
    });
  }
});

// GET /api/recurring-payments/:id - Get a specific recurring payment
router.get('/:id', authenticateToken, validateUUID, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkValidation(req, res)) return;

  try {
    const recurringPayment = await recurringPaymentRepository.findOne({
      where: { id: req.params.id, userId: req.user!.id },
      relations: ['paymentSource'],
    });

    if (!recurringPayment) {
      return res.status(404).json({
        success: false,
        error: 'Recurring payment not found',
      });
    }

    res.json({
      success: true,
      data: recurringPayment,
    });
  } catch (error) {
    console.error('Error fetching recurring payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recurring payment',
    });
  }
});

// POST /api/recurring-payments - Create a new recurring payment
router.post('/', authenticateToken, validateRecurringPayment, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkValidation(req, res)) return;

  try {
    const { name, amount, currency, frequency, paymentSourceId, startDate, category } = req.body;

    // Verify that the payment source belongs to the user
    const paymentSource = await paymentSourceRepository.findOne({
      where: { id: paymentSourceId, userId: req.user!.id },
    });

    if (!paymentSource) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment source',
      });
    }

    const recurringPayment = recurringPaymentRepository.create({
      name,
      amount,
      currency,
      frequency,
      paymentSourceId,
      startDate,
      category,
      userId: req.user!.id,
    });

    const savedRecurringPayment = await recurringPaymentRepository.save(recurringPayment);

    // Fetch the saved payment with relations
    const recurringPaymentWithRelations = await recurringPaymentRepository.findOne({
      where: { id: savedRecurringPayment.id },
      relations: ['paymentSource'],
    });

    res.status(201).json({
      success: true,
      data: recurringPaymentWithRelations,
    });
  } catch (error) {
    console.error('Error creating recurring payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create recurring payment',
    });
  }
});

// PUT /api/recurring-payments/:id - Update a recurring payment
router.put('/:id', authenticateToken, validateUUID, validateRecurringPayment, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkValidation(req, res)) return;

  try {
    const { name, amount, currency, frequency, paymentSourceId, startDate, category } = req.body;

    const recurringPayment = await recurringPaymentRepository.findOne({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!recurringPayment) {
      return res.status(404).json({
        success: false,
        error: 'Recurring payment not found',
      });
    }

    // Verify that the payment source belongs to the user
    const paymentSource = await paymentSourceRepository.findOne({
      where: { id: paymentSourceId, userId: req.user!.id },
    });

    if (!paymentSource) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment source',
      });
    }

    recurringPayment.name = name;
    recurringPayment.amount = amount;
    recurringPayment.currency = currency;
    recurringPayment.frequency = frequency;
    recurringPayment.paymentSourceId = paymentSourceId;
    recurringPayment.startDate = startDate;
    recurringPayment.category = category;

    const updatedRecurringPayment = await recurringPaymentRepository.save(recurringPayment);

    // Fetch the updated payment with relations
    const recurringPaymentWithRelations = await recurringPaymentRepository.findOne({
      where: { id: updatedRecurringPayment.id },
      relations: ['paymentSource'],
    });

    res.json({
      success: true,
      data: recurringPaymentWithRelations,
    });
  } catch (error) {
    console.error('Error updating recurring payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update recurring payment',
    });
  }
});

// DELETE /api/recurring-payments/:id - Delete a recurring payment
router.delete('/:id', authenticateToken, validateUUID, async (req: AuthenticatedRequest, res: Response) => {
  if (!checkValidation(req, res)) return;

  try {
    const recurringPayment = await recurringPaymentRepository.findOne({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!recurringPayment) {
      return res.status(404).json({
        success: false,
        error: 'Recurring payment not found',
      });
    }

    await recurringPaymentRepository.remove(recurringPayment);

    res.json({
      success: true,
      message: 'Recurring payment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting recurring payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete recurring payment',
    });
  }
});

export default router;
