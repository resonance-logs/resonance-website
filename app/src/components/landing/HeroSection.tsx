'use client';

import React, { useEffect, useRef } from 'react';
import { GlassCard } from './GlassCard';
import { AnimatedCounter } from './AnimatedCounter';
import { StatCard } from './StatCard';
import { createDeterministicHeroParticle } from '../../utils/deterministicRandom';

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

  const scrollToFeatures = () => {
    const el = document.getElementById('features');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };


  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8" id="hero">
      <div className="max-w-7xl mx-auto w-full mb-20">
        {/* Section Label */}
        <div className="flex justify-center mb-8">
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
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                {' '}Stars{' '}
              </span>
              in Blue Protocol
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 leading-relaxed max-w-2xl">
              Track your encounters, analyze your performance, and dominate the cosmos with 
              comprehensive combat analytics designed specifically for Blue Protocol players.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
              <button
                onClick={scrollToFeatures}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25"
                data-interactive="true"
              >
                Explore Features
              </button>
            </div>

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
            <GlassCard className="relative overflow-hidden">
              {/* Interactive Halo Visualization */}
              <div className="relative h-96 flex items-center justify-center">
                <div className="halo-wrapper relative w-80 h-80">
                  {/* Orbiting rings */}
                  <div className="absolute inset-0 border border-purple-500/20 rounded-full animate-spin" style={{ animationDuration: '20s' }} />
                  <div className="absolute inset-4 border border-blue-500/20 rounded-full animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
                  
                  {/* Central halo */}
                  <div 
                    className="halo-ring absolute inset-8 border border-purple-400/30 rounded-full"
                    ref={haloRef}
                  >
                    {/* Orbiting nodes */}
                    <div className="absolute top-0 left-1/2 w-3 h-3 bg-purple-400 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    <div className="absolute bottom-0 left-1/2 w-3 h-3 bg-blue-400 rounded-full transform -translate-x-1/2 translate-y-1/2 animate-pulse" style={{ animationDelay: '0.5s' }} />
                    <div className="absolute left-0 top-1/2 w-3 h-3 bg-cyan-400 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-pulse" style={{ animationDelay: '1s' }} />
                    <div className="absolute right-0 top-1/2 w-3 h-3 bg-pink-400 rounded-full transform translate-x-1/2 -translate-y-1/2 animate-pulse" style={{ animationDelay: '1.5s' }} />
                  </div>
                  
                  {/* Core */}
                  <div className="absolute inset-1/2 w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
              </div>

              {/* Preview Stats */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/20 rounded-lg p-3 backdrop-blur-sm">
                    <div className="text-xs text-purple-300 mb-1">DPS</div>
                    <div className="text-lg font-bold text-white">
                      <AnimatedCounter end={2847} />
                    </div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-3 backdrop-blur-sm">
                    <div className="text-xs text-blue-300 mb-1">Accuracy</div>
                    <div className="text-lg font-bold text-white">
                      <AnimatedCounter end={94.2} suffix="%" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating particles */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {Array.from({ length: 12 }, (_, i) => {
                  const particle = createDeterministicHeroParticle(i, 12);
                  return (
                    <div
                      key={i}
                      className="absolute w-1 h-1 bg-purple-400/60 rounded-full animate-pulse"
                      style={{
                        left: `${particle.left}%`,
                        top: `${particle.top}%`,
                        animationDelay: `${particle.animationDelay}s`,
                        animationDuration: `${particle.animationDuration}s`
                      }}
                    />
                  );
                })}
              </div>
            </GlassCard>

            {/* Description */}
            <div className="mt-6 text-center text-gray-400 text-sm">
              Interactive combat visualization • Real-time performance tracking
            </div>
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