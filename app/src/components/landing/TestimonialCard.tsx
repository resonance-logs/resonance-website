'use client';

import React from 'react';
import { GlassCard } from './GlassCard';

type TestimonialCardProps = {
  quote: string;
  author: string;
  role?: string;
  avatar?: string;
  rating?: number;
  className?: string;
};

export const TestimonialCard: React.FC<TestimonialCardProps> = ({
  quote,
  author,
  role,
  avatar,
  rating = 5,
  className = '',
}) => {
  return (
    <GlassCard className={`relative ${className}`}>
      {/* Rating stars */}
      <div className="flex gap-1 mb-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-sm ${
              i < rating 
                ? 'text-purple-400' 
                : 'text-gray-600'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-full h-full"
            >
              <path d="M12 2l3.09 6.26L22 9l-1 1-1 1 1v10l-1 1-1 1-6.91-6.26L12 2z" />
            </svg>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        {/* Avatar */}
        {avatar && (
          <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden">
            <img
              src={avatar}
              alt={author}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1">
          <blockquote className="text-gray-300 leading-relaxed mb-3 italic">
            "{quote}"
          </blockquote>
          
          <div className="flex flex-col">
            <cite className="text-white font-medium not-italic">
              {author}
            </cite>
            {role && (
              <span className="text-purple-400 text-sm">
                {role}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-4 right-4 w-8 h-8 opacity-10">
        <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500/20 to-transparent" />
      </div>
      
      <div className="absolute bottom-4 left-4 w-6 h-6 opacity-10">
        <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-500/20 to-transparent" />
      </div>
    </GlassCard>
  );
};