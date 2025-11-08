'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { GlassCard } from '../landing/GlassCard';
import { useAuth } from '@/hooks/useAuth';
import { getDiscordAuthUrl } from '@/api/auth/auth';

export const Header: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('hero');
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    const handleScrollSpy = () => {
      const sections = ['hero', 'features', 'social-proof', 'cta'];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          if (scrollPosition >= element.offsetTop) {
            setActive(section);
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('scroll', handleScrollSpy);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScrollSpy);
    };
  }, []);

  const scrollToId = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleLogin = async () => {
    try {
      const { url, state } = await getDiscordAuthUrl();
      sessionStorage.setItem('discord_oauth_state', state);
      window.location.href = url;
    } catch (err) {
      console.error('Failed to initiate Discord login:', err);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-[rgba(5,7,22,0.98)] backdrop-blur-lg' : 'bg-transparent'
    }`}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 text-white hover:text-purple-400 transition-colors"
            onClick={() => scrollToId('hero')}
          >
            <span className="font-bold text-xl">Resonance Logs</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <button
              type="button"
              className={`text-sm font-medium transition-colors ${
                active === 'features'
                  ? 'text-purple-400'
                  : 'text-gray-300 hover:text-white'
              }`}
              onClick={() => scrollToId('features')}
            >
              Features
            </button>
            <button
              type="button"
              className={`text-sm font-medium transition-colors ${
                active === 'social-proof'
                  ? 'text-purple-400'
                  : 'text-gray-300 hover:text-white'
              }`}
              onClick={() => scrollToId('social-proof')}
            >
              Community
            </button>
            <button
              type="button"
              className={`text-sm font-medium transition-colors ${
                active === 'cta'
                  ? 'text-purple-400'
                  : 'text-gray-300 hover:text-white'
              }`}
              onClick={() => scrollToId('cta')}
            >
              Get Started
            </button>
          </div>

          {/* Discord Auth Button */}
          <div className="flex items-center gap-4">
            {isLoading ? (
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            ) : isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                {user.discord_avatar_url ? (
                  <Image
                    src={user.discord_avatar_url}
                    alt="Avatar"
                    width={32}
                    height={32}
                    className="rounded-full ring-2 ring-black-500/50"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-semibold ring-2 ring-purple-500/50">
                    {(user.discord_global_name || user.discord_username || '?')[0].toUpperCase()}
                  </div>
                )}
                <GlassCard className="px-3 py-1.5">
                  <button
                    onClick={handleLogout}
                    className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
                  >
                    Logout
                  </button>
                </GlassCard>
              </div>
            ) : (
              <GlassCard className="px-4 py-2">
                <button
                  type="button"
                  className="flex items-center gap-2 text-sm font-medium text-white hover:text-purple-300 transition-colors"
                  onClick={handleLogin}
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
                  <span>Sign in with Discord</span>
                </button>
              </GlassCard>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};