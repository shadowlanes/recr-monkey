// API configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Import types
import { PaymentSource, RecurringPayment } from '../types';

// User type matching better-auth backend
export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// Generic API response type
interface ApiResponse<T> {
  data: T | null;
  error: { message: string } | null;
}

// Better-auth response types
interface AuthResponse {
  token: string;
  user: User;
}

// Storage keys
const USER_KEY = 'auth_user';

// Storage helpers
const storage = {
  getUser: (): User | null => {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  },
  setUser: (user: User | null) => {
    if (typeof window === 'undefined') return;
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  },
  clear: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(USER_KEY);
  }
};

// API client
export const api = {
  // Auth endpoints (better-auth)
  async signUp(email: string, password: string, name?: string): Promise<{ user: User }> {
    const response = await fetch(`${API_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Important: Include cookies for session
      body: JSON.stringify({ email, password, name })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to sign up');
    }
    
    const result: AuthResponse = await response.json();
    storage.setUser(result.user);
    return { user: result.user };
  },

  async signIn(email: string, password: string): Promise<{ user: User }> {
    const response = await fetch(`${API_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Important: Include cookies for session
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to sign in');
    }
    
    const result: AuthResponse = await response.json();
    storage.setUser(result.user);
    return { user: result.user };
  },

  async signOut(): Promise<void> {
    await fetch(`${API_URL}/api/auth/sign-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    
    storage.clear();
  },

  async getUser(): Promise<User | null> {
    // First check local storage
    const cachedUser = storage.getUser();
    if (cachedUser) {
      return cachedUser;
    }
    
    // If no cached user, check session with server
    try {
      const response = await fetch(`${API_URL}/api/auth/get-session`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        return null;
      }
      
      const result = await response.json();
      
      if (result.user) {
        storage.setUser(result.user);
        return result.user;
      }
    } catch (error) {
      console.error('Error fetching user session:', error);
    }
    
    return null;
  },

  // Get current stored user without API call
  getCurrentUser(): User | null {
    return storage.getUser();
  },

  // Payment Sources endpoints
  async getPaymentSources(): Promise<PaymentSource[]> {
    const response = await fetch(`${API_URL}/api/payment-sources`, {
      credentials: 'include' // Include cookies for authentication
    });
    const result: ApiResponse<PaymentSource[]> = await response.json();
    
    if (result.error) {
      throw new Error(result.error.message);
    }
    
    return result.data || [];
  },

  async createPaymentSource(source: { name: string; type: string; identifier: string }): Promise<PaymentSource> {
    const response = await fetch(`${API_URL}/api/payment-sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(source)
    });
    
    const result: ApiResponse<PaymentSource[]> = await response.json();
    
    if (result.error) {
      throw new Error(result.error.message);
    }
    
    return result.data?.[0] as PaymentSource;
  },

  async updatePaymentSource(id: string, source: { name: string; type: string; identifier: string }): Promise<PaymentSource> {
    const response = await fetch(`${API_URL}/api/payment-sources/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(source)
    });
    
    const result: ApiResponse<PaymentSource[]> = await response.json();
    
    if (result.error) {
      throw new Error(result.error.message);
    }
    
    return result.data?.[0] as PaymentSource;
  },

  async deletePaymentSource(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/payment-sources/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    const result: ApiResponse<null> = await response.json();
    
    if (result.error) {
      throw new Error(result.error.message);
    }
  },

  // Recurring Payments endpoints
  async getRecurringPayments(): Promise<RecurringPayment[]> {
    const response = await fetch(`${API_URL}/api/recurring-payments`, {
      credentials: 'include'
    });
    const result: ApiResponse<RecurringPayment[]> = await response.json();
    
    if (result.error) {
      throw new Error(result.error.message);
    }
    
    return result.data || [];
  },

  async checkRecurringPayments(): Promise<boolean> {
    const response = await fetch(`${API_URL}/api/recurring-payments/check`, {
      credentials: 'include'
    });
    const result: ApiResponse<RecurringPayment[]> = await response.json();
    
    if (result.error) {
      throw new Error(result.error.message);
    }
    
    return (result.data || []).length > 0;
  },

  async createRecurringPayment(payment: {
    name: string;
    amount: number;
    currency: string;
    frequency: string;
    payment_source_id: string;
    start_date: string;
    category: string;
  }): Promise<RecurringPayment> {
    const response = await fetch(`${API_URL}/api/recurring-payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payment)
    });
    
    const result: ApiResponse<RecurringPayment[]> = await response.json();
    
    if (result.error) {
      throw new Error(result.error.message);
    }
    
    return result.data?.[0] as RecurringPayment;
  },

  async updateRecurringPayment(id: string, payment: {
    name: string;
    amount: number;
    currency: string;
    frequency: string;
    payment_source_id: string;
    start_date: string;
    category: string;
  }): Promise<RecurringPayment> {
    const response = await fetch(`${API_URL}/api/recurring-payments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payment)
    });
    
    const result: ApiResponse<RecurringPayment[]> = await response.json();
    
    if (result.error) {
      throw new Error(result.error.message);
    }
    
    return result.data?.[0] as RecurringPayment;
  },

  async deleteRecurringPayment(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/recurring-payments/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    const result: ApiResponse<null> = await response.json();
    
    if (result.error) {
      throw new Error(result.error.message);
    }
  }
};

export { storage };
