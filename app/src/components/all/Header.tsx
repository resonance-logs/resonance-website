'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { GlassCard } from '../landing/GlassCard';
import { ProfileDropdown } from './ProfileDropdown';
import { NavDropdown } from './NavDropdown';
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
    <header className={`sticky top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[rgba(5,7,22,0.98)] backdrop-blur-lg' : 'bg-transparent'
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
            {!isAuthenticated && (
              <Link href="/get-started" className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors">Get Started</Link>
            )}
            {isAuthenticated && (
              <NavDropdown
                label="Profile"
                defaultHref="/profile/dashboard"
                items={[
                  { href: '/profile/dashboard', label: 'Character Overview' },
                  { href: '/profile/my-logs', label: 'My Encounters' },
                  { href: '/profile/modules', label: 'Module Calculator' },
                ]}
              />
            )}
            <NavDropdown
              label="Leaderboard"
              defaultHref="/leaderboard/encounter"
              items={[
                { href: '/leaderboard/encounter', label: 'Top Encounters' },
                { href: '/leaderboard/player', label: 'Top Players' }
              ]}
            />
            <NavDropdown
              label="Statistics"
              defaultHref="/statistics/totals"
              items={[
                { href: '/statistics/totals', label: 'Overall Stats' },
                { href: '/statistics/classes', label: 'Class Stats' }
              ]}
            />
            {/* <Link href="/player" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Search Players</Link> */}
            <Link href="/logs" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">All Logs</Link>
          </div>

          {/* Social Links & Auth */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Discord Link */}
            <a
              href={process.env.NEXT_PUBLIC_DISCORD_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-[#5865F2]"
              aria-label="Join our Discord"
              title="Join our Discord"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </a>

            {/* Ko-fi Link */}
            <a
              href={process.env.NEXT_PUBLIC_KOFI_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-white/10 transition-colors mr-2"
              aria-label="Support us on Ko-fi"
              title="Support us on Ko-fi"
            >
              <Image
                src="/icons/kofi_symbol.png"
                alt="Ko-fi"
                width={25}
                height={25}
              />
            </a>

            {/* Auth Section */}
            {isLoading ? (
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            ) : isAuthenticated && user ? (
              <ProfileDropdown user={user} onLogout={handleLogout} />
            ) : (
              <GlassCard className="px-3 py-2">
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
