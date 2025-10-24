import { Router, Request, Response } from 'express';
import { User, ApiResponse } from './types';

const router = Router();

// Mock user for all requests
const mockUser: User = {
  id: 'user-123',
  email: 'user@example.com',
  user_metadata: {},
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString()
};

// Sign up (always succeeds)
router.post('/signup', (req: Request, res: Response) => {
  const { email } = req.body;
  console.log('Signup request:', { email });
  
  const response: ApiResponse<{ user: User; session: any }> = {
    data: {
      user: { ...mockUser, email },
      session: { access_token: 'mock-token', user: mockUser }
    },
    error: null
  };
  
  res.json(response);
});

// Sign in (always succeeds)
router.post('/signin', (req: Request, res: Response) => {
  const { email } = req.body;
  console.log('Signin request:', { email });
  
  const response: ApiResponse<{ user: User; session: any }> = {
    data: {
      user: { ...mockUser, email },
      session: { access_token: 'mock-token', user: mockUser }
    },
    error: null
  };
  
  res.json(response);
});

// Sign out (always succeeds)
router.post('/signout', (req: Request, res: Response) => {
  console.log('Signout request');
  
  const response: ApiResponse<null> = {
    data: null,
    error: null
  };
  
  res.json(response);
});

// Get current user (always returns mock user)
router.get('/user', (req: Request, res: Response) => {
  console.log('Get user request');
  
  const response: ApiResponse<{ user: User }> = {
    data: { user: mockUser },
    error: null
  };
  
  res.json(response);
});

// OAuth sign in (redirects)
router.post('/oauth/:provider', (req: Request, res: Response) => {
  const { provider } = req.params;
  const { redirectTo } = req.body;
  
  console.log('OAuth request for provider:', provider);
  
  const response: ApiResponse<{ url: string }> = {
    data: { url: redirectTo || '/dashboard/onboarding' },
    error: null
  };
  
  res.json(response);
});

export default router;
