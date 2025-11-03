'use client';

import { useQuery } from '@tanstack/react-query';
import pingApi from '@/api/ping/ping';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WebSocketDemo } from '@/components/WebSocketDemo';

export default function Home() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['ping'],
    queryFn: () => pingApi.ping(),
    enabled: false,
    retry: 1,
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      <main className="text-center px-4">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Welcome to Resonance
        </h1>

        <p className="text-xl text-gray-600 mb-8 max-w-2xl">
          A modern web application built with Next.js, TypeScript, and Tailwind CSS
        </p>

        <div className="space-y-4">
          <Button
            onClick={() => refetch()}
            disabled={isLoading}
            size="lg"
          >
            {isLoading ? 'Pinging...' : 'Test API Connection'}
          </Button>

          {data && (
            <Card className="max-w-md mx-auto border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <p className="text-sm text-green-700">
                  Success: {data.status} at {data.timestamp}
                </p>
              </CardContent>
            </Card>
          )}

          {isError && (
            <Card className="max-w-md mx-auto border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <p className="text-sm text-red-700">
                  Error: {error instanceof Error ? error.message : 'Unknown error'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Fast</CardTitle>
              <CardDescription>Built with Next.js for optimal performance</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Type-Safe</CardTitle>
              <CardDescription>TypeScript for reliable, maintainable code</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scalable</CardTitle>
              <CardDescription>Organized structure for easy expansion</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="mt-16 max-w-2xl mx-auto">
          <WebSocketDemo />
        </div>
      </main>
    </div>
  );
}
