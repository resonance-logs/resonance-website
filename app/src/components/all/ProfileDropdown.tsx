'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

type ProfileDropdownProps = {
  user: {
    discord_avatar_url?: string | null;
    discord_global_name?: string | null;
    discord_username?: string | null;
  };
  onLogout: () => void;
};

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 group transition-all duration-200"
      >
        {user.discord_avatar_url ? (
          <div className="relative">
            <Image
              src={user.discord_avatar_url}
              alt="Avatar"
              width={32}
              height={32}
              className="rounded-full group-hover:opacity-80 transition-all duration-200"
            />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-semibold group-hover:opacity-80 transition-all duration-200">
            {(user.discord_global_name || user.discord_username || '?')[0].toUpperCase()}
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 left-1/2 -translate-x-1/2 mt-3 w-44 origin-top animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="relative rounded-lg bg-[rgba(10,12,28,0.95)] border border-purple-400/40 shadow-[0_0_32px_rgba(147,51,234,0.2),0_20px_80px_rgba(0,0,0,0.95)] backdrop-blur-2xl overflow-hidden">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(147,51,234,0.15),transparent_50%)] pointer-events-none" />

            {/* User Info */}
            <div className="relative px-3 py-2 border-b border-purple-400/20">
              <p className="text-sm font-semibold text-white truncate">
                {user.discord_global_name || user.discord_username || 'User'}
              </p>
              {user.discord_username && user.discord_global_name && (
                <p className="text-xs text-gray-400 truncate">@{user.discord_username}</p>
              )}
            </div>

            {/* Menu Items */}
            <div className="relative py-1.5">
              <Link
                href="/profile"
                className="group flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-purple-500/20 transition-all duration-150"
                onClick={() => setIsOpen(false)}
              >
                <svg
                  className="w-4 h-4 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span>Profile</span>
              </Link>

              <button
                onClick={() => {
                  onLogout();
                  setIsOpen(false);
                }}
                className="group flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-gray-300 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
              >
                <svg
                  className="w-4 h-4 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
