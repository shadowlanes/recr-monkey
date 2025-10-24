import { Router, Request, Response } from 'express';
import { PaymentSource, ApiResponse } from './types';
import { PaymentSourcesDB } from './db-operations';
import { requireAuth } from './middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(requireAuth);

// Get all payment sources
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('Get payment sources for user:', req.user?.id);
    const paymentSources = await PaymentSourcesDB.getAll(req.user!.id);
    
    const response: ApiResponse<PaymentSource[]> = {
      data: paymentSources,
      error: null
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error getting payment sources:', error);
    const response: ApiResponse<null> = {
      data: null,
      error: { message: 'Failed to get payment sources' }
    };
    res.status(500).json(response);
  }
});

// Create payment source
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, type, identifier } = req.body;
    
    const newSource = await PaymentSourcesDB.create(req.user!.id, {
      name,
      type,
      identifier
    });
    
    console.log('Created payment source:', newSource);
    
    const response: ApiResponse<PaymentSource[]> = {
      data: [newSource],
      error: null
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error creating payment source:', error);
    const response: ApiResponse<null> = {
      data: null,
      error: { message: 'Failed to create payment source' }
    };
    res.status(500).json(response);
  }
});

// Update payment source
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type, identifier } = req.body;
    
    const updatedSource = await PaymentSourcesDB.update(id, req.user!.id, {
      name,
      type,
      identifier
    });
    
    if (updatedSource) {
      console.log('Updated payment source:', updatedSource);
      
      const response: ApiResponse<PaymentSource[]> = {
        data: [updatedSource],
        error: null
      };
      
      res.json(response);
    } else {
      const response: ApiResponse<null> = {
        data: null,
        error: { message: 'Payment source not found' }
      };
      
      res.status(404).json(response);
    }
  } catch (error) {
    console.error('Error updating payment source:', error);
    const response: ApiResponse<null> = {
      data: null,
      error: { message: 'Failed to update payment source' }
    };
    res.status(500).json(response);
  }
});

// Delete payment source
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if payment source is used by any recurring payments
    const isUsed = await PaymentSourcesDB.isUsedByPayments(id);
    if (isUsed) {
      const response: ApiResponse<null> = {
        data: null,
        error: { message: 'Cannot delete payment source that is in use by recurring payments' }
      };
      res.status(400).json(response);
      return;
    }
    
    const deleted = await PaymentSourcesDB.delete(id, req.user!.id);
    
    if (deleted) {
      console.log('Deleted payment source:', id);
      
      const response: ApiResponse<null> = {
        data: null,
        error: null
      };
      
      res.json(response);
    } else {
      const response: ApiResponse<null> = {
        data: null,
        error: { message: 'Payment source not found' }
      };
      
      res.status(404).json(response);
    }
  } catch (error) {
    console.error('Error deleting payment source:', error);
    const response: ApiResponse<null> = {
      data: null,
      error: { message: 'Failed to delete payment source' }
    };
    res.status(500).json(response);
  }
});

export default router;
