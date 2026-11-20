'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../components/auth/auth-provider';
import AuthForm from '../components/auth/auth-form';
import Button from '../components/ui/button';
import LoadingAnimation from '../components/loading-animation';
import { api, API_URL, OAuthClientInfo } from '../lib/api-client';

// OAuth consent screen. An assistant's authorize request is redirected here
// by the backend; nothing is granted until the user clicks Allow.

const PERMISSIONS = [
  'Read your subscriptions and payment sources',
  'Add, change and delete subscriptions',
];

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-line rounded-2xl p-7 shadow-sm">{children}</div>
  );
}

function Consent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const clientId = params.get('client_id') || '';
  const redirectUri = params.get('redirect_uri') || '';

  const [client, setClient] = useState<OAuthClientInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!clientId) {
      setError('This link is missing the application it is for.');
      return;
    }
    let cancelled = false;
    api
      .getOAuthClient(clientId, redirectUri)
      .then((info) => {
        if (cancelled) return;
        if (info.redirect_uri_valid) {
          setClient(info);
        } else {
          setError('This request does not match the application that sent it.');
        }
      })
      .catch(() => {
        if (!cancelled) setError('This application is not recognised.');
      });
    return () => {
      cancelled = true;
    };
  }, [user, clientId, redirectUri]);

  const allow = async () => {
    setWorking(true);
    try {
      const consent = await api.grantOAuthConsent(clientId, redirectUri);
      const query = new URLSearchParams(params.toString());
      query.set('recr_consent', consent);
      window.location.href = `${API_URL}/api/auth/mcp/authorize?${query.toString()}`;
    } catch {
      setError('Could not complete the connection. Try again from the assistant.');
      setWorking(false);
    }
  };

  // Tell the assistant the user declined. Only reachable once the redirect
  // URI has been checked against the application's registration.
  const cancel = () => {
    const target = new URL(redirectUri);
    target.searchParams.set('error', 'access_denied');
    const state = params.get('state');
    if (state) target.searchParams.set('state', state);
    window.location.href = target.toString();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingAnimation size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <p className="text-muted text-sm mb-4 text-center">
          Sign in to connect an assistant to your account.
        </p>
        <AuthForm stayOnPage />
      </>
    );
  }

  if (error) {
    return (
      <Card>
        <h1 className="font-display font-extrabold text-xl tracking-tight mb-2">
          Can&apos;t connect this assistant
        </h1>
        <p className="text-sm text-muted mb-5">{error}</p>
        <Button variant="ghost" onClick={() => router.push('/dashboard')}>
          Go to dashboard
        </Button>
      </Card>
    );
  }

  if (!client) {
    return (
      <div className="flex justify-center py-16">
        <LoadingAnimation size="large" />
      </div>
    );
  }

  return (
    <Card>
      <h1 className="font-display font-extrabold text-xl tracking-tight mb-1 text-balance">
        <span className="text-accent">{client.name}</span> wants to access your account
      </h1>
      <p className="text-sm text-muted mb-5">
        Signed in as <span className="font-semibold text-ink">{user.email}</span>
      </p>

      <p className="text-xs font-bold uppercase tracking-wide text-muted mb-2">It will be able to</p>
      <ul className="bg-bg border border-line rounded-xl mb-5">
        {PERMISSIONS.map((permission, index) => (
          <li
            key={permission}
            className={`px-3.5 py-2.5 text-sm font-medium ${index > 0 ? 'border-t border-line' : ''}`}
          >
            {permission}
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted mb-5">
        After you allow, you return to{' '}
        <span className="font-mono text-ink">{client.redirect_host}</span>. You can disconnect it
        any time in Settings.
      </p>

      <div className="flex items-center gap-2.5">
        <span className="flex-1" />
        <Button variant="ghost" onClick={cancel} disabled={working}>
          Cancel
        </Button>
        <Button onClick={allow} disabled={working}>
          Allow
        </Button>
      </div>
    </Card>
  );
}

export default function AuthorizePage() {
  return (
    <div className="max-w-md mx-auto px-4 pb-14">
      <header className="py-5 mb-8">
        <span className="font-display font-extrabold text-[19px] tracking-tight">
          recr<span className="text-accent">·</span>monkey
        </span>
      </header>
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <LoadingAnimation size="large" />
          </div>
        }
      >
        <Consent />
      </Suspense>
    </div>
  );
}
