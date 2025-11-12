'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { GlassCard } from '../landing/GlassCard';
import { ProfileDropdown } from './ProfileDropdown';
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
      const { url } = await getDiscordAuthUrl();
      window.location.href = url;
    } catch (err) {
      console.error('Failed to initiate Discord login:', err);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <header className={`sticky top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-[rgba(5,7,22,0.98)] backdrop-blur-lg' : 'bg-transparent'
    }`}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          {/* Logo */}
          <div className="shrink-0">
            <Link
              href="/"
              className="flex items-center gap-2 text-white hover:text-purple-400 transition-colors"
              onClick={() => scrollToId('hero')}
            >
              <Image
                src="/logo.png"
                alt="Resonance Logs"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="font-bold text-xl">Resonance Logs</span>
            </Link>
          </div>

          {/* Navigation Links - Centered */}
          <div className="hidden md:flex items-center space-x-8 absolute left-1/2 -translate-x-1/2">
            <Link href="/profile/dashboard" className="text-sm font-medium text-gray-300 hover:text-white">Dashboard</Link>
            <Link href="/logs" className="text-sm font-medium text-gray-300 hover:text-white">Logs</Link>
            <Link href="/leaderboard/encounter" className="text-sm font-medium text-gray-300 hover:text-white">Top Encounters</Link>
            <Link href="/leaderboard/player" className="text-sm font-medium text-gray-300 hover:text-white">Top Players</Link>
          </div>

          {/* Discord Auth Button */}
          <div className="flex items-center gap-4 ml-auto">
            {isLoading ? (
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            ) : isAuthenticated && user ? (
              <ProfileDropdown user={user} onLogout={handleLogout} />
            ) : (
              <GlassCard className="px-4 py-2">
                <button
                  type="button"
                  className="flex items-center gap-2 text-sm font-medium text-white hover:text-purple-300 transition-colors"
                  onClick={handleLogin}
                  data-interactive="true"
                >
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
