'use client';

import { useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getDiscordAuthUrl } from '@/api/auth/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
      <div className="flex justify-center py-24">
        <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Sign in to continue</CardTitle>
            <CardDescription>
              The module optimizer is available to authenticated users. Sign in with Discord to manage your
              modules, run optimizations, and review your history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleLogin} disabled={loginLoading}>
              {loginLoading ? 'Redirecting…' : 'Sign in with Discord'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
