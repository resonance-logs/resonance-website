"use client";

import React, { useEffect, useRef, useMemo, useState } from 'react';
import { GlassCard } from './GlassCard';
import { AnimatedCounter } from './AnimatedCounter';
import { StatCard } from './StatCard';
import { Tooltip } from 'antd'
import TableRowGlow from "@/components/ui/TableRowGlow";
import Image from "next/image"
import { CLASS_MAP, getClassIconName, getClassTooltip, DUMMY_PLAYER_DATA } from "@/utils/classData";
import { formatNumber } from "@/utils/numberFormatter";

export const HeroSection: React.FC = () => {
  const haloRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

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


  return (
    <section className="relative h-[calc(100vh-64px)] box-border flex items-center justify-center px-4 sm:px-6 lg:px-8" id="hero">
      <div className="max-w-7xl mx-auto w-full mb-20">
        {/* Section Label */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(5,7,18,0.98)] border border-purple-500/20 text-purple-400 text-xs font-medium tracking-wider uppercase">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            Blue Protocol Star Resonance
          </div>
        </div>

        {/* Main Hero Content */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text Content */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Master the
              <span className="bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                {' '}Stars{' '}
              </span>
              in Blue Protocol
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 leading-relaxed max-w-2xl">
              Track your encounters, analyze your performance, and dominate the cosmos with 
              comprehensive combat analytics designed specifically for Blue Protocol players.
            </p>

            {/* Hero Stats */}
            <div className="grid grid-cols-3 gap-6 max-w-md mx-auto lg:mx-0">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  <AnimatedCounter end={50000} suffix="+" />
                </div>
                <div className="text-sm text-purple-300">Active Players</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  <AnimatedCounter end={1000000} suffix="+" />
                </div>
                <div className="text-sm text-purple-300">Encounters Tracked</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  <AnimatedCounter end={99.9} suffix="%" />
                </div>
                <div className="text-sm text-purple-300">Uptime</div>
              </div>
            </div>
          </div>

          {/* Right Column - Interactive Preview */}
          <div className="relative" ref={wrapperRef}>
            <GlassCard className="relative overflow-hidden" padding={false}>
                <AnimatedPreviewTable />
            </GlassCard>
          </div>
        </div>

        {/* Bottom Stats Cards */}
        <div className="mt-20 grid md:grid-cols-3 gap-6">
          <StatCard
            title="Encounters Tracked"
            value={150000}
            prefix=""
            suffix="+"
            description="Real-time combat data from active players"
            icon={
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
              </svg>
            }
            trend="up"
          />
          <StatCard
            title="Average DPS"
            value={2847}
            prefix=""
            suffix=""
            description="Across all tracked encounters and boss fights"
            icon={
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 2.05v3.03c3.39.49 6 3.39 6 6.92 0 .9-.18 1.75-.48 2.54l2.6 1.53c.56-1.24.88-2.62.88-4.07 0-5.18-3.95-9.45-9-9.95zM12 19c-3.87 0-7-3.13-7-7 0-3.53 2.61-6.43 6-6.92V2.05c-5.06.5-9 4.76-9 9.95 0 5.52 4.47 10 9.99 10 3.31 0 6.24-1.61 8.06-4.09l-2.6-1.53C16.17 17.98 14.21 19 12 19z"/>
              </svg>
            }
            trend="up"
          />
          <StatCard
            title="Player Retention"
            value={87.5}
            prefix=""
            suffix="%"
            description="Players who continue using Star Resonance"
            icon={
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H16c-.8 0-1.54.37-2 1l-3 4v2h2v6h4z"/>
              </svg>
            }
            trend="up"
          />
        </div>
      </div>
    </section>
  );
};


function AnimatedPreviewTable() {

  const durationSec = 120

  return (
    <div className="w-full overflow-hidden text-xs">
      <div className="w-full  overflow-hidden flex flex-col">
        <table className="w-full text-sm table-fixed ">
          <thead className="bg-gray-800/50">
            <tr className="border-b border-gray-800">
              <th className="text-left px-3 py-2 font-semibold text-gray-300 w-1/2">Name</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-300 w-1/10">D%</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-300 w-1/10">DMG</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-300 w-1/10">DPS</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-300 w-1/10">Heal</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-300 w-1/10">HPS</th>
            </tr>
          </thead>
          <tbody className="">
            {DUMMY_PLAYER_DATA.map((player, idx) => {
              const dps = (player.damageDealt ?? 0) / durationSec;
              const hps = (player.healDealt ?? 0) / durationSec;
              const damagePercent = player.damageDealt / DUMMY_PLAYER_DATA.reduce((sum, y) => sum + y.damageDealt, 0);
              const relativePercent = player.damageDealt / Math.max(...DUMMY_PLAYER_DATA.map(x => x.damageDealt))

              return (
                <tr key={player.actorId} role="button" tabIndex={0} className={`relative border-b border-gray-800/50 cursor-default hover:bg-gray-800/40`} style={{ height: `${100 / DUMMY_PLAYER_DATA.length}%` }}> 
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
                  <td className="px-6 py-3 text-right">{damagePercent.toFixed(1)}%</td>
                  <td className="px-6 py-3 text-right">{formatNumber(player.damageDealt ?? 0)}</td>
                  <td className="px-6 py-3 text-right">{formatNumber(Math.round(dps))}</td>
                  <td className="px-6 py-3 text-right">{formatNumber(player.healDealt ?? 0)}</td>
                  <td className="px-6 py-3 text-right">{formatNumber(Math.round(hps))}</td>
                  <TableRowGlow className={CLASS_MAP[player.classId ?? 0] ?? ''} percentage={relativePercent*100}/>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}