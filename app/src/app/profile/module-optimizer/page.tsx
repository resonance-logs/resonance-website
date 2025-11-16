'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GlassCard } from '@/components/landing/GlassCard';
import { useAuth } from '@/hooks/useAuth';
import { getDiscordAuthUrl } from '@/api/auth/auth';
import { Bookmark, Boxes, History, Layers, type LucideIcon } from 'lucide-react';

function OptimizerLink({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-lg border border-purple-500/20 bg-[rgba(5,7,16,0.6)] p-4 transition-colors hover:border-purple-400/60"
    >
      <div className="rounded-full bg-purple-500/20 p-2">
        <Icon className="h-5 w-5 text-purple-200" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-white">{title}</p>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </Link>
  );
}

const optimizerLinks: Array<{ href: string; title: string; description: string; icon: LucideIcon }> = [
  {
    href: '/module-optimizer',
    title: 'Run Optimizer',
    description: 'Pick categories, tweak weights, and compute your best four-module set.',
    icon: Layers,
  },
  {
    href: '/module-optimizer/modules',
    title: 'Manage Modules',
    description: 'Review, import, or clean up the modules in your collection.',
    icon: Boxes,
  },
  {
    href: '/module-optimizer/history',
    title: 'Optimization History',
    description: 'Audit previous runs, compare scores, and reopen detailed reports.',
    icon: History,
  },
  {
    href: '/module-optimizer/builds',
    title: 'Saved Builds',
    description: 'Organize your favorite loadouts and revisit them anytime.',
    icon: Bookmark,
  },
];

export default function ProfileModuleOptimizerPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      const { url } = await getDiscordAuthUrl();
      window.location.href = url;
    } catch (err) {
      console.error('Failed to initiate Discord login:', err);
      setLoginLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mt-32 flex justify-center">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="mt-28 max-w-lg mx-auto px-4">
        <GlassCard className="flex flex-col items-center gap-4 py-6">
          <h1 className="text-2xl font-bold text-white">Module Calculator</h1>
          <p className="text-sm text-gray-300 text-center">
            Sign in with Discord to launch the optimizer experience.
          </p>
          <button
            onClick={handleLogin}
            disabled={loginLoading}
            className="group flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-60"
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
            {loginLoading ? 'Redirecting…' : 'Sign in with Discord'}
          </button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="mt-24 mb-16 max-w-5xl mx-auto px-4 space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-purple-300 font-semibold">Profile</p>
        <h1 className="text-3xl font-bold text-white mt-2">Module Calculator</h1>
        <p className="text-sm text-gray-300 mt-1 max-w-2xl">
          Launch the optimizer, curate your inventory, and revisit previous builds from one place.
        </p>
      </div>

      <GlassCard className="p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Module Optimizer</h2>
          <p className="text-sm text-gray-300">
            Access every part of the optimizer suite including run history, saved builds, and module management.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {optimizerLinks.map((link) => (
            <OptimizerLink key={link.href} {...link} />
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
