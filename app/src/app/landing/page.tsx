'use client';

import React from 'react';
import { OrbField } from '@/components/landing/OrbField';
import { CursorGlow } from '@/components/landing/CursorGlow';
import { Background } from '@/components/landing/Background';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';

export default function LandingPage() {
  return (
    <div className="relative h-dvh overflow-hidden">
      {/* Background Effects */}
      <Background />
      <OrbField />
      <CursorGlow />

      {/* Page Sections */}
      <HeroSection />
      <FeaturesSection />
    </div>
  );
}