'use client';

import React, { useState } from 'react';
import { useAuth } from './auth-provider';
import LoadingAnimation from '../loading-animation';
import { EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline';

export default function AuthForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  
  const { signInWithEmail, signUpWithEmail, error: authError } = useAuth();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    
    if (isSignUp && password !== confirmPassword) {
      setEmailError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setEmailError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        setEmailError('Check your email for a confirmation link!');
      } else {
        await signInWithEmail(email, password);
      }
    } catch (error) {
      console.error('Email auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setEmailError('');
    setIsSignUp(false);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-md shadow-md">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p className="text-gray-600">{isSignUp ? 'Sign up' : 'Log in'} with your email</p>
      </div>
        
        {/* Error Messages */}
        {(authError || emailError) && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            {emailError || authError}
          </div>
        )}
        
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <EnvelopeIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your email"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LockClosedIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your password"
              />
            </div>
          </div>
          
          {isSignUp && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Confirm your password"
                />
              </div>
            </div>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <LoadingAnimation size="small" />
            ) : (
              isSignUp ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setEmailError('');
            }}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
    </div>
  );
}