'use client';

import React, { useEffect, useRef } from 'react';

export const CursorGlow: React.FC = () => {
  const glowRef = useRef<HTMLDivElement | null>(null);
  const pulseRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number>();
  const target = useRef({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
  });
  const current = useRef({ x: target.current.x, y: target.current.y });
  const visibleRef = useRef(false);

  useEffect(() => {
    const glow = glowRef.current;
    const pulse = pulseRef.current;
    if (!glow || !pulse) return;

    const handleMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
    };

    const handleOver = (e: MouseEvent) => {
      const targetEl = e.target as HTMLElement | null;
      if (!targetEl) return;
      if (targetEl.closest('a, button, [data-interactive="true"]')) {
        visibleRef.current = true;
      } else {
        visibleRef.current = false;
      }
    };

    const handleLeave = () => {
      visibleRef.current = false;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseover', handleOver);
    window.addEventListener('mouseout', handleLeave);

    const animate = () => {
      const ease = 0.18;
      current.current.x += (target.current.x - current.current.x) * ease;
      current.current.y += (target.current.y - current.current.y) * ease;

      const scale = visibleRef.current ? 1 : 0;
      const opacity = visibleRef.current ? 0.22 : 0;

      const transform = `translate3d(${current.current.x}px, ${current.current.y}px, 0) scale(${scale})`;
      glow.style.transform = transform;
      glow.style.opacity = `${opacity}`;

      // Pulse is a subtle, slightly larger echo when visible
      pulse.style.transform = `translate3d(${current.current.x}px, ${current.current.y}px, 0) scale(${scale})`;

      rafRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseover', handleOver);
      window.removeEventListener('mouseout', handleLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      <div 
        ref={glowRef} 
        className="fixed pointer-events-none rounded-full mix-blend-screen z-[-1] transition-opacity duration-250 ease-out"
        style={{
          width: '120px',
          height: '120px',
          marginLeft: '-60px',
          marginTop: '-60px',
          background: 'radial-gradient(circle, rgba(147, 51, 234, 0.56), transparent 72%)',
          filter: 'blur(0.3px)'
        }}
        aria-hidden="true" 
      />
      <div 
        ref={pulseRef} 
        className="fixed pointer-events-none rounded-full mix-blend-screen z-[-1]"
        style={{
          width: '180px',
          height: '180px',
          marginLeft: '-90px',
          marginTop: '-90px',
          background: 'radial-gradient(circle, rgba(147, 51, 234, 0.14), transparent 80%)',
          opacity: 0,
          animation: 'cursor-pulse-breathe 2.8s ease-in-out infinite'
        }}
        aria-hidden="true" 
      />
      <style jsx>{`
        @keyframes cursor-pulse-breathe {
          0%, 100% {
            transform: scale(0.96);
            opacity: 0;
          }
          40% {
            transform: scale(1.02);
            opacity: 0.12;
          }
          70% {
            transform: scale(1.06);
            opacity: 0.06;
          }
        }
      `}</style>
    </>
  );
};