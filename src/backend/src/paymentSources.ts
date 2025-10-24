import { Router, Request, Response } from 'express';
import { PaymentSource, ApiResponse } from './types';

const router = Router();

// In-memory storage
let paymentSources: PaymentSource[] = [];

// Mock user ID
const MOCK_USER_ID = 'user-123';

// Get all payment sources
router.get('/', (req: Request, res: Response) => {
  console.log('Get payment sources');
  
  const response: ApiResponse<PaymentSource[]> = {
    data: paymentSources,
    error: null
  };
  
  res.json(response);
});

// Create payment source
router.post('/', (req: Request, res: Response) => {
  const { name, type, identifier } = req.body;
  
  const newSource: PaymentSource = {
    id: `ps-${Date.now()}`,
    user_id: MOCK_USER_ID,
    name,
    type,
    identifier,
    created_at: new Date().toISOString()
  };
  
  paymentSources.push(newSource);
  console.log('Created payment source:', newSource);
  
  const response: ApiResponse<PaymentSource[]> = {
    data: [newSource],
    error: null
  };
  
  res.json(response);
});

// Update payment source
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, type, identifier } = req.body;
  
  const index = paymentSources.findIndex(s => s.id === id);
  
  if (index !== -1) {
    paymentSources[index] = {
      ...paymentSources[index],
      name,
      type,
      identifier
    };
    
    console.log('Updated payment source:', paymentSources[index]);
    
    const response: ApiResponse<PaymentSource[]> = {
      data: [paymentSources[index]],
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
});

// Delete payment source
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Note: Dependency check is done in the main index file
  // where we have access to recurring payments
  paymentSources = paymentSources.filter(s => s.id !== id);
  console.log('Deleted payment source:', id);
  
  const response: ApiResponse<null> = {
    data: null,
    error: null
  };
  
  res.json(response);
});

// Export for dependency checking
export const checkPaymentSourceUsage = (sourceId: string, recurringPayments: any[]): boolean => {
  return recurringPayments.some(p => p.payment_source_id === sourceId);
};

export { paymentSources };
export default router;
