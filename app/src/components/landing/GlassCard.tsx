'use client';

import React, { ReactNode, ElementType } from 'react';

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  glow?: 'accent' | 'blue' | 'none';
  padding?: boolean;
  as?: ElementType;
};

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  glow = 'none',
  padding = true,
  as: Tag = 'div',
}) => {
  const glowClasses = {
    accent: 'shadow-[0_0_18px_rgba(147,51,234,0.06),shadow-[0_10px_45px_rgba(0,0,0,0.82)]',
    blue: 'shadow-[0_0_18px_rgba(59,130,246,0.06),shadow-[0_10px_45px_rgba(0,0,0,0.82)]',
    none: 'shadow-[0_10px_45px_rgba(0,0,0,0.82)]'
  };

  return (
    <Tag
      className={`
        relative ${padding ? 'p-4 pb-3.5' : ''} rounded-xl
        bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.012),transparent)_border-box]
        bg-[rgba(5,7,16,0.98)]
        border border-purple-500/20
        ${glowClasses[glow]}
        backdrop-blur-lg saturate-130
        overflow-hidden
        transition-all duration-220 ease-out
        hover:-translate-y-0.5
        hover:shadow-[0_18px_70px_rgba(0,0,0,0.88)]
        hover:border-purple-400/30
        hover:bg-[rgba(5,7,14,0.98)]
        before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_0_0,rgba(147,51,234,0.09),transparent_55%)]
        before:opacity-0 before:pointer-events-none before:transition-opacity before:transform before:duration-220 before:ease-out
        hover:before:opacity-100 hover:before:translate-x-1 hover:before:-translate-y-1
        ${className}
      `}
    >
      {children}
    </Tag>
  );
};