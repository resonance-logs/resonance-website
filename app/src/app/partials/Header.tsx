"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const { user, isAuthenticated, isLoading } = useAuth();

  const login = () => {
    window.location.href = "/api/auth/discord/login";
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/";
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
      <Link href="/" className="font-semibold">
        Resonance Logs
      </Link>
      <div className="flex items-center gap-3 text-sm">
        {isLoading ? (
          <span className="text-gray-400">Loading...</span>
        ) : isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {user.avatar_url && (
                <Image
                  src={user.avatar_url}
                  alt="Avatar"
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              )}
              <span className="text-gray-300">
                {user.discord_global_name || user.discord_username}
              </span>
            </div>
            <button
              onClick={logout}
              className="px-3 py-1 rounded border border-gray-600 text-gray-300"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={login}
            className="px-3 py-1 rounded bg-indigo-600 text-white"
          >
            Login with Discord
          </button>
        )}
      </div>
    </header>
  );
}
