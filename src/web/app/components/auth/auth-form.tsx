'use client';

import React, { useState } from 'react';
import { useAuth } from './auth-provider';

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const { signIn, signUp, error: authError } = useAuth();

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      if (isLogin) {
        // Login
        await signIn(email, password);
      } else {
        // Sign up
        if (password !== confirmPassword) {
          setFormError('Passwords do not match');
          return;
        }
        await signUp(email, password);
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-md shadow-md">
      <div className="tabs flex border-b border-gray-200 mb-4">
        <button 
          className={`tab-btn px-4 py-2 font-medium ${isLogin ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`} 
          onClick={() => setIsLogin(true)}
        >
          Login
        </button>
        <button 
          className={`tab-btn px-4 py-2 font-medium ${!isLogin ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`} 
          onClick={() => setIsLogin(false)}
        >
          Sign Up
        </button>
      </div>
      
      {(formError || authError) && (
        <div className="error-message mb-4">
          {formError || authError}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input 
            type="email" 
            id="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input 
            type="password" 
            id="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {!isLogin && (
          <div className="form-group">
            <label htmlFor="confirm-password">Confirm Password</label>
            <input 
              type="password" 
              id="confirm-password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        )}
        <button type="submit" className="btn btn-primary w-full">
          {isLogin ? 'Login' : 'Sign Up'}
        </button>
      </form>
    </div>
  );
}