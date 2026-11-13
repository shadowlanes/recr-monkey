// API configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Import types
import { PaymentSource, RecurringPayment } from '../types';
import { Rates } from './money';

export interface UserPreferences {
  user_id: string;
  display_currency: string;
  updated_at?: string;
}

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

// Local-dev hack: when set, email sign-in/up go through the backend's dev-login
// (accepts any credentials). Backend must have DEV_AUTH_BYPASS=true.
const DEV_AUTH = process.env.NEXT_PUBLIC_DEV_AUTH === 'true';

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
    const response = await fetch(`${API_URL}/api/auth/${DEV_AUTH ? 'dev-login' : 'sign-up/email'}`, {
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
    const response = await fetch(`${API_URL}/api/auth/${DEV_AUTH ? 'dev-login' : 'sign-in/email'}`, {
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

  // Social sign-in (better-auth): returns a provider URL to redirect to
  async signInWithGoogle(callbackURL: string): Promise<string> {
    const response = await fetch(`${API_URL}/api/auth/sign-in/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ provider: 'google', callbackURL })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Google sign-in is not available');
    }

    const result: { url?: string; redirect?: boolean } = await response.json();
    if (!result.url) {
      throw new Error('Google sign-in is not available');
    }
    return result.url;
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
    // The server session is the source of truth. The cached user is only a
    // fallback when the server is unreachable; a stale cache must never make
    // the app look signed-in while the session cookie is gone or invalid.
    try {
      const response = await fetch(`${API_URL}/api/auth/get-session`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        if (result?.user) {
          storage.setUser(result.user);
          return result.user;
        }
      }
      storage.clear();
      return null;
    } catch (error) {
      console.error('Error fetching user session:', error);
      return storage.getUser();
    }
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

  async createRecurringPayment(payment: {
    name: string;
    amount: number;
    currency: string;
    frequency: string;
    payment_source_id: string | null;
    start_date: string;
    category: string | null;
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
    payment_source_id: string | null;
    start_date: string;
    category: string | null;
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
  },

  // Exchange rates (USD-based, cached server-side)
  async getRates(): Promise<Rates> {
    const response = await fetch(`${API_URL}/api/rates`);
    const result: ApiResponse<Rates> = await response.json();

    if (result.error || !result.data) {
      throw new Error(result.error?.message || 'Failed to load exchange rates');
    }

    return result.data;
  },

  // User preferences
  async getPreferences(): Promise<UserPreferences> {
    const response = await fetch(`${API_URL}/api/preferences`, {
      credentials: 'include'
    });
    const result: ApiResponse<UserPreferences> = await response.json();

    if (result.error || !result.data) {
      throw new Error(result.error?.message || 'Failed to load preferences');
    }

    return result.data;
  },

  async updatePreferences(prefs: { display_currency: string }): Promise<UserPreferences> {
    const response = await fetch(`${API_URL}/api/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(prefs)
    });
    const result: ApiResponse<UserPreferences> = await response.json();

    if (result.error || !result.data) {
      throw new Error(result.error?.message || 'Failed to update preferences');
    }

    return result.data;
  }
};

export { storage };
