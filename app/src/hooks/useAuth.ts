"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/api/axios";

export function useAuth() {
  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await api.get("/auth/me");
      return res.data as {
        id: number;
        discord_user_id: string;
        discord_username: string;
        discord_global_name: string | null;
        avatar_url: string | null;
        role: string;
        created_at: string;
        last_login_at: string;
      };
    },
    // Don't refetch on window focus to keep it simple
    refetchOnWindowFocus: false,
    // Retry will naturally fail (401) when not logged in
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    refetch,
  };
}
