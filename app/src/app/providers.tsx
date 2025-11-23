'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import reactQueryOptions from '../config/reactQueryOptions'
import { BackgroundProvider } from '@/context/BackgroundContext'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: reactQueryOptions,
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <BackgroundProvider>
        {children}
      </BackgroundProvider>
    </QueryClientProvider>
  )
}
