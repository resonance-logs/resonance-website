'use client';

import React from 'react';
import { createDeterministicParticle } from '../../utils/deterministicRandom';

export const Background: React.FC = () => {
  // Pre-generate deterministic particle data to ensure SSR consistency
  const particles = Array.from({ length: 20 }, (_, i) => createDeterministicParticle(i, 20));

  return (
    <div className="fixed inset-0 -z-10">
      {/* Primary gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at top, #050814 0%, #02030a 55%, #000 100%)'
        }}
      />
      
      {/* Animated gradient overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(circle at 20% 80%, rgba(147, 51, 234, 0.1) 0%, transparent 50%)',
        }}
      />
      
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(147, 51, 234, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(147, 51, 234, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((particle, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-purple-500/10 animate-pulse"
            style={{
              width: `${particle.width}px`,
              height: `${particle.height}px`,
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              animationDelay: `${particle.animationDelay}s`,
              animationDuration: `${particle.animationDuration}s`
            }}
          />
        ))}
      </div>
      
      {/* Vignette effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 0%, rgba(2, 3, 10, 0.4) 100%)'
        }}
      />
    </div>
  );
};