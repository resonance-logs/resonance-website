'use client';

import React from 'react';
import { GlassCard } from './GlassCard';
import { AnimatedCounter } from './AnimatedCounter';

type StatCardProps = {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  description?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  prefix = '',
  suffix = '',
  description,
  icon,
  trend = 'neutral',
  className = '',
}) => {
  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-gray-400'
  };

  return (
    <GlassCard className={`relative overflow-hidden ${className}`}>
      {/* Trend indicator */}
      {trend !== 'neutral' && (
        <div className={`absolute top-4 right-4 text-sm font-medium ${trendColors[trend]}`}>
          {trend === 'up' && '↑'}
          {trend === 'down' && '↓'}
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Icon */}
        {icon && (
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
            {icon}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-2xl font-bold text-white mb-1">
            <AnimatedCounter 
              end={value} 
              prefix={prefix}
              suffix={suffix}
              className="text-2xl font-bold"
            />
          </div>
          <div className="text-sm font-medium text-purple-300 mb-1">
            {title}
          </div>
          {description && (
            <div className="text-xs text-gray-400 leading-relaxed">
              {description}
            </div>
          )}
        </div>
      </div>

      {/* Animated background pulse */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent opacity-50" />
    </GlassCard>
  );
};