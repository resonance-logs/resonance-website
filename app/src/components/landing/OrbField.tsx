'use client';

import React, { useEffect, useRef } from 'react';

type Orb = {
  id: number;
  baseX: number;
  baseY: number;
  radius: number;
  hue: number;
  strength: number;
  driftPhase: number;
  wobblePhase: number;
};

const ORB_COUNT = 26;
const MAX_REPEL_DISTANCE = 260;
const MOUSE_INFLUENCE = 32;
const RETURN_EASE = 0.04;
const DRIFT_SPEED = 0.16;
const WOBBLE_SPEED = 0.28;

export const OrbField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const orbsRef = useRef<Orb[]>([]);
  const offsetRef = useRef<{ x: number; y: number }[]>([]);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const scrollYRef = useRef(0);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const createOrbs = () => {
      const created: Orb[] = [];
      const offsets: { x: number; y: number }[] = [];
      const width = window.innerWidth;
      const height = window.innerHeight;

      for (let i = 0; i < ORB_COUNT; i += 1) {
        const band = i / ORB_COUNT;

        created.push({
          id: i,
          baseX: Math.random() * width,
          baseY:
            Math.random() * height * (0.4 + band * 0.4) -
            40 +
            (band < 0.2 ? -40 : 0),
          radius: 80 + Math.random() * 170,
          hue: 160 + Math.random() * 40,
          strength: 0.04 + Math.random() * 0.18,
          driftPhase: Math.random() * Math.PI * 2,
          wobblePhase: Math.random() * Math.PI * 2,
        });

        offsets.push({ x: 0, y: 0 });
      }

      orbsRef.current = created;
      offsetRef.current = offsets;
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      createOrbs();
    };

    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseLeave = () => {
      mouseRef.current = null;
    };

    const handleScroll = () => {
      scrollYRef.current = window.scrollY;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('scroll', handleScroll, { passive: true });

    const render = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      ctx.clearRect(0, 0, width, height);

      const time = performance.now() / 1000;
      const mouse = mouseRef.current;
      const scrollY = scrollYRef.current;

      orbsRef.current.forEach((orb, index) => {
        const offset = offsetRef.current[index];

        // Organic drift + wobble (liquid feel)
        const drift =
          Math.sin(time * DRIFT_SPEED + orb.driftPhase) * 22 * orb.strength;
        const wobbleX =
          Math.cos(time * WOBBLE_SPEED + orb.wobblePhase) * 18 * orb.strength;
        const wobbleY =
          Math.sin(time * (WOBBLE_SPEED * 0.8) + orb.wobblePhase) *
          14 *
          orb.strength;

        // Scroll parallax
        const parallaxY =
          scrollY * (0.02 + (orb.id / ORB_COUNT) * 0.03) * orb.strength;

        // Mouse repel (water displacement)
        if (mouse) {
          const dx = mouse.x - orb.baseX;
          const dy = mouse.y - (orb.baseY + parallaxY);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          if (dist < MAX_REPEL_DISTANCE) {
            const force =
              ((MAX_REPEL_DISTANCE - dist) / MAX_REPEL_DISTANCE) *
              MOUSE_INFLUENCE *
              orb.strength;
            const normX = dx / dist;
            const normY = dy / dist;

            // Push away from cursor
            offset.x += -normX * force;
            offset.y += -normY * force;
          }
        }

        // Ease back toward origin when no mouse influence
        offset.x += (0 - offset.x) * RETURN_EASE;
        offset.y += (0 - offset.y) * RETURN_EASE;

        const x = orb.baseX + wobbleX + offset.x;
        const y = orb.baseY + drift + wobbleY + offset.y + parallaxY;

        // Soft, liquid gradient with Blue Protocol colors
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, orb.radius);
        const alphaBase = 0.02 + orb.strength * 0.4;
        const accentAlpha = alphaBase + 0.04;

        gradient.addColorStop(
          0,
          `rgba(147, 51, 234, ${accentAlpha.toFixed(3)})` // Blue Protocol purple accent
        );
        gradient.addColorStop(
          0.28,
          `rgba(${59 + orb.id * 3}, ${130 + orb.id * 2}, 246, ${
            alphaBase * 0.7
          })`
        );
        gradient.addColorStop(0.72, `rgba(30, 41, 59, ${alphaBase * 0.14})`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, orb.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-[-3] mix-blend-screen"
      style={{ filter: 'blur(0.2px)' }}
      aria-hidden="true"
    />
  );
};