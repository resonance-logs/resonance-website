"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { AnimatedCounter } from './AnimatedCounter';
import { StatCard } from './StatCard';
import { Tooltip } from 'antd'
import TableRowGlow from "@/components/ui/TableRowGlow";
import Image from "next/image"
import { CLASS_MAP, getClassIconName, getClassTooltip, DUMMY_PLAYER_DATA } from "@/utils/classData";
import { formatNumber } from "@/utils/numberFormatter";
import { fetchStatisticsOverview } from "@/api/statistics/statistics";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const fadeInScaleVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const statCardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const DISCORD_LINK = process.env.NEXT_PUBLIC_DISCORD_LINK || 'https://discord.gg';

export const HeroSection: React.FC = () => {
  const haloRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [overview, setOverview] = useState<{ total_damage: number; total_duration: number; total_healing: number; encounters: number; total_players: number } | null>(null);
  const [showUpdateNotice, setShowUpdateNotice] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('update-notification-dismissed') !== '2';
  });

  const handleUpdateNoticeClick = () => {
    if (typeof window === 'undefined') return;
    setShowUpdateNotice(false);
    localStorage.setItem('update-notification-dismissed', '2');
  };

  useEffect(() => {
    const halo = haloRef.current;
    const wrapper = wrapperRef.current;
    if (!halo || !wrapper) return;

    let frameId: number;

    const handleMove = (e: MouseEvent) => {
      const rect = wrapper.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      const tiltX = y * -10;
      const tiltY = x * 14;
      const translateX = x * 10;
      const translateY = y * 8;

      halo.style.setProperty('--halo-tilt-x', `${tiltX}deg`);
      halo.style.setProperty('--halo-tilt-y', `${tiltY}deg`);
      halo.style.setProperty(
        'transform',
        `translate3d(${translateX}px, ${translateY}px, 0)`
      );
    };

    const handleLeave = () => {
      halo.style.setProperty('--halo-tilt-x', '0deg');
      halo.style.setProperty('--halo-tilt-y', '0deg');
      halo.style.transform = 'translate3d(0, 0, 0)';
    };

    const spin = () => {
      const t = performance.now() / 2800;
      halo.style.setProperty('--halo-rotation', `${t}turn`);
      frameId = requestAnimationFrame(spin);
    };
    frameId = requestAnimationFrame(spin);

    wrapper.addEventListener('mousemove', handleMove);
    wrapper.addEventListener('mouseleave', handleLeave);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      wrapper.removeEventListener('mousemove', handleMove);
      wrapper.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchStatisticsOverview();
        if (!cancelled) setOverview(data);
      } catch {
        // no-op for hero section
      }
    })();
    return () => { cancelled = true; };
  }, []);


  return (
    <section className="relative h-[calc(100vh-64px)] box-border flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden" id="hero">
      {/* Animated floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 4 + 2,
              height: Math.random() * 4 + 2,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `rgba(${Math.random() > 0.5 ? '139, 92, 246' : '59, 130, 246'}, ${Math.random() * 0.5 + 0.2})`,
            }}
            animate={{
              y: [0, -100 - Math.random() * 200],
              x: [0, (Math.random() - 0.5) * 100],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 8 + Math.random() * 10,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Gradient orbs */}
      <motion.div
        className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="max-w-7xl mx-auto w-full mb-20 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {showUpdateNotice ? (
          <motion.div className="flex justify-center mb-6" variants={fadeUpVariants}>
            <a
              href="https://github.com/resonance-logs/resonance-logs/releases/latest"
              target="_blank"
              rel="noreferrer"
              onClick={handleUpdateNoticeClick}
              className="group relative w-full max-w-3xl overflow-hidden rounded-2xl border border-blue-400/20 bg-[rgba(5,7,18,0.92)] px-4 py-3 shadow-[0_10px_40px_rgba(59,130,246,0.15)] backdrop-blur-sm transition hover:border-blue-300/40"
            >
              <div className="absolute inset-0 bg-linear-to-r from-purple-600/20 via-blue-500/10 to-transparent opacity-60 group-hover:opacity-90 transition" />
              <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/15 text-blue-200">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Z" />
                      <path d="M18 16v-5a6 6 0 1 0-12 0v5" />
                      <path d="M5 16h14" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-200/80">New Update</p>
                    <p className="text-sm text-gray-100">Recent app bugfixes are live — check the latest here.</p>
                  </div>
                </div>
                <span className="relative inline-flex items-center gap-1 text-sm font-semibold text-blue-200 group-hover:text-blue-100">
                  View release
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </span>
              </div>
            </a>
          </motion.div>
        ) : null}

        {/* Section Label */}
        <motion.div className="flex justify-center mb-10" variants={fadeUpVariants}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(5,7,18,0.98)] border border-purple-500/20 text-purple-400 text-xs font-medium tracking-wider uppercase">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            Blue Protocol Star Resonance
          </div>
        </motion.div>

        {/* Main Hero Content */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text Content */}
          <motion.div className="text-center lg:text-left" variants={containerVariants}>
            <motion.h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
              variants={fadeUpVariants}
            >
              Master the
              <motion.span
                className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent bg-[length:200%_auto]"
                animate={{ backgroundPosition: ['0% center', '200% center'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                {' '}Stars{' '}
              </motion.span>
              in Blue Protocol
            </motion.h1>

            <motion.p
              className="text-xl text-gray-300 mb-8 leading-relaxed max-w-2xl"
              variants={fadeUpVariants}
            >
              Track your encounters, analyze your performance, and dominate the cosmos with
              comprehensive combat analytics designed specifically for Blue Protocol players.
            </motion.p>

            {/* Hero Stats */}
            <motion.div className="grid grid-cols-3 gap-6 max-w-md mx-auto lg:mx-0" variants={fadeUpVariants}>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  <AnimatedCounter end={overview?.total_players ?? 0} suffix="+" />
                </div>
                <div className="text-sm text-purple-300">Active Players</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  <AnimatedCounter end={overview?.encounters ?? 0} suffix="+" />
                </div>
                <div className="text-sm text-purple-300">Encounters Tracked</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  <AnimatedCounter end={99.9} suffix="%" />
                </div>
                <div className="text-sm text-purple-300">Uptime</div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div className="mt-8 flex items-center justify-center lg:justify-start gap-4" variants={fadeUpVariants}>
              <Link href="/get-started" className="group relative inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-white font-semibold bg-gradient-to-r from-purple-600 via-purple-500 to-blue-500 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all duration-300 overflow-hidden">
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <svg className="relative w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" x2="3" y1="12" y2="12" />
                </svg>
                <span className="relative">Get Started</span>
              </Link>

              <a href={DISCORD_LINK} target="_blank" rel="noreferrer" className="group relative inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-purple-100 bg-[rgba(139,92,246,0.08)] border border-purple-500/20 backdrop-blur-sm hover:bg-purple-500/15 hover:border-purple-400/40 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-all duration-300">
                <svg className="w-5 h-5 text-[#5865F2] group-hover:scale-110 transition-transform duration-200" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                <span className="relative font-medium">Join Discord</span>
              </a>
            </motion.div>
          </motion.div>

          {/* Right Column - Interactive Preview */}
          <motion.div className="relative" ref={wrapperRef} variants={fadeInScaleVariants}>
            <GlassCard className="relative overflow-hidden" padding={false}>
              <AnimatedPreviewTable />
            </GlassCard>
          </motion.div>
        </div>

        {/* Bottom Stats Cards */}
        <motion.div
          className="mt-20 grid md:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.div variants={statCardVariants} whileHover={{ scale: 1.02, y: -4 }} transition={{ duration: 0.2 }}>
            <StatCard
              title="Total Damage"
              value={overview ? Math.round(overview.total_damage) : 0}
              prefix=""
              suffix=""
              description="Cumulative damage across all encounters"
              icon={
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="m10 13-2 2 2 2" />
                  <path d="m14 17 2-2-2-2" />
                </svg>
              }
              trend="up"
            />
          </motion.div>
          <motion.div variants={statCardVariants} whileHover={{ scale: 1.02, y: -4 }} transition={{ duration: 0.2 }}>
            <StatCard
              title="Total Healing"
              value={overview ? Math.round(overview.total_healing) : 0}
              prefix=""
              suffix=""
              description="Cumulative healing across all encounters"
              icon={
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
              }
              trend="up"
            />
          </motion.div>
          <motion.div variants={statCardVariants} whileHover={{ scale: 1.02, y: -4 }} transition={{ duration: 0.2 }}>
            <StatCard
              title="Total Duration"
              value={overview ? Math.round(overview.total_duration / 3600) : 0}
              prefix=""
              suffix="h"
              description="Cumulative fight time (hours)"
              icon={
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              }
              trend="up"
              abreviated={false}
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
};


function AnimatedPreviewTable() {
  const durationSec = 120;
  const [showGlow, setShowGlow] = useState(false);

  // Show glow after initial animation
  useEffect(() => {
    const t = setTimeout(() => setShowGlow(true), 800);
    return () => clearTimeout(t);
  }, []);

  // Calculate totals for percentages
  const totalDamage = DUMMY_PLAYER_DATA.reduce((sum, p) => sum + p.damageDealt, 0);
  const maxDamage = Math.max(...DUMMY_PLAYER_DATA.map(p => p.damageDealt));

  return (
    <div className="w-full overflow-hidden text-xs">
      <div className="w-full overflow-hidden flex flex-col">
        <table className="w-full text-sm table-fixed">
          <thead className="bg-gray-800/50">
            <tr className="border-b border-gray-800">
              <th className="text-left px-3 py-2 font-semibold text-gray-300 w-1/2">Name</th>
              <th className="text-right py-2 font-semibold text-gray-300 w-1/10">D%</th>
              <th className="text-right py-2 font-semibold text-gray-300 w-1/10">DMG</th>
              <th className="text-right py-2 font-semibold text-gray-300 w-1/10">DPS</th>
              <th className="text-right py-2 font-semibold text-gray-300 w-1/10">Heal</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-300 w-1/10">HPS</th>
            </tr>
          </thead>
          <tbody>
            {DUMMY_PLAYER_DATA.map((player) => {
              const dps = player.damageDealt / durationSec;
              const hps = player.healDealt / durationSec;
              const damagePercent = player.damageDealt / totalDamage;
              const relativePercent = player.damageDealt / maxDamage;

              return (
                <tr
                  key={player.actorId}
                  className="relative border-b border-gray-800/50 cursor-default hover:bg-gray-800/40"
                  style={{ height: `${100 / DUMMY_PLAYER_DATA.length}%` }}
                >
                  <td className="px-6 py-3 text-white font-medium relative">
                    <div className="flex items-center gap-2">
                      <Tooltip title={getClassTooltip(player.classId ?? undefined, player.classSpec ?? undefined)} placement="top">
                        <div className="w-6 h-6 relative rounded-full overflow-hidden">
                          <Image
                            src={`/images/classes/${getClassIconName(player.classId ?? undefined)}`}
                            alt={CLASS_MAP[player.classId ?? 0] ?? 'class'}
                            fill
                            style={{ objectFit: 'cover' }}
                          />
                        </div>
                      </Tooltip>
                      <div className="flex items-baseline">
                        <span className="mr-2">{player.name || "Unknown"}</span>
                        <span className="text-gray-400 text-xs">{formatNumber(player.abilityScore ?? 0)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">{(damagePercent * 100).toFixed(1)}%</td>
                  <td className="px-6 py-3 text-right">{formatNumber(player.damageDealt)}</td>
                  <td className="px-6 py-3 text-right">{formatNumber(Math.round(dps))}</td>
                  <td className="px-6 py-3 text-right">{formatNumber(player.healDealt)}</td>
                  <td className="px-6 py-3 text-right">{formatNumber(Math.round(hps))}</td>
                  {showGlow && (
                    <TableRowGlow
                      className={CLASS_MAP[player.classId ?? 0] ?? ''}
                      percentage={relativePercent * 100}
                    />
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
