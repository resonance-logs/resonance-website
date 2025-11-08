"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { handleDiscordCallback } from "@/api/auth/auth";
import { useQueryClient } from "@tanstack/react-query";

export function OAuthHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) return;

    const processCallback = async () => {
      try {
        // Optional: Validate state for CSRF protection
        const savedState = sessionStorage.getItem("discord_oauth_state");
        if (savedState && state !== savedState) {
          console.error("Invalid state parameter");
          return;
        }

        // Clear state from storage
        sessionStorage.removeItem("discord_oauth_state");

        // Send code to backend
        await handleDiscordCallback(code);

        // Clear query parameters from URL
        window.history.replaceState({}, "", "/");

        // Refresh user data
        queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      } catch (err) {
        console.error("OAuth callback error:", err);
      }
    };

    processCallback();
  }, [searchParams, router, queryClient]);

  return null; // This component doesn't render anything
}
