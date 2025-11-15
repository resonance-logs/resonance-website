"use client";

import React, { useEffect, useState } from 'react';
import { GlassCard } from '@/components/landing/GlassCard';
import { useAuth } from '@/hooks/useAuth';
import { getDiscordAuthUrl } from '@/api/auth/auth';
import { getApiKeyMeta, generateApiKey, type ApiKeyMeta, type ApiKeyGenerateResponse } from '@/api/apikey/apikey';

export default function GetStartedPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [loginLoading, setLoginLoading] = useState(false);
  const [apiMeta, setApiMeta] = useState<ApiKeyMeta | null>(null);
  const [plaintextKey, setPlaintextKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copyLabel, setCopyLabel] = useState('Copy');

  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      const { url } = await getDiscordAuthUrl();
      window.location.href = url;
    } catch (err) {
      console.error('Failed to initiate Discord login', err);
      setLoginLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const meta = await getApiKeyMeta();
        if (!cancelled) setApiMeta(meta);
      } catch (e) {
        console.warn('Failed to fetch API key meta', e);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const handleGenerateKey = async () => {
    setGenerating(true);
    try {
      const resp: ApiKeyGenerateResponse = await generateApiKey();
      setPlaintextKey(resp.plaintext_key);
      setApiMeta(resp.meta);
      setCopyLabel('Copy');
      // navigate to profile tab or keep on page; we'll show the plaintext here
    } catch (e) {
      console.error('Failed to generate API key', e);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!plaintextKey) return;
    try {
      await navigator.clipboard.writeText(plaintextKey);
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy'), 1800);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  const renderStepIllustration = (stepIndex: number) => {
    switch(stepIndex) {
      case 0: // Discord
        return (
          <svg viewBox="0 0 320 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="320" height="280" fill="url(#discord-gradient)"/>
            <circle cx="160" cy="100" r="50" fill="#5865F2" opacity="0.2"/>
            <path d="M160 60C138.909 60 122 76.909 122 98C122 119.091 138.909 136 160 136C181.091 136 198 119.091 198 98C198 76.909 181.091 60 160 60Z" fill="#5865F2"/>
            <circle cx="150" cy="92" r="8" fill="white"/>
            <circle cx="170" cy="92" r="8" fill="white"/>
            <path d="M145 110C145 110 150 115 160 115C170 115 175 110 175 110" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            <path d="M100 180L160 200L220 180" stroke="#8B5CF6" strokeWidth="2" opacity="0.3"/>
            <circle cx="160" cy="200" r="6" fill="#8B5CF6" opacity="0.5"/>
            <defs>
              <linearGradient id="discord-gradient" x1="0" y1="0" x2="320" y2="280">
                <stop offset="0%" stopColor="#1a1a2e" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#16213e" stopOpacity="0.6"/>
              </linearGradient>
            </defs>
          </svg>
        );
      case 1: // Download
        return (
          <svg viewBox="0 0 320 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="320" height="280" fill="url(#download-gradient)"/>
            <rect x="90" y="60" width="140" height="100" rx="8" fill="#1f2937" stroke="#6366f1" strokeWidth="2"/>
            <path d="M160 90V130M160 130L145 115M160 130L175 115" stroke="#8B5CF6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="120" y="170" width="80" height="8" rx="4" fill="#6366f1" opacity="0.3"/>
            <circle cx="100" cy="200" r="4" fill="#8B5CF6" opacity="0.5"/>
            <circle cx="160" cy="210" r="4" fill="#8B5CF6" opacity="0.5"/>
            <circle cx="220" cy="200" r="4" fill="#8B5CF6" opacity="0.5"/>
            <defs>
              <linearGradient id="download-gradient" x1="0" y1="0" x2="320" y2="280">
                <stop offset="0%" stopColor="#1a1a2e" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#16213e" stopOpacity="0.6"/>
              </linearGradient>
            </defs>
          </svg>
        );
      case 2: // API Key
        return (
          <svg viewBox="0 0 320 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="320" height="280" fill="url(#key-gradient)"/>
            <circle cx="120" cy="100" r="30" fill="#8B5CF6" opacity="0.2"/>
            <circle cx="120" cy="100" r="20" fill="#8B5CF6"/>
            <circle cx="120" cy="100" r="10" fill="#1f2937"/>
            <rect x="140" y="95" width="60" height="10" fill="#8B5CF6"/>
            <rect x="175" y="85" width="8" height="10" fill="#8B5CF6"/>
            <rect x="185" y="85" width="8" height="10" fill="#8B5CF6"/>
            <rect x="195" y="85" width="8" height="10" fill="#8B5CF6"/>
            <rect x="80" y="150" width="160" height="40" rx="6" fill="#1f2937" stroke="#6366f1" strokeWidth="2"/>
            <text x="100" y="175" fill="#8B5CF6" fontSize="14" fontFamily="monospace">••••••••••••</text>
            <defs>
              <linearGradient id="key-gradient" x1="0" y1="0" x2="320" y2="280">
                <stop offset="0%" stopColor="#1a1a2e" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#16213e" stopOpacity="0.6"/>
              </linearGradient>
            </defs>
          </svg>
        );
      case 3: // Configure
        return (
          <svg viewBox="0 0 320 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="320" height="280" fill="url(#config-gradient)"/>
            <rect x="70" y="50" width="180" height="140" rx="8" fill="#1f2937" stroke="#6366f1" strokeWidth="2"/>
            <circle cx="85" cy="70" r="4" fill="#ef4444"/>
            <circle cx="100" cy="70" r="4" fill="#f59e0b"/>
            <circle cx="115" cy="70" r="4" fill="#10b981"/>
            <rect x="90" y="95" width="140" height="12" rx="4" fill="#374151"/>
            <rect x="90" y="120" width="100" height="12" rx="4" fill="#374151"/>
            <rect x="90" y="145" width="120" height="12" rx="4" fill="#6366f1" opacity="0.5"/>
            <path d="M160 200L160 220M150 210L170 210" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round"/>
            <circle cx="200" cy="200" r="25" stroke="#8B5CF6" strokeWidth="2" opacity="0.3" fill="none"/>
            <defs>
              <linearGradient id="config-gradient" x1="0" y1="0" x2="320" y2="280">
                <stop offset="0%" stopColor="#1a1a2e" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#16213e" stopOpacity="0.6"/>
              </linearGradient>
            </defs>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-32 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 backdrop-blur-md mb-6">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <p className="text-xs uppercase tracking-wider text-purple-300 font-semibold">Quick Setup</p>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 bg-linear-to-r from-purple-200 via-purple-300 to-pink-200 bg-clip-text text-transparent leading-tight">
            Start Tracking Your Encounters
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Set up your account in minutes and start analyzing your combat performance with comprehensive insights and community comparisons.
          </p>
        </div>

        <div className="space-y-8">
          {/* Steps list - full width each */}
          {[
            {
              title: 'Connect with Discord',
              description: 'Authenticate using your Discord account to link your uploads and API keys securely to your profile.',
              action: (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <button
                    onClick={handleLogin}
                    disabled={isAuthenticated || isLoading || loginLoading}
                    className="px-6 py-2.5 rounded-lg bg-linear-to-r from-purple-500 to-blue-400 text-white font-semibold shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    {isAuthenticated ? 'Connected' : loginLoading ? 'Redirecting…' : 'Sign in with Discord'}
                  </button>
                  {isAuthenticated ? (
                    <div className="flex items-center gap-2 text-sm text-green-400 font-medium">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      Successfully authenticated
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">Required to continue</div>
                  )}
                </div>
              ),
            },
            {
              title: 'Download the Uploader',
              description: 'Get the latest version of our desktop application to automatically track and upload your combat encounters.',
              action: (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <a
                    href={process.env.NEXT_PUBLIC_APP_DOWNLOAD_LINK || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gray-800/80 text-white font-semibold border border-gray-600/50 hover:bg-gray-700/80 hover:border-gray-500/50 transition-all duration-200 disabled:opacity-50"
                    aria-disabled={!process.env.NEXT_PUBLIC_APP_DOWNLOAD_LINK}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/>
                    </svg>
                    Download for Windows
                  </a>
                  <span className="text-sm text-gray-400">Latest version • ~15MB</span>
                </div>
              ),
            },
            {
              title: 'Generate Your API Key',
              description: 'Create a unique API key to authenticate the uploader with your account. Keep this key secure—it will only be shown once.',
              action: (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleGenerateKey}
                      disabled={!isAuthenticated || generating}
                      className="px-6 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {generating ? 'Generating…' : apiMeta?.has_key ? 'Regenerate Key' : 'Generate Key'}
                    </button>
                    {plaintextKey && (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="px-4 py-2.5 rounded-md bg-black/60 border border-purple-400/40 text-sm font-mono text-purple-100 truncate flex-1">
                          {plaintextKey}
                        </div>
                        <button
                          onClick={handleCopy}
                          className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-500 text-sm text-white font-medium transition-colors whitespace-nowrap flex items-center gap-1.5"
                        >
                          {copyLabel === 'Copied!' ? (
                            <>
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                              </svg>
                              Copied!
                            </>
                          ) : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-400">
                    {!plaintextKey && (apiMeta?.has_key ? 'You already have a key. Regenerate to view a new one.' : !isAuthenticated ? 'Sign in first to generate a key' : 'Click the button above to create your API key')}
                  </div>
                </div>
              ),
            },
            {
              title: 'Configure the Application',
              description: 'Launch the desktop app and paste your API key in the settings panel to link it with your account.',
              action: (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Open the desktop app&apos;s settings, find the &quot;API Key&quot; field, and paste your key there. Save the settings to complete setup.
                  </p>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    <span className="text-purple-300 font-semibold">Optional:</span> Enable auto-upload in the app settings to automatically upload encounters as they happen for real-time tracking.
                  </p>
                </div>
              ),
            }
          ].map((step, idx) => (
            <div key={step.title} className={`w-full flex flex-col md:flex-row items-stretch gap-6 ${idx % 2 === 0 ? '' : 'md:flex-row-reverse'}`}>
              {/* Instruction long card */}
              <GlassCard className="flex-1 p-8 min-h-[280px]" glow="none">
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-sm font-bold">
                        {idx + 1}
                      </div>
                      <div className="text-xs uppercase tracking-wider text-purple-300/80 font-semibold">Step {idx + 1} of 4</div>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">{step.title}</h3>
                    <p className="text-base text-gray-300 leading-relaxed">{step.description}</p>
                  </div>

                  <div className="mt-8">
                    {step.action}
                  </div>
                </div>
              </GlassCard>

              {/* Square image card (separate from the instruction card) */}
              <GlassCard className="w-full md:w-80 shrink-0 h-full min-h-[280px] p-0 overflow-hidden flex items-center justify-center" glow="none">
                {renderStepIllustration(idx)}
              </GlassCard>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
