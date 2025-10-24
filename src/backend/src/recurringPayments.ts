import { Router, Request, Response } from 'express';
import { RecurringPaymentsDB } from './db-operations';
import { ApiResponse } from './types';
import { requireAuth } from './middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(requireAuth);

// Get all recurring payments
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('Get recurring payments for user:', req.user?.id);
    const payments = await RecurringPaymentsDB.getAll(req.user!.id);

    const response: ApiResponse<any[]> = {
      data: payments,
      error: null
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting recurring payments:', error);
    const response: ApiResponse<null> = {
      data: null,
      error: { message: 'Failed to get recurring payments' }
    };
    res.status(500).json(response);
  }
});

// Check if user has recurring payments
router.get('/check', async (req: Request, res: Response) => {
  try {
    console.log('Check recurring payments');
    const hasPayments = await RecurringPaymentsDB.checkExists(req.user!.id);

    const response: ApiResponse<any[]> = {
      data: hasPayments ? [{ id: 'dummy' }] : [], // Return dummy data to match frontend expectation
      error: null
    };

    res.json(response);
  } catch (error) {
    console.error('Error checking recurring payments:', error);
    const response: ApiResponse<null> = {
      data: null,
      error: { message: 'Failed to check recurring payments' }
    };
    res.status(500).json(response);
  }
});

// Create recurring payment
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, amount, currency, frequency, payment_source_id, start_date, category } = req.body;

    if (!name || !amount || !currency || !frequency || !payment_source_id || !start_date || !category) {
      const response: ApiResponse<null> = {
        data: null,
        error: { message: 'All fields are required' }
      };
      return res.status(400).json(response);
    }

    const newPayment = await RecurringPaymentsDB.create(req.user!.id, {
      name,
      amount,
      currency,
      frequency,
      payment_source_id,
      start_date,
      category
    });

    console.log('Created recurring payment:', newPayment);

    const response: ApiResponse<any[]> = {
      data: [newPayment],
      error: null
    };

    res.json(response);
  } catch (error) {
    console.error('Error creating recurring payment:', error);
    const response: ApiResponse<null> = {
      data: null,
      error: { message: 'Failed to create recurring payment' }
    };
    res.status(500).json(response);
  }
});

// Update recurring payment
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, amount, currency, frequency, payment_source_id, start_date, category } = req.body;

    if (!name || !amount || !currency || !frequency || !payment_source_id || !start_date || !category) {
      const response: ApiResponse<null> = {
        data: null,
        error: { message: 'All fields are required' }
      };
      return res.status(400).json(response);
    }

    const updatedPayment = await RecurringPaymentsDB.update(id, req.user!.id, {
      name,
      amount,
      currency,
      frequency,
      payment_source_id,
      start_date,
      category
    });

    if (!updatedPayment) {
      const response: ApiResponse<null> = {
        data: null,
        error: { message: 'Recurring payment not found' }
      };
      return res.status(404).json(response);
    }

    console.log('Updated recurring payment:', updatedPayment);

    const response: ApiResponse<any[]> = {
      data: [updatedPayment],
      error: null
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating recurring payment:', error);
    const response: ApiResponse<null> = {
      data: null,
      error: { message: 'Failed to update recurring payment' }
    };
    res.status(500).json(response);
  }
});

// Delete recurring payment
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deleted = await RecurringPaymentsDB.delete(id, req.user!.id);
    if (!deleted) {
      const response: ApiResponse<null> = {
        data: null,
        error: { message: 'Recurring payment not found' }
      };
      return res.status(404).json(response);
    }

    console.log('Deleted recurring payment:', id);

    const response: ApiResponse<null> = {
      data: null,
      error: null
    };

    res.json(response);
  } catch (error) {
    console.error('Error deleting recurring payment:', error);
    const response: ApiResponse<null> = {
      data: null,
      error: { message: 'Failed to delete recurring payment' }
    };
    res.status(500).json(response);
  }
});

export default router;
