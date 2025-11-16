'use client';

import { useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getDiscordAuthUrl } from '@/api/auth/auth';
import { GlassCard } from '@/components/landing/GlassCard';

interface ModuleOptimizerAuthGateProps {
  children: ReactNode;
}

export function ModuleOptimizerAuthGate({ children }: ModuleOptimizerAuthGateProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      const { url } = await getDiscordAuthUrl();
      window.location.href = url;
    } catch (error) {
      console.error('Failed to start login flow', error);
      setLoginLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mt-32 flex justify-center">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mt-28 max-w-lg mx-auto px-4">
        <GlassCard className="flex flex-col items-center gap-4 py-6">
          <h1 className="text-2xl font-bold text-white">Module Optimizer</h1>
          <p className="text-sm text-gray-300 text-center">
            The module optimizer is available to authenticated users. Sign in with Discord to manage your
            modules, run optimizations, and review your history.
          </p>
          <button
            onClick={handleLogin}
            disabled={loginLoading}
            className="group flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-60"
            data-interactive="true"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 71 55"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M60.8 4.3C54.6 1.7 48.6 0 36 0S17.4 1.7 11.2 4.3c-1.2.5-2 1.2-2.3 2.2-1.7 6.7-3.1 13.4-2.2 20.4.1.8.4 1.6.9 2.2 5.8 7.9 11.3 9.7 17 11.3 2.2.6 3.8.9 6.1 1.6.1 0 .1.1.2.1.1 0 .1-.1.1-.1 2.2-.7 3.8-1 6.1-1.6 5.8-1.6 11.3-3.4 17-11.3.5-.6.8-1.3.9-2.2.8-7-.5-13.7-2.3-20.4-.3-1-1.1-1.7-2.3-2.2zM25.9 37.3c-3 0-5.4-2.8-5.4-6.4 0-3.6 2.4-6.4 5.4-6.4 3 0 5.4 2.8 5.4 6.4 0 3.6-2.4 6.4-5.4 6.4zm19.2 0c-3 0-5.4-2.8-5.4-6.4 0-3.6 2.4-6.4 5.4-6.4 3 0 5.4 2.8 5.4 6.4 0 3.6-2.4 6.4-5.4 6.4z" />
            </svg>
            {loginLoading ? 'Redirecting…' : 'Sign in with Discord'}
          </button>
        </GlassCard>
      </div>
    );
  }

  return <>{children}</>;
}
