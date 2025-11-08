'use client';

import React, { useState } from 'react';
import { GlassCard } from './GlassCard';
import { AnimatedCounter } from './AnimatedCounter';

export const CTASection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement email submission
    console.log('Email submitted:', email);
    setIsSubmitted(true);
    setTimeout(() => setIsSubmitted(false), 3000);
  };

  const handleDiscordSignIn = () => {
    // TODO: Implement Discord OAuth integration
    console.log('Discord sign in clicked');
  };

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8" id="cta">
      <div className="max-w-4xl mx-auto">
        {/* Main CTA Card */}
        <GlassCard className="relative overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-cyan-500/10" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />

          <div className="relative z-10 text-center">
            {/* Section Label */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(5,7,18,0.98)] border border-purple-500/20 text-purple-400 text-xs font-medium tracking-wider uppercase mb-6">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              Get Started
            </div>

            {/* Main Heading */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              Ready to
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                {' '}dominate{' '}
              </span>
              Blue Protocol?
            </h2>

            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Join thousands of players who have already transformed their gameplay with Star Resonance. 
              Start your journey to becoming a cosmic legend today.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button
                onClick={handleDiscordSignIn}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-3"
                data-interactive="true"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a2.662 2.662 0 0 0 5.324 2.662 2.662 0 0 5.324-2.662c0-1.455.345-2.662-2.662-2.662 0-1.312.345-2.662-2.662-2.662zm-3.187 0c-1.813 0-3.187 0-3.187 0 1.813 3.187 3.187 0 1.813-3.187zm1.687 6.562l-8.312 8.312c-2.433 0-4.375-2.433-4.375 0-2.433 4.375-2.433 4.375 0 2.433-4.375 2.433zm0 13.5c-3.038 0-5.5-5.5-5.5 0-3.038 5.5-5.5 5.5 0 3.038-5.5 5.5zm1.375 1.75h-2.75v13.5c0 .966.782 1.75 1.75h2.75v-13.5z" />
                </svg>
                Sign in with Discord
              </button>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-transparent border-2 border-purple-500/30 text-purple-300 font-semibold rounded-xl hover:border-purple-400 hover:bg-purple-500/10 transition-all duration-300"
                data-interactive="true"
              >
                Learn More
              </button>
            </div>

            {/* Email Signup */}
            <div className="max-w-md mx-auto mb-8">
              <form onSubmit={handleSubmit} className="flex gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email for updates"
                  className="flex-1 px-4 py-3 bg-black/20 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmitted}
                  className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitted ? '✓' : 'Notify Me'}
                </button>
              </form>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span>Free to start</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-400" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Bottom Stats */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">
              <AnimatedCounter end={50000} suffix="+" />
            </div>
            <div className="text-purple-300 font-medium">Players Ready</div>
            <div className="text-gray-400 text-sm">Join the community today</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">
              <AnimatedCounter end={1000000} suffix="+" />
            </div>
            <div className="text-blue-300 font-medium">Encounters Tracked</div>
            <div className="text-gray-400 text-sm">Real combat data</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">
              <AnimatedCounter end={99.9} suffix="%" />
            </div>
            <div className="text-cyan-300 font-medium">Uptime</div>
            <div className="text-gray-400 text-sm">Reliable service</div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-4 px-6 py-3 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
            <div className="flex -space-x-2">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 border-2 border-gray-900"
                  style={{ zIndex: 6 - i }}
                />
              ))}
            </div>
            <span className="text-purple-300 font-medium">
              Don't miss out - Start your journey now
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};