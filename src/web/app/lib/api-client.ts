// API configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// User type matching backend
export interface User {
  id: string;
  email: string;
  user_metadata: Record<string, any>;
  app_metadata: Record<string, any>;
  aud: string;
  created_at: string;
}

// Generic API response type
interface ApiResponse<T> {
  data: T | null;
  error: { message: string } | null;
}

// Storage keys
const USER_KEY = 'auth_user';
const SESSION_KEY = 'auth_session';

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
  getSession: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(SESSION_KEY);
  },
  setSession: (token: string | null) => {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem(SESSION_KEY, token);
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  },
  clear: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SESSION_KEY);
  }
};

// API client
export const api = {
  // Auth endpoints
  async signUp(email: string, password: string): Promise<{ user: User; session: any }> {
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const result: ApiResponse<{ user: User; session: any }> = await response.json();
    
    if (result.error) {
      throw new Error(result.error.message);
    }
    
    if (result.data) {
      storage.setUser(result.data.user);
      storage.setSession(result.data.session.access_token);
      return result.data;
    }
    
    throw new Error('Unexpected response from server');
  },

  async signIn(email: string, password: string): Promise<{ user: User; session: any }> {
    const response = await fetch(`${API_URL}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const result: ApiResponse<{ user: User; session: any }> = await response.json();
    
    if (result.error) {
      throw new Error(result.error.message);
    }
    
    if (result.data) {
      storage.setUser(result.data.user);
      storage.setSession(result.data.session.access_token);
      return result.data;
    }
    
    throw new Error('Unexpected response from server');
  },

  async signOut(): Promise<void> {
    await fetch(`${API_URL}/api/auth/signout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    storage.clear();
  },

  async getUser(): Promise<User | null> {
    // First check local storage
    const cachedUser = storage.getUser();
    if (cachedUser) {
      return cachedUser;
    }
    
    // If no cached user, check with server
    const response = await fetch(`${API_URL}/api/auth/user`);
    const result: ApiResponse<{ user: User }> = await response.json();
    
    if (result.data?.user) {
      storage.setUser(result.data.user);
      return result.data.user;
    }
    
    return null;
  },

  // Get current stored user without API call
  getCurrentUser(): User | null {
    return storage.getUser();
  }
};

export { storage };
