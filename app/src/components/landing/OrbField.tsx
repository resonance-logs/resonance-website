"use client";

import React, { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  z: number; // depth factor: 0.2..1
  size: number;
  twinkle: number; // phase offset
  hue: number;
};

const BASE_DENSITY = 0.0006; // stars per px
const MIN_STARS = 160;
const MAX_STARS = 1200;

export const OrbField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const starsRef = useRef<Star[]>([]);
  const animRef = useRef<number | null>(null);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    let width = 0;
    let height = 0;
    let mouseX = 0;
    let mouseY = 0;
    let lastTimestamp = 0;

    const createStars = () => {
      const area = width * height;
      const count = Math.max(
        MIN_STARS,
        Math.min(MAX_STARS, Math.floor(area * BASE_DENSITY))
      );

      const stars: Star[] = new Array(count).fill(0).map(() => {
        const z = 0.25 + Math.random() * 0.75;
        const size = (1 - z) * (0.6 + Math.random() * 1.8);
        const hueRand = Math.random();
        const hue = hueRand < 0.08 ? 45 : hueRand < 0.30 ? 210 : 255; // subtle warm/blue mix
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          z,
          size,
          twinkle: Math.random() * Math.PI * 2,
          hue,
        };
      });

      starsRef.current = stars;
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = Math.max(1, Math.floor(window.innerWidth));
      height = Math.max(1, Math.floor(window.innerHeight));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      createStars();
    };

    const onPointerMove = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
    };
    const onPointerLeave = () => {
      pointerRef.current = null;
    };

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const drawBackground = (t: number) => {
      // background gradient (deep space)
      const g = ctx.createLinearGradient(0, 0, 0, height);
      g.addColorStop(0, "#05030a");
      g.addColorStop(0.45, "#0b1220");
      g.addColorStop(1, "#081023");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);

      // layered slow-moving nebulae (soft radial gradients)
      const nebulaCount = 3;
      for (let i = 0; i < nebulaCount; i++) {
        const cx = (Math.sin(t * 0.0003 * (i + 1) + i) * 0.5 + 0.5) * width;
        const cy = (Math.cos(t * 0.00025 * (i + 1) + i) * 0.5 + 0.5) * height * 0.7;
        const r = Math.max(width, height) * (0.35 + i * 0.12);
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        if (i === 0) {
          grad.addColorStop(0, "rgba(90,40,160,0.14)");
          grad.addColorStop(0.25, "rgba(95,130,255,0.055)");
          grad.addColorStop(1, "rgba(5,6,10,0)");
        } else if (i === 1) {
          grad.addColorStop(0, "rgba(20,100,160,0.08)");
          grad.addColorStop(0.3, "rgba(5,20,80,0.02)");
          grad.addColorStop(1, "rgba(0,0,0,0)");
        } else {
          grad.addColorStop(0, "rgba(255,180,120,0.03)");
          grad.addColorStop(0.25, "rgba(40,30,80,0.01)");
          grad.addColorStop(1, "rgba(0,0,0,0)");
        }
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
    };

    const render = (timestamp: number) => {
      if (!lastTimestamp) lastTimestamp = timestamp;
      lastTimestamp = timestamp;

      const t = performance.now();

      // smooth mouse/pointer coords
      const target = pointerRef.current ?? mouseRef.current;
      if (target) {
        mouseX += (target.x - mouseX) * 0.08;
        mouseY += (target.y - mouseY) * 0.08;
      } else {
        mouseX += (width / 2 - mouseX) * 0.03;
        mouseY += (height / 2 - mouseY) * 0.03;
      }

      drawBackground(t);

      // draw stars
      const stars = starsRef.current;

      // small additive glow for subtle atmosphere
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const depthOffsetX = ((mouseX - width / 2) / width) * (1 - s.z) * 40;
        const depthOffsetY = ((mouseY - height / 2) / height) * (1 - s.z) * 24;
        const x = s.x + depthOffsetX;
        const y = s.y + depthOffsetY;

        // twinkle alpha
        const tw = 0.6 + Math.sin(t * 0.006 + s.twinkle) * 0.4;

        // hue and subtle color shift
        const hue = s.hue;
        const bright = 0.7 + (1 - s.z) * 0.5;

        // small core
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${(0.6 * tw * bright).toFixed(3)})`;
        ctx.arc(x, y, s.size * 0.9, 0, Math.PI * 2);
        ctx.fill();

        // outer colored glow
        const glow = ctx.createRadialGradient(x, y, 0, x, y, s.size * 6);
        glow.addColorStop(0, `rgba(${hue === 45 ? '255,210,150' : '180,200,255'},${(0.08 * tw).toFixed(3)})`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, s.size * 6, 0, Math.PI * 2);
        ctx.fill();

        // occasional small streak for brighter stars
        if (s.size > 1.6 && Math.random() > 0.996) {
          ctx.strokeStyle = `rgba(255,255,255,${(0.06 * tw).toFixed(3)})`;
          ctx.lineWidth = Math.min(1.6, s.size * 0.6);
          ctx.beginPath();
          ctx.moveTo(x - s.size * 2, y - s.size * 0.5);
          ctx.lineTo(x + s.size * 2, y + s.size * 0.5);
          ctx.stroke();
        }
      }

      animRef.current = requestAnimationFrame(render);
    };

    const onVisibility = () => {
      if (document.hidden) {
        if (animRef.current) cancelAnimationFrame(animRef.current);
        animRef.current = null;
      } else {
        if (!animRef.current) animRef.current = requestAnimationFrame(render);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("visibilitychange", onVisibility);

    animRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("visibilitychange", onVisibility);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 w-full h-full pointer-events-none -z-10"
      style={{
        willChange: "transform, opacity",
        mixBlendMode: "screen",
      }}
    />
  );
};