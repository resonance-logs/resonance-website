'use client';

import React from 'react';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';

export default function LandingPage() {
  return (
    <div className="relative h-[calc(100vh-64px)] overflow-hidden">
      {/* Background Effects */}
      {/* Page Sections */}
      <HeroSection />
      <FeaturesSection />
    </div>
  );
}