'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useBackground } from '@/context/BackgroundContext';
import { getDiscordAuthUrl } from '@/api/auth/auth';
import { getApiKeyMeta, generateApiKey, type ApiKeyMeta, type ApiKeyGenerateResponse } from '@/api/apikey/apikey';
import { getSettings, updateSettings } from '@/api/settings/settings';
import { getCustomization, updateCustomization } from '@/api/customization/customization';
import Image from 'next/image';
import { GlassCard } from '@/components/landing/GlassCard';
import EncounterTableEntry, { ENCOUNTER_THEME_KEYS, ENCOUNTER_THEME_METADATA } from '@/components/ui/EncounterTableEntry';
import EncounterTableRow from '@/components/ui/EncounterTableRow';
import { ROW_FONTS, ROW_FONT_KEYS, ROW_GRADIENTS, ROW_GRADIENT_KEYS, TAG_ICONS, TAG_ICON_KEYS, TAG_PRESET_COLORS, GOOGLE_FONTS_URL } from '@/components/ui/EncounterTableRowCustomization';
import { CLASS_MAP } from '@/utils/classData';
import LeaderboardRow from "@/components/ui/LeaderboardRow";
import { EntityLeaderboardEntry } from "@/api/entity/entity";
import type { User, Encounter, EncounterTableEntryThemeKey, UserCustomization, ActorEncounterStat, EncounterTableRowFont, EncounterTableRowGradient, EncounterTableRowTagIcon, EncounterTableRowSettings, CustomTagSettings } from '@/types/commonTypes';

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
  const { enabled: backgroundEnabled, toggleBackground } = useBackground();
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
  const [previewClassId, setPreviewClassId] = useState<number>(12);

  // Encounter Table Row customization state
  const [selectedRowFont, setSelectedRowFont] = useState<EncounterTableRowFont>('');
  const [selectedRowColor, setSelectedRowColor] = useState<string>('');
  const [useCustomColor, setUseCustomColor] = useState(false);
  const [customHexColor, setCustomHexColor] = useState('#ffffff');

  // Custom tag state
  const [tagText, setTagText] = useState<string>('');
  const [tagColor, setTagColor] = useState<string>('#f59e0b');
  const [tagIcon, setTagIcon] = useState<EncounterTableRowTagIcon>('');

  // Entity leaderboard theme state
  const [entityLeaderboardTheme, setEntityLeaderboardTheme] = useState<EncounterTableEntryThemeKey>('default');

  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);


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

    // Load row customization settings
    const rowSettings = user?.customization?.encounterTableRow as EncounterTableRowSettings | undefined;
    if (rowSettings) {
      setSelectedRowFont((rowSettings.font as EncounterTableRowFont) || '');
      const color = rowSettings.color || '';
      // Check if it's a custom hex color
      if (color.startsWith('#')) {
        setUseCustomColor(true);
        setCustomHexColor(color);
        setSelectedRowColor('');
      } else {
        setUseCustomColor(false);
        setSelectedRowColor(color);
      }
      // Load custom tag settings
      const tagSettings = rowSettings.tag as CustomTagSettings | undefined;
      if (tagSettings) {
        setTagText(tagSettings.text || '');
        setTagColor(tagSettings.color || '#f59e0b');
        setTagIcon((tagSettings.icon as EncounterTableRowTagIcon) || '');
      }
    }

    // Load entity leaderboard theme
    const leaderboardTheme = (user?.customization?.entityLeaderboardTheme as EncounterTableEntryThemeKey) || 'default';
    setEntityLeaderboardTheme(leaderboardTheme);
  }, [user?.customization]);

  // Auto-save all customization with 1 second debounce
  // Note: This must be defined before any conditional returns to maintain hook order
  const spendTotal = user?.amount_spent_usd ?? 0;
  const customizationUnlocked = spendTotal >= 3;

  const saveAllCustomization = useCallback(async () => {
    if (!customizationUnlocked) return;

    setAutoSaveStatus('saving');
    try {
      // Determine the color value - either gradient key or custom hex
      const colorValue = useCustomColor ? customHexColor : selectedRowColor;

      // Build custom tag object
      const customTagSettings: CustomTagSettings | undefined = (tagText || tagIcon) ? {
        text: tagText || undefined,
        color: tagColor || undefined,
        icon: tagIcon || undefined,
      } : undefined;

      const { customization: updated } = await updateCustomization({
        encounterTableEntryTheme: selectedTheme === 'default' ? '' : selectedTheme,
        encounterTableRow: {
          font: selectedRowFont || undefined,
          color: colorValue || undefined,
          tag: customTagSettings,
        },
        entityLeaderboardTheme: entityLeaderboardTheme === 'default' ? '' : entityLeaderboardTheme,
      });
      setCustomization(updated);
      queryClient.setQueryData(['auth', 'me'], (prev: User | null) => (prev ? { ...prev, customization: updated } : prev));
      setAutoSaveStatus('saved');
      // Reset to idle after showing "saved" briefly
      setTimeout(() => setAutoSaveStatus('idle'), 1500);
    } catch (e) {
      console.error('Failed to save customization', e);
      setAutoSaveStatus('error');
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    }
  }, [customizationUnlocked, useCustomColor, customHexColor, selectedRowColor, tagText, tagIcon, tagColor, selectedRowFont, selectedTheme, entityLeaderboardTheme, queryClient]);

  // Debounced auto-save effect for all customization
  useEffect(() => {
    // Skip initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Don't save if not unlocked
    if (!customizationUnlocked) return;

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(() => {
      saveAllCustomization();
    }, 1000);

    // Cleanup on unmount or dependency change
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [selectedRowFont, selectedRowColor, useCustomColor, customHexColor, tagText, tagColor, tagIcon, selectedTheme, entityLeaderboardTheme, saveAllCustomization, customizationUnlocked]);

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

      // Load row settings
      const rowSettings = loaded?.encounterTableRow as EncounterTableRowSettings | undefined;
      if (rowSettings) {
        setSelectedRowFont((rowSettings.font as EncounterTableRowFont) || '');
        const color = rowSettings.color || '';
        if (color.startsWith('#')) {
          setUseCustomColor(true);
          setCustomHexColor(color);
          setSelectedRowColor('');
        } else {
          setUseCustomColor(false);
          setSelectedRowColor(color);
        }
        // Load custom tag settings
        const tagSettings = rowSettings.tag as CustomTagSettings | undefined;
        if (tagSettings) {
          setTagText(tagSettings.text || '');
          setTagColor(tagSettings.color || '#f59e0b');
          setTagIcon((tagSettings.icon as EncounterTableRowTagIcon) || '');
        }
      }

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
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-60 disabled:cursor-not-allowed ${anonymizeUploader ? 'bg-purple-600' : 'bg-gray-600'
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${anonymizeUploader ? 'translate-x-6' : 'translate-x-1'
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
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-60 disabled:cursor-not-allowed ${anonymizePlayers ? 'bg-purple-600' : 'bg-gray-600'
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${anonymizePlayers ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Website Theme Card */}
          <GlassCard className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">Website Theme</h2>
              <p className="text-sm text-gray-400">Customize the look and feel of the website.</p>
            </div>

            <div className="space-y-4">
              {/* Background Effects Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
                <div className="flex-1 pr-4">
                  <h3 className="text-sm font-medium text-white">Background Effects</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Enable or disable the animated background effects. Disabling may improve performance on older devices.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={backgroundEnabled}
                  onClick={toggleBackground}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${backgroundEnabled ? 'bg-purple-600' : 'bg-gray-600'
                    }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${backgroundEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === 'customization' && (
        <div className="space-y-4">
          <GlassCard className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-white">Encounter Table Card</h2>
                <p className="text-sm text-gray-300">Style your encounter cards and preview them with your profile.</p>
              </div>
              <div className="flex items-center gap-2">
                {autoSaveStatus === 'saving' && (
                  <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                )}
                {autoSaveStatus === 'saved' && (
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {autoSaveStatus === 'error' && (
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
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
                    Become a <a href={process.env.NEXT_PUBLIC_KOFI_LINK} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">supporter</a> to unlock themes.
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
                        className={`relative rounded-xl border p-4 text-left transition-all duration-200 ${isSelected
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

          <div className="space-y-4">
            <GlassCard className="p-6 space-y-5">
              {/* Google Fonts Link for preview */}
              <link href={GOOGLE_FONTS_URL} rel="stylesheet" />

              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-lg font-semibold text-white">Encounter Table Row</h2>
                  <p className="text-sm text-gray-300">Customize how your name appears in encounter tables.</p>
                </div>
                <div className="flex items-center gap-2">
                  {autoSaveStatus === 'saving' && (
                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  {autoSaveStatus === 'saved' && (
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {autoSaveStatus === 'error' && (
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              </div>

              {!customizationUnlocked && (
                <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 text-yellow-100 text-sm px-4 py-3">
                  Become a <a href={process.env.NEXT_PUBLIC_KOFI_LINK} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">supporter</a> to unlock row customization.
                </div>
              )}

              <div className={`space-y-6 ${!customizationUnlocked ? 'pointer-events-none opacity-50 blur-[0.5px]' : ''}`}>
                {/* Font Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Name Font</label>
                  <select
                    value={selectedRowFont}
                    onChange={(e) => setSelectedRowFont(e.target.value as EncounterTableRowFont)}
                    className="bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-700 w-full max-w-xs focus:border-purple-500 focus:outline-none"
                    style={{ fontFamily: selectedRowFont ? ROW_FONTS[selectedRowFont]?.fontFamily : 'inherit' }}
                  >
                    {ROW_FONT_KEYS.map((fontKey) => (
                      <option key={fontKey} value={fontKey} style={{ fontFamily: ROW_FONTS[fontKey]?.fontFamily }}>
                        {ROW_FONTS[fontKey].name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Color/Gradient Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Name Color</label>

                  {/* All color options in one row */}
                  <div className="flex flex-wrap gap-2 items-center">
                    {/* White/Default option */}
                    <button
                      type="button"
                      onClick={() => {
                        setUseCustomColor(false);
                        setSelectedRowColor('');
                      }}
                      className={`relative w-10 h-10 rounded-lg transition-all duration-200 bg-white border border-gray-600 ${!useCustomColor && selectedRowColor === ''
                        ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-gray-900 scale-105'
                        : 'hover:scale-105 hover:ring-1 hover:ring-purple-400/50'
                        }`}
                      title="White (Default)"
                    >
                      {!useCustomColor && selectedRowColor === '' && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-800 drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </button>

                    {/* Gradient Options */}
                    {ROW_GRADIENT_KEYS.map((gradientKey) => {
                      const isSelected = !useCustomColor && selectedRowColor === gradientKey;
                      return (
                        <button
                          key={gradientKey}
                          type="button"
                          onClick={() => {
                            setUseCustomColor(false);
                            setSelectedRowColor(gradientKey);
                          }}
                          className={`relative w-10 h-10 rounded-lg transition-all duration-200 ${ROW_GRADIENTS[gradientKey].swatch} ${isSelected
                            ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-gray-900 scale-105'
                            : 'hover:scale-105 hover:ring-1 hover:ring-purple-400/50'
                            }`}
                          title={ROW_GRADIENTS[gradientKey].name}
                        >
                          {isSelected && (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <svg className="w-5 h-5 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                        </button>
                      );
                    })}

                    {/* Custom Color Picker - inline */}
                    <div className="relative">
                      <input
                        type="color"
                        value={customHexColor}
                        onChange={(e) => {
                          setCustomHexColor(e.target.value);
                          setUseCustomColor(true);
                        }}
                        onClick={() => setUseCustomColor(true)}
                        className={`w-10 h-10 rounded-lg cursor-pointer border transition-all ${useCustomColor
                          ? 'border-purple-500 ring-2 ring-purple-400 ring-offset-2 ring-offset-gray-900 scale-105'
                          : 'border-gray-600 hover:scale-105'
                          }`}
                        title="Custom Color"
                      />
                      {useCustomColor && (
                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <svg className="w-5 h-5 text-white drop-shadow-lg mix-blend-difference" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Custom Tag Section */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-300">Custom Tag</label>

                  {/* Tag Text Input */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Tag Text (max 20 characters)</label>
                    <input
                      type="text"
                      value={tagText}
                      onChange={(e) => setTagText(e.target.value.slice(0, 20))}
                      placeholder="Enter your custom tag..."
                      maxLength={20}
                      className="bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-700 w-full max-w-xs focus:border-purple-500 focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">{tagText.length}/20 characters</p>
                  </div>

                  {/* Tag Color Selection */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Tag Color</label>
                    <div className="flex flex-wrap gap-2 items-center">
                      {TAG_PRESET_COLORS.map((preset) => (
                        <button
                          key={preset.hex}
                          type="button"
                          onClick={() => setTagColor(preset.hex)}
                          className={`w-8 h-8 rounded-lg transition-all ${tagColor === preset.hex
                            ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-gray-900 scale-110'
                            : 'hover:scale-105'
                            }`}
                          style={{ backgroundColor: preset.hex }}
                          title={preset.name}
                        />
                      ))}
                      <input
                        type="color"
                        value={tagColor}
                        onChange={(e) => setTagColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border border-gray-700"
                        title="Custom color"
                      />
                    </div>
                  </div>

                  {/* Tag Icon Selection */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Tag Icon</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setTagIcon('')}
                        className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-all ${tagIcon === ''
                          ? 'bg-gray-700 border-purple-500 text-white'
                          : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                          }`}
                        title="No icon"
                      >
                        ✕
                      </button>
                      {TAG_ICON_KEYS.map((iconKey) => {
                        const icon = TAG_ICONS[iconKey];
                        const isSelected = tagIcon === iconKey;
                        return (
                          <button
                            key={iconKey}
                            type="button"
                            onClick={() => setTagIcon(iconKey)}
                            className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-all ${isSelected
                              ? 'bg-gray-700 border-purple-500 text-white ring-2 ring-purple-400 ring-offset-1 ring-offset-gray-900'
                              : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600 hover:text-white'
                              }`}
                            title={icon.name}
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d={icon.svgPath} />
                            </svg>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tag Preview */}
                  {(tagText || tagIcon) && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Preview:</span>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded"
                        style={{
                          backgroundColor: tagColor,
                          color: parseInt(tagColor.slice(1), 16) > 0x7fffff ? '#000' : '#fff'
                        }}
                      >
                        {tagText && <span>{tagText}</span>}
                        {tagIcon && TAG_ICONS[tagIcon]?.svgPath && (
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d={TAG_ICONS[tagIcon].svgPath} />
                          </svg>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setTagText('');
                          setTagIcon('');
                        }}
                        className="text-xs text-gray-400 hover:text-white"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {/* Live Preview */}
                <div className="mt-4">
                  <p className="text-sm text-gray-300 mb-3">Live Preview</p>

                  <div className="mb-3 flex items-center gap-3">
                    <label className="text-sm text-gray-300">Preview Class:</label>
                    <select
                      value={previewClassId}
                      onChange={(e) => setPreviewClassId(Number(e.target.value))}
                      className="bg-gray-800 text-white text-sm px-2 py-1 rounded border border-gray-700"
                    >
                      {Object.entries(CLASS_MAP).map(([id, name]) => (
                        <option key={id} value={id}>{name}</option>
                      ))}
                    </select>
                  </div>

                  {(() => {
                    // Build preview customization with current selections
                    const previewTagSettings: CustomTagSettings | undefined = (tagText || tagIcon) ? {
                      text: tagText || undefined,
                      color: tagColor || undefined,
                      icon: tagIcon || undefined,
                    } : undefined;

                    const previewRowSettings: EncounterTableRowSettings = {
                      font: selectedRowFont || undefined,
                      color: useCustomColor ? customHexColor : (selectedRowColor || undefined),
                      tag: previewTagSettings,
                    };

                    const dummyPlayer: ActorEncounterStat = {
                      id: 1023627,
                      actorId: 4342594,
                      classId: previewClassId,
                      classSpec: 14,
                      abilityScore: 20178,
                      damageDealt: 1141084,
                      healDealt: 321423,
                      damageTaken: 875265,
                      hitsDealt: 408,
                      hitsHeal: 230,
                      hitsTaken: 104,
                      dps: 3561.8915,
                      duration: 320.359,
                      isLocalPlayer: true,
                      isPlayer: true,
                      level: 60,
                      name: user?.discord_global_name || user?.discord_username || 'You',
                      revives: 1,
                      encounterId: 27020,
                      critHitsDealt: 162,
                      critHitsHeal: 81,
                      critHitsTaken: 0,
                      critTotalDealt: 555920,
                      critTotalHeal: 102070,
                      critTotalTaken: 0,
                      luckyHitsDealt: 0,
                      luckyHitsHeal: 0,
                      luckyHitsTaken: 0,
                      luckyTotalDealt: 0,
                      luckyTotalHeal: 0,
                      luckyTotalTaken: 0,
                      bossDamageDealt: 41331,
                      bossHitsDealt: 16,
                      bossCritHitsDealt: 4,
                      bossLuckyHitsDealt: 0,
                      bossCritTotalDealt: 13712,
                      bossLuckyTotalDealt: 0,
                      attributes: { Name: 'Keberrye', Level: 60, MaxHp: 145406 },
                      user: {
                        id: user?.id ?? 2,
                        discord_username: user?.discord_username ?? 'preview_user',
                        discord_global_name: user?.discord_global_name ?? 'Preview User',
                        discord_avatar_url: user?.discord_avatar_url ?? null,
                        customization: {
                          encounterTableRow: previewRowSettings,
                        },
                      },
                    };

                    const stats = {
                      damageDealt: dummyPlayer.damageDealt,
                      healDealt: dummyPlayer.healDealt,
                      damageTaken: dummyPlayer.damageTaken,
                      hitsDealt: dummyPlayer.hitsDealt,
                      hitsHeal: dummyPlayer.hitsHeal,
                      hitsTaken: dummyPlayer.hitsTaken,
                      dps: dummyPlayer.dps,
                      hps: Math.round((dummyPlayer.healDealt || 0) / Math.max(1, dummyPlayer.duration || 1)),
                    };

                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <tbody>
                            <EncounterTableRow
                              key={dummyPlayer.actorId}
                              player={dummyPlayer}
                              stats={stats}
                              damagePercent={100}
                              relativeToTop={100}
                              isSelected={false}
                              onToggleSelect={() => { }}
                              compact
                            />
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </GlassCard>

            {/* Entity Leaderboard Theme */}
            <GlassCard className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-lg font-semibold text-white">All Players Leaderboard</h2>
                  <p className="text-sm text-gray-300">Choose how your row appears on the All Players leaderboard.</p>
                </div>
                <div className="flex items-center gap-2">
                  {autoSaveStatus === 'saving' && (
                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  {autoSaveStatus === 'saved' && (
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {autoSaveStatus === 'error' && (
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              </div>

              {!customizationUnlocked && (
                <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 text-yellow-100 text-sm px-4 py-3">
                  Become a <a href={process.env.NEXT_PUBLIC_KOFI_LINK} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">supporter</a> to unlock leaderboard customization.
                </div>
              )}

              <div className={`space-y-4 ${!customizationUnlocked ? 'pointer-events-none opacity-50 blur-[0.5px]' : ''}`}>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Theme</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {ENCOUNTER_THEME_KEYS.map((themeKey) => {
                      const meta = ENCOUNTER_THEME_METADATA[themeKey];
                      const isSelected = entityLeaderboardTheme === themeKey;
                      return (
                        <button
                          key={themeKey}
                          type="button"
                          onClick={() => setEntityLeaderboardTheme(themeKey)}
                          className={`relative flex flex-col items-start p-3 rounded-xl border transition-all duration-200 text-left ${isSelected
                            ? 'border-purple-400 ring-2 ring-purple-400/50 bg-purple-500/10'
                            : 'border-gray-700 hover:border-purple-400/50 bg-gray-800/50'
                            }`}
                        >
                          <div className={`w-full h-4 rounded-md bg-gradient-to-r ${meta.swatch} mb-2`} />
                          <span className="text-sm font-medium text-white">{meta.name}</span>
                          <span className="text-xs text-gray-400 line-clamp-2">{meta.description}</span>
                          {isSelected && (
                            <span className="absolute top-2 right-2">
                              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Live Preview of Entity Leaderboard Row */}
              <div className="mt-8 pt-6 border-t border-gray-800">
                <h3 className="text-sm font-medium text-white mb-4">Row Preview</h3>

                <div className="space-y-3">
                  {(() => {
                    const dummyEntry: EntityLeaderboardEntry = {
                      entityId: 1,
                      name: user?.discord_global_name || user?.discord_username || 'You',
                      classId: previewClassId,
                      classSpec: 14, // Dummy spec (ignored in display now)
                      abilityScore: 25000,
                      level: 60,
                      user: {
                        id: user?.id ?? 0,
                        discord_username: user?.discord_username ?? 'username',
                        discord_global_name: user?.discord_global_name,
                        discord_avatar_url: user?.discord_avatar_url ?? undefined,
                        customization: {
                          ...(customization ?? {}),
                          entityLeaderboardTheme: entityLeaderboardTheme,
                        }
                      }
                    };

                    return (
                      <LeaderboardRow
                        entry={dummyEntry}
                        rank={1}
                      />
                    );
                  })()}
                </div>
              </div>
            </GlassCard>
          </div>
        </div >
      )
      }


      {
        activeTab === 'api' && (
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
        )
      }
    </div >
  );
}
