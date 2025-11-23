'use client';

import React from 'react';
import { useBackground } from '@/context/BackgroundContext';

export const Background: React.FC = () => {
  const { enabled } = useBackground();

  if (enabled) return null; // OrbField handles the background when enabled

  // Lighter background when OrbField is disabled
  return (
    <div className="fixed inset-0 -z-10">
      {/* Lighter gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at top, #0a0f1e 0%, #050814 55%, #020408 100%)'
        }}
      />

      {/* Subtle animated gradient overlay */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: 'radial-gradient(circle at 30% 70%, rgba(147, 51, 234, 0.15) 0%, transparent 50%)',
        }}
      />

      {/* Very subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(147, 51, 234, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(147, 51, 234, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Light vignette effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 0%, rgba(2, 4, 8, 0.5) 100%)'
        }}
      />
    </div>
  );
};
