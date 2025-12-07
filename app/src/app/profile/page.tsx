'use client';

import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getDiscordAuthUrl } from '@/api/auth/auth';
import { getApiKeyMeta, generateApiKey, type ApiKeyMeta, type ApiKeyGenerateResponse } from '@/api/apikey/apikey';
import { getSettings, updateSettings } from '@/api/settings/settings';
import { getCustomization, updateCustomization } from '@/api/customization/customization';
import Image from 'next/image';
import { GlassCard } from '@/components/landing/GlassCard';
import EncounterTableEntry, { ENCOUNTER_THEME_KEYS, ENCOUNTER_THEME_METADATA } from '@/components/ui/EncounterTableEntry';
import type { User, Encounter, EncounterTableEntryThemeKey, UserCustomization } from '@/types/commonTypes';

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
  const queryClient = useQueryClient();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'customization' | 'api'>('overview');
  const [loginLoading, setLoginLoading] = useState(false);
  const [apiMeta, setApiMeta] = useState<ApiKeyMeta | null>(null);
  const [plaintextKey, setPlaintextKey] = useState<string | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showPlaintext, setShowPlaintext] = useState(true);
  const [copyLabel, setCopyLabel] = useState<'Copy' | 'Copied!'>('Copy');

  // Customization state
  const [customization, setCustomization] = useState<UserCustomization | null>(user?.customization ?? null);
  const [selectedTheme, setSelectedTheme] = useState<EncounterTableEntryThemeKey>((user?.customization?.encounterTableEntryTheme as EncounterTableEntryThemeKey) || 'default');
  const [loadingCustomization, setLoadingCustomization] = useState(false);
  const [savingCustomization, setSavingCustomization] = useState(false);
  const [customizationError, setCustomizationError] = useState<string | null>(null);

  // Settings state
  const [anonymizeUploader, setAnonymizeUploader] = useState(false);
  const [anonymizePlayers, setAnonymizePlayers] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

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

  useEffect(() => {
    const theme = (user?.customization?.encounterTableEntryTheme as EncounterTableEntryThemeKey | undefined) || 'default';
    setCustomization(user?.customization ?? null);
    setSelectedTheme(theme);
  }, [user?.customization]);

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

  // Fetch settings on entering Settings tab
  const handleSelectSettingsTab = async () => {
    setActiveTab('settings');
    if (!loadingSettings) {
      setLoadingSettings(true);
      try {
        const settings = await getSettings();
        setAnonymizeUploader(settings.anonymize_uploader);
        setAnonymizePlayers(settings.anonymize_players);
      } catch (e) {
        console.error('Failed to load settings', e);
      } finally {
        setLoadingSettings(false);
      }
    }
  };

  const spendTotal = user?.amount_spent_usd ?? 0;
  const customizationUnlocked = spendTotal >= 3;
  const selectableThemes = ENCOUNTER_THEME_KEYS.filter((key) => key !== 'default');

  const handleSelectCustomizationTab = async () => {
    setActiveTab('customization');
    if (customization || loadingCustomization) return;

    setLoadingCustomization(true);
    setCustomizationError(null);
    try {
      const { customization: loaded } = await getCustomization();
      setCustomization(loaded);
      const theme = (loaded?.encounterTableEntryTheme as EncounterTableEntryThemeKey | undefined) || 'default';
      setSelectedTheme(theme);
      queryClient.setQueryData(['auth', 'me'], (prev: User | null) => (prev ? { ...prev, customization: loaded } : prev));
    } catch (e) {
      console.error('Failed to load customization', e);
      setCustomizationError('Failed to load customization');
    } finally {
      setLoadingCustomization(false);
    }
  };

  const handleSaveCustomization = async () => {
    if (!customizationUnlocked) return;
    setSavingCustomization(true);
    setCustomizationError(null);
    try {
      const { customization: updated } = await updateCustomization({
        encounterTableEntryTheme: selectedTheme === 'default' ? '' : selectedTheme,
      });
      setCustomization(updated);
      queryClient.setQueryData(['auth', 'me'], (prev: User | null) => (prev ? { ...prev, customization: updated } : prev));
    } catch (e) {
      console.error('Failed to save customization', e);
      setCustomizationError('Failed to save customization');
    } finally {
      setSavingCustomization(false);
    }
  };

  const handleToggleAnonymizeUploader = async (newValue: boolean) => {
    setSavingSettings(true);
    try {
      const updated = await updateSettings({ anonymize_uploader: newValue });
      setAnonymizeUploader(updated.anonymize_uploader);
    } catch (e) {
      console.error('Failed to update settings', e);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleAnonymizePlayers = async (newValue: boolean) => {
    setSavingSettings(true);
    try {
      const updated = await updateSettings({ anonymize_players: newValue });
      setAnonymizePlayers(updated.anonymize_players);
    } catch (e) {
      console.error('Failed to update settings', e);
    } finally {
      setSavingSettings(false);
    }
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
        <TabButton label="Settings" active={activeTab === 'settings'} onClick={handleSelectSettingsTab} />
        <TabButton label="Customization" active={activeTab === 'customization'} onClick={handleSelectCustomizationTab} />
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

      {activeTab === 'settings' && (
        <div className="space-y-4">
          <GlassCard className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">Privacy Settings</h2>
              <p className="text-sm text-gray-400">Control how your information appears to others on encounters you upload.</p>
            </div>

            {loadingSettings ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-400">Loading settings…</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Anonymize Uploader Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
                  <div className="flex-1 pr-4">
                    <h3 className="text-sm font-medium text-white">Anonymize Uploader</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Hide your Discord profile (name and avatar) on encounters you&apos;ve uploaded. Your identity will appear as &quot;Anonymous&quot; to other users.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={anonymizeUploader}
                    disabled={savingSettings}
                    onClick={() => handleToggleAnonymizeUploader(!anonymizeUploader)}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-60 disabled:cursor-not-allowed ${
                      anonymizeUploader ? 'bg-purple-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        anonymizeUploader ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Anonymize Players Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
                  <div className="flex-1 pr-4">
                    <h3 className="text-sm font-medium text-white">Anonymize Players</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Hide player names on encounters you&apos;ve uploaded. Player names will appear as &quot;{'{ClassName}'} #1&quot;, &quot;{'{ClassName}'} #2&quot;, etc.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={anonymizePlayers}
                    disabled={savingSettings}
                    onClick={() => handleToggleAnonymizePlayers(!anonymizePlayers)}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-60 disabled:cursor-not-allowed ${
                      anonymizePlayers ? 'bg-purple-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        anonymizePlayers ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {activeTab === 'customization' && (
        <div className="space-y-4">
          <GlassCard className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-white">Customization</h2>
                <p className="text-sm text-gray-300">Style your encounter cards and preview them with your profile.</p>
              </div>
              <div className="px-3 py-2 rounded-md border border-purple-500/40 bg-purple-500/10 text-xs text-purple-50">
                <p className="font-semibold text-sm">Spent ${spendTotal.toFixed(2)}</p>
                <p className="text-[11px] text-purple-100/80">Unlock at $3.00</p>
              </div>
            </div>

            {customizationError && (
              <div className="rounded-md border border-red-500/50 bg-red-500/10 text-red-100 text-sm px-3 py-2">
                {customizationError}
              </div>
            )}

            {loadingCustomization ? (
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span>Loading customization…</span>
              </div>
            ) : (
              <>
                {!customizationUnlocked && (
                  <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 text-yellow-100 text-sm px-4 py-3">
                    Spend at least $3.00 to unlock themes. Current total: ${spendTotal.toFixed(2)}.
                  </div>
                )}

                <div className={`grid gap-3 sm:grid-cols-2 ${!customizationUnlocked ? 'pointer-events-none opacity-50 blur-[0.5px]' : ''}`}>
                  {selectableThemes.map((key) => {
                    const meta = ENCOUNTER_THEME_METADATA[key];
                    const isSelected = selectedTheme === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedTheme(key)}
                        className={`relative rounded-xl border p-4 text-left transition-all duration-200 ${
                          isSelected
                            ? 'border-purple-400 ring-2 ring-purple-400/40 shadow-purple-500/20'
                            : 'border-gray-700 hover:border-purple-400/50 hover:shadow-purple-500/10'
                        }`}
                      >
                        <div className={`h-10 w-full rounded-lg bg-linear-to-br ${meta.swatch} mb-3 shadow-inner`} />
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-white">{meta.name}</p>
                            <p className="text-xs text-gray-300 mt-1 leading-snug">{meta.description}</p>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] px-2 py-1 rounded-full bg-purple-600/80 text-white uppercase tracking-wide">Selected</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-xs text-gray-400">Pick a theme and save to apply it to encounters you upload.</p>
                  <button
                    type="button"
                    onClick={handleSaveCustomization}
                    disabled={!customizationUnlocked || savingCustomization}
                    className="px-4 py-2 text-sm font-semibold rounded-md bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-60"
                  >
                    {savingCustomization ? 'Saving…' : 'Save Theme'}
                  </button>
                </div>

                {(() => {
                  const dummyEncounter = {
                    id: 13214,
                    sceneName: 'Goblin Lair - Master',
                    bosses: [{ monsterName: 'Shuro Barot' }],
                    startedAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
                    endedAt: new Date(Date.now()).toISOString(),
                    totalDmg: 123456,
                    players: [
                      {
                        isLocalPlayer: true,
                        isPlayer: true,
                        name: user?.discord_global_name || user?.discord_username || 'You',
                        classId: 1,
                        classSpec: 1,
                        damageDealt: 50000,
                        healDealt: 2000,
                      },
                    ],
                    user: { ...(user as User), customization: { ...(customization ?? {}), encounterTableEntryTheme: selectedTheme } },
                  };

                  return (
                    <div className={`mt-2 ${!customizationUnlocked ? 'opacity-60' : ''}`}>
                      <p className="text-sm text-gray-300 mb-2">Live preview</p>
                      <EncounterTableEntry encounter={dummyEncounter as unknown as Encounter} idx={0} disableNavigation themeKey={selectedTheme} />
                    </div>
                  );
                })()}
              </>
            )}
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
