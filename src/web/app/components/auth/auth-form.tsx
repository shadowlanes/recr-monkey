'use client';

import React, { useState } from 'react';
import { useAuth } from './auth-provider';
import { Provider } from '@supabase/supabase-js';

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showMagicLink, setShowMagicLink] = useState(false);
  const { signIn, signUp, error: authError, sendMagicLink, signInWithSocialProvider } = useAuth();

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setFormError(null);
    setShowMagicLink(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsLoading(true);

    try {
      if (showMagicLink) {
        await sendMagicLink(email);
        // Show success message for magic link
        setFormError("Magic link sent! Check your email to complete login.");
      } else if (isLogin) {
        // Login with email/password
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: Provider) => {
    setIsLoading(true);
    try {
      await signInWithSocialProvider(provider);
    } catch (error) {
      console.error(`Error signing in with ${provider}:`, error);
      setFormError(`Failed to sign in with ${provider}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMagicLink = () => {
    setShowMagicLink(!showMagicLink);
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
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          {formError || authError}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-group">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input 
            type="email" 
            id="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        {!showMagicLink && (
          <div className="form-group">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              id="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        )}
        
        {!isLogin && !showMagicLink && (
          <div className="form-group">
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input 
              type="password" 
              id="confirm-password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        )}
        
        {isLogin && (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input 
                id="remember-me" 
                type="checkbox" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                Remember me
              </label>
            </div>
            <div>
              <button
                type="button"
                onClick={toggleMagicLink}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                {showMagicLink ? "Use password" : "Use magic link"}
              </button>
            </div>
          </div>
        )}
        
        <button 
          type="submit" 
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : showMagicLink ? 'Send Magic Link' : isLogin ? 'Login' : 'Sign Up'}
        </button>
      </form>
      
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleSocialLogin('google')}
            className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            disabled={isLoading}
          >
            Google
          </button>
          <button
            type="button"
            onClick={() => handleSocialLogin('github')}
            className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            disabled={isLoading}
          >
            GitHub
          </button>
        </div>
      </div>
    </div>
  );
}