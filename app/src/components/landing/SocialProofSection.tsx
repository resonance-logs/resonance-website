'use client';

import React from 'react';
import { TestimonialCard } from './TestimonialCard';
import { StatCard } from './StatCard';
import { AnimatedCounter } from './AnimatedCounter';

const testimonials = [
  {
    quote: "Star Resonance completely transformed how I approach boss fights. The detailed analytics helped me identify weak points in my rotation and improve my DPS by 40%.",
    author: "LunaStar",
    role: "Level 75 Gunner",
    rating: 5
  },
  {
    quote: "The team performance tracking is incredible. We can now coordinate better and our raid clear times have improved dramatically. This tool is essential for serious players.",
    author: "CosmicRanger",
    role: "Guild Leader",
    rating: 5
  },
  {
    quote: "I love how the combat insights break down every skill usage. It's like having a personal coach analyzing my performance in real-time.",
    author: "VoidWalker",
    role: "Level 68 Mystic",
    rating: 5
  }
];

const communityStats = [
  {
    title: "Active Players",
    value: 50000,
    prefix: "",
    suffix: "+",
    description: "Players actively using Star Resonance",
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H16c-.8 0-1.54.37-2 1l-3 4v2h2v6h4z"/>
      </svg>
    ),
    trend: "up" as const
  },
  {
    title: "Encounters Tracked",
    value: 1000000,
    prefix: "",
    suffix: "+",
    description: "Combat encounters analyzed",
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
      </svg>
    ),
    trend: "up" as const
  },
  {
    title: "Average DPS Increase",
    value: 35,
    prefix: "",
    suffix: "%",
    description: "Improvement in player performance",
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M13 2.05v3.03c3.39.49 6 3.39 6 6.92 0 .9-.18 1.75-.48 2.54l2.6 1.53c.56-1.24.88-2.62.88-4.07 0-5.18-3.95-9.45-9-9.95zM12 19c-3.87 0-7-3.13-7-7 0-3.53 2.61-6.43 6-6.92V2.05c-5.06.5-9 4.76-9 9.95 0 5.52 4.47 10 9.99 10 3.31 0 6.24-1.61 8.06-4.09l-2.6-1.53C16.17 17.98 14.21 19 12 19z"/>
      </svg>
    ),
    trend: "up" as const
  }
];

export const SocialProofSection: React.FC = () => {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8" id="social-proof">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(5,7,18,0.98)] border border-purple-500/20 text-purple-400 text-xs font-medium tracking-wider uppercase mb-4">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            Community
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Trusted by
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              {' '}thousands{' '}
            </span>
            of players
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Join a growing community of Blue Protocol players who have transformed their gameplay 
            with our comprehensive analytics and insights.
          </p>
        </div>

        {/* Community Stats */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {communityStats.map((stat, index) => (
            <StatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              prefix={stat.prefix}
              suffix={stat.suffix}
              description={stat.description}
              icon={stat.icon}
              trend={stat.trend}
            />
          ))}
        </div>

        {/* Testimonials */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-white text-center mb-12">
            What players are saying
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard
                key={index}
                quote={testimonial.quote}
                author={testimonial.author}
                role={testimonial.role}
                rating={testimonial.rating}
              />
            ))}
          </div>
        </div>

        {/* Community Highlights */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-6">
              Join the elite players
            </h3>
            <p className="text-gray-300 mb-8 leading-relaxed">
              Whether you're a casual player looking to improve or a hardcore raider seeking 
              every advantage, Star Resonance provides the insights you need to excel in Blue Protocol.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-400" />
                <span className="text-gray-300">Real-time performance tracking</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-gray-300">Advanced combat analytics</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-gray-300">Team coordination tools</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-pink-400" />
                <span className="text-gray-300">Historical performance data</span>
              </div>
            </div>
          </div>

          {/* Right Column - Live Stats */}
          <div className="relative">
            <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl p-8 border border-purple-500/20">
              <h4 className="text-lg font-semibold text-white mb-6 text-center">
                Live Community Stats
              </h4>
              
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Players Online</span>
                  <span className="text-2xl font-bold text-purple-400">
                    <AnimatedCounter end={1247} />
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Encounters Today</span>
                  <span className="text-2xl font-bold text-blue-400">
                    <AnimatedCounter end={8934} />
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Boss Defeats</span>
                  <span className="text-2xl font-bold text-cyan-400">
                    <AnimatedCounter end={2156} />
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Average DPS</span>
                  <span className="text-2xl font-bold text-pink-400">
                    <AnimatedCounter end={2847} />
                  </span>
                </div>
              </div>

              {/* Animated background elements */}
              <div className="absolute top-4 right-4 w-16 h-16 bg-purple-500/10 rounded-full animate-pulse" />
              <div className="absolute bottom-4 left-4 w-12 h-12 bg-blue-500/10 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-4 px-6 py-3 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
            <div className="flex -space-x-2">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 border-2 border-gray-900"
                  style={{ zIndex: 8 - i }}
                />
              ))}
            </div>
            <span className="text-purple-300 font-medium">
              Ready to join the community?
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};