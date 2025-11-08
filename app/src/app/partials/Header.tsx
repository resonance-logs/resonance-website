"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { getDiscordAuthUrl } from "@/api/auth/auth";

export function Header() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const handleLogin = async () => {
    try {
      const { url, state } = await getDiscordAuthUrl();
      sessionStorage.setItem("discord_oauth_state", state);
      window.location.href = url;
    } catch (err) {
      console.error("Failed to initiate Discord login:", err);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
      <Link href="/" className="font-semibold">
        Resonance Logs
      </Link>
      <div className="flex items-center gap-3">
        {isLoading ? (
          <div className="w-8 h-8 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
        ) : isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            {user.discord_avatar_url ? (
              <Image
                src={user.discord_avatar_url}
                alt="Avatar"
                width={32}
                height={32}
                className="rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
                {(user.discord_global_name || user.discord_username || "?")[0].toUpperCase()}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="px-3 py-1 text-sm rounded border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="px-3 py-1 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Login with Discord
          </button>
        )}
      </div>
    </header>
  );
}
