"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, logout as logoutApi } from "@/api/auth/auth";
import type { User } from "@/api/auth/auth";

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error, refetch } = useQuery<User>({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    // Don't refetch on window focus to keep it simple
    refetchOnWindowFocus: false,
    // Retry will naturally fail (401) when not logged in
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      // Clear user data from cache
      queryClient.setQueryData(["auth", "me"], null);
      // Optionally redirect to login
      window.location.href = "/auth/login";
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    refetch,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
