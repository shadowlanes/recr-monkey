'use client';

import React, { useState } from 'react';
import { useAuth } from './auth-provider';
import Button from '../ui/button';
import { Field, Input } from '../ui/field';
import LoadingAnimation from '../loading-animation';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C40.9 35.4 44 30.2 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </svg>
  );
}

export default function AuthForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');

  const { signInWithEmail, signUpWithEmail, signInWithGoogle, error: authError } = useAuth();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (isSignUp && password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, name || undefined);
      } else {
        await signInWithEmail(email, password);
      }
    } catch {
      // error surfaces via authError
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setFormError('');
    try {
      await signInWithGoogle();
    } catch {
      // error surfaces via authError
    }
  };

  return (
    <div className="bg-surface border border-line rounded-2xl p-7 shadow-sm">
      <h2 className="font-display font-extrabold text-xl tracking-tight mb-1">
        {isSignUp ? 'Create your account' : 'Welcome back'}
      </h2>
      <p className="text-muted text-sm mb-5">
        {isSignUp ? 'Free, takes a minute.' : 'Sign in to your subscriptions.'}
      </p>

      {(authError || formError) && (
        <p className="mb-4 px-3 py-2 rounded-lg bg-danger-soft text-danger text-sm font-medium">
          {formError || authError}
        </p>
      )}

      <button
        type="button"
        onClick={handleGoogle}
        className="w-full flex items-center justify-center gap-2.5 rounded-full border-[1.5px] border-line bg-bg px-4 py-2.5 text-sm font-semibold text-ink cursor-pointer hover:border-accent transition-colors mb-5"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="flex items-center gap-3 mb-5 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />
        or with email
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={handleEmailAuth}>
        {isSignUp && (
          <Field label="Name" htmlFor="auth-name">
            <Input
              id="auth-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional"
              autoComplete="name"
            />
          </Field>
        )}

        <Field label="Email" htmlFor="auth-email">
          <Input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </Field>

        <Field label="Password" htmlFor="auth-password">
          <Input
            id="auth-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            required
          />
        </Field>

        {isSignUp && (
          <Field label="Confirm password" htmlFor="auth-confirm">
            <Input
              id="auth-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              autoComplete="new-password"
              required
            />
          </Field>
        )}

        <Button type="submit" disabled={isLoading} className="w-full mt-1">
          {isLoading ? (
            <LoadingAnimation size="small" />
          ) : isSignUp ? (
            'Create account'
          ) : (
            'Sign in'
          )}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => {
          setIsSignUp(!isSignUp);
          setFormError('');
        }}
        className="block mx-auto mt-4 text-sm font-semibold text-accent hover:text-accent-deep cursor-pointer"
      >
        {isSignUp ? 'Already have an account? Sign in' : 'New here? Create an account'}
      </button>
    </div>
  );
}
