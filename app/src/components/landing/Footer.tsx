'use client';

import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <footer className="relative bg-[rgba(5,7,22,0.98)] border-t border-purple-500/20">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="md:col-span-2">
            <Link
              href="/landing"
              className="flex items-center gap-3 text-white hover:text-purple-400 transition-colors mb-4"
              onClick={() => scrollToSection('hero')}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <div className="w-5 h-5 rounded bg-white/90" />
              </div>
              <span className="font-bold text-2xl">Star Resonance</span>
            </Link>
            
            <p className="text-gray-300 mb-6 max-w-md leading-relaxed">
              The ultimate analytics platform for Blue Protocol players. Track encounters, 
              analyze performance, and dominate the cosmos with comprehensive combat insights.
            </p>
            
            <div className="flex items-center gap-4">
              <a
                href="https://discord.gg/starresonance"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 hover:text-purple-300 transition-all duration-300 flex items-center justify-center"
                aria-label="Join our Discord"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a2.662 2.662 0 0 0 5.324 2.662 2.662 0 0 5.324-2.662c0-1.455.345-2.662-2.662-2.662 0-1.312.345-2.662-2.662-2.662zm-3.187 0c-1.813 0-3.187 0-3.187 0 1.813 3.187 3.187 0 1.813-3.187zm1.687 6.562l-8.312 8.312c-2.433 0-4.375-2.433-4.375 0-2.433 4.375-2.433 4.375 0 2.433-4.375 2.433zm0 13.5c-3.038 0-5.5-5.5-5.5 0-3.038 5.5-5.5 5.5 0 3.038-5.5 5.5zm1.375 1.75h-2.75v13.5c0 .966.782 1.75 1.75h2.75v-13.5z" />
                </svg>
              </a>
              
              <a
                href="https://twitter.com/starresonance"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300 transition-all duration-300 flex items-center justify-center"
                aria-label="Follow us on Twitter"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
                </svg>
              </a>
              
              <a
                href="https://github.com/starresonance"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 hover:text-gray-300 transition-all duration-300 flex items-center justify-center"
                aria-label="View our GitHub"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => scrollToSection('features')}
                  className="text-gray-300 hover:text-purple-400 transition-colors"
                >
                  Features
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('social-proof')}
                  className="text-gray-300 hover:text-purple-400 transition-colors"
                >
                  Community
                </button>
              </li>
              <li>
                <a href="/pricing" className="text-gray-300 hover:text-purple-400 transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="/roadmap" className="text-gray-300 hover:text-purple-400 transition-colors">
                  Roadmap
                </a>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-3">
              <li>
                <a href="/docs" className="text-gray-300 hover:text-purple-400 transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="/help" className="text-gray-300 hover:text-purple-400 transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="/contact" className="text-gray-300 hover:text-purple-400 transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="/status" className="text-gray-300 hover:text-purple-400 transition-colors">
                  System Status
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-purple-500/20 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Copyright */}
            <div className="text-gray-400 text-sm">
              © {currentYear} Star Resonance. All rights reserved.
            </div>

            {/* Legal Links */}
            <div className="flex items-center gap-6 text-sm">
              <a href="/privacy" className="text-gray-400 hover:text-purple-400 transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="text-gray-400 hover:text-purple-400 transition-colors">
                Terms of Service
              </a>
              <a href="/cookies" className="text-gray-400 hover:text-purple-400 transition-colors">
                Cookie Policy
              </a>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-xs max-w-2xl mx-auto">
              Star Resonance is not affiliated with Bandai Namco Entertainment Inc. or Blue Protocol. 
              All game-related content is for informational and analytical purposes only. 
              Blue Protocol is a trademark of Bandai Namco Entertainment Inc.
            </p>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl" />
    </footer>
  );
};