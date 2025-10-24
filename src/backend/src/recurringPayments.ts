import { Router, Request, Response } from 'express';
import { RecurringPayment, ApiResponse } from './types';

const router = Router();

// In-memory storage
let recurringPayments: RecurringPayment[] = [];

// Mock user ID
const MOCK_USER_ID = 'user-123';

// Get all recurring payments
router.get('/', (req: Request, res: Response) => {
  console.log('Get recurring payments');
  
  const response: ApiResponse<RecurringPayment[]> = {
    data: recurringPayments,
    error: null
  };
  
  res.json(response);
});

// Check if user has recurring payments
router.get('/check', (req: Request, res: Response) => {
  console.log('Check recurring payments');
  
  const response: ApiResponse<RecurringPayment[]> = {
    data: recurringPayments.slice(0, 1),
    error: null
  };
  
  res.json(response);
});

// Create recurring payment
router.post('/', (req: Request, res: Response) => {
  const { name, amount, currency, frequency, payment_source_id, start_date, category } = req.body;
  
  const newPayment: RecurringPayment = {
    id: `rp-${Date.now()}`,
    user_id: MOCK_USER_ID,
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
  
  const response: ApiResponse<RecurringPayment[]> = {
    data: [newPayment],
    error: null
  };
  
  res.json(response);
});

// Update recurring payment
router.put('/:id', (req: Request, res: Response) => {
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
    
    const response: ApiResponse<RecurringPayment[]> = {
      data: [recurringPayments[index]],
      error: null
    };
    
    res.json(response);
  } else {
    const response: ApiResponse<null> = {
      data: null,
      error: { message: 'Recurring payment not found' }
    };
    
    res.status(404).json(response);
  }
});

// Delete recurring payment
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  recurringPayments = recurringPayments.filter(p => p.id !== id);
  console.log('Deleted recurring payment:', id);
  
  const response: ApiResponse<null> = {
    data: null,
    error: null
  };
  
  res.json(response);
});

export { recurringPayments };
export default router;
