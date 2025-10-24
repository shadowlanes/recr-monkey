import { Router, Request, Response } from 'express';
import { PaymentSource, ApiResponse } from './types';
import { PaymentSourcesDB } from './db-operations';

const router = Router();

// Mock user ID (using the existing user from database)
const MOCK_USER_ID = '02f43aab-5e7b-4231-ac3f-c19189508235';

// Get all payment sources
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('Get payment sources');
    const paymentSources = await PaymentSourcesDB.getAll(MOCK_USER_ID);
    
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
    
    const newSource = await PaymentSourcesDB.create(MOCK_USER_ID, {
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
    
    const updatedSource = await PaymentSourcesDB.update(id, MOCK_USER_ID, {
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
    
    const deleted = await PaymentSourcesDB.delete(id, MOCK_USER_ID);
    
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
