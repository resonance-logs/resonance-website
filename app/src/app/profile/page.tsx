'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getDiscordAuthUrl } from '@/api/auth/auth';
import { getApiKeyMeta, generateApiKey, type ApiKeyMeta, type ApiKeyGenerateResponse } from '@/api/apikey/apikey';
import Image from 'next/image';
import { GlassCard } from '@/components/landing/GlassCard';

// Simple local tab button component (could be replaced later with a shared one if introduced)
function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 border
        ${active ? 'bg-purple-600 text-white border-purple-500' : 'bg-[rgba(5,7,16,0.6)] text-gray-300 hover:text-white border-purple-500/30 hover:border-purple-400/50'}`}
    >
      {label}
    </button>
  );
}

export default function ProfilePage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'api'>('overview');
  const [loginLoading, setLoginLoading] = useState(false);
  const [apiMeta, setApiMeta] = useState<ApiKeyMeta | null>(null);
  const [plaintextKey, setPlaintextKey] = useState<string | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showPlaintext, setShowPlaintext] = useState(true);
  const [copyLabel, setCopyLabel] = useState<'Copy' | 'Copied!'>('Copy');

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
          <h1 className="text-2xl font-bold text-white">Profile</h1>
          <p className="text-sm text-gray-300 text-center">
            Sign in with Discord to view and manage your profile.
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

  // Fetch metadata on entering API tab
  const handleSelectApiTab = async () => {
    setActiveTab('api');
    if (!apiMeta && !loadingMeta) {
      setLoadingMeta(true);
      try {
        const meta = await getApiKeyMeta();
        setApiMeta(meta);
      } catch (e) {
        console.error('Failed to load API key meta', e);
      } finally {
        setLoadingMeta(false);
      }
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const resp: ApiKeyGenerateResponse = await generateApiKey();
      setPlaintextKey(resp.plaintext_key);
      setApiMeta(resp.meta);
      setShowPlaintext(true);
      setCopyLabel('Copy');
    } catch (e) {
      console.error('Failed to generate API key', e);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!plaintextKey) return;
    navigator.clipboard.writeText(plaintextKey).then(() => {
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy'), 1800);
    });
  };

  return (
    <div className="mt-24 mb-16 max-w-5xl mx-auto px-4 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-6">
        <div className="flex items-center gap-4">
          {user.discord_avatar_url ? (
            <Image
              src={user.discord_avatar_url}
              alt="Avatar"
              width={72}
              height={72}
              className="rounded-full shadow-lg border border-purple-500/30"
            />
          ) : (
            <div className="w-[72px] h-[72px] rounded-full bg-linear-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl font-semibold">
              {(user.discord_global_name || user.discord_username || '?')[0].toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">{user.discord_global_name || user.discord_username}</h1>
            {user.discord_username && (
              <p className="text-sm text-gray-400">@{user.discord_username}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">User ID: {user.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => logout()}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600/80 hover:bg-red-600 text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <TabButton label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
        <TabButton label="API" active={activeTab === 'api'} onClick={handleSelectApiTab} />
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-white mb-3">Account Overview</h2>
            <ul className="text-sm text-gray-300 space-y-1">
              <li><span className="text-gray-400">Discord Global Name:</span> {user.discord_global_name || '—'}</li>
              <li><span className="text-gray-400">Discord Username:</span> {user.discord_username}</li>
              <li><span className="text-gray-400">Role:</span> {user.role}</li>
              <li><span className="text-gray-400">Created:</span> {new Date(user.created_at).toLocaleString()}</li>
              <li><span className="text-gray-400">Last Login:</span> {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : '—'}</li>
            </ul>
          </GlassCard>
        </div>
      )}

      {activeTab === 'api' && (
        <div className="space-y-4">
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">API Key</h2>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="px-4 py-2 text-sm font-medium rounded-md bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white"
              >
                {generating ? 'Generating…' : apiMeta?.has_key ? 'Regenerate Key' : 'Generate Key'}
              </button>
            </div>

            {/* Status */}
            {loadingMeta && (
              <p className="text-sm text-gray-400">Loading key metadata…</p>
            )}
            {!loadingMeta && apiMeta && !apiMeta.has_key && !plaintextKey && (
              <p className="text-sm text-gray-300">You have not generated an API key yet.</p>
            )}

            {/* Plaintext display (once) */}
            {plaintextKey && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400">Copy and store this key securely. It will not be shown again after you navigate away or regenerate.</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 rounded bg-black/40 border border-purple-500/40 text-sm font-mono text-purple-100 break-all select-all">
                    {showPlaintext ? plaintextKey : '••••••••••••••••••••••••••••••••'}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPlaintext(s => !s)}
                    className="px-3 py-2 rounded bg-purple-500/30 hover:bg-purple-500/50 text-xs text-white"
                  >
                    {showPlaintext ? 'Hide' : 'Show'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-2 rounded bg-purple-600 hover:bg-purple-500 text-xs text-white"
                  >
                    {copyLabel}
                  </button>
                </div>
              </div>
            )}

            {/* Metadata display */}
            {apiMeta && apiMeta.has_key && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-white">Metadata</h3>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li><span className="text-gray-400">Created:</span> {apiMeta.created_at ? new Date(apiMeta.created_at).toLocaleString() : '—'}</li>
                  <li><span className="text-gray-400">Last Used:</span> {apiMeta.last_used_at ? new Date(apiMeta.last_used_at).toLocaleString() : '—'}</li>
                  <li><span className="text-gray-400">Revoked:</span> {apiMeta.revoked_at ? new Date(apiMeta.revoked_at).toLocaleString() : '—'}</li>
                </ul>
                {!plaintextKey && (
                  <p className="text-xs text-gray-500">Plaintext key is hidden for security. Regenerate to get a new key.</p>
                )}
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}
