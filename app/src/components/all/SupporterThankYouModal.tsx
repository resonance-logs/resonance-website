"use client";

import React, { useEffect, useCallback, useRef } from "react";
import confetti from "canvas-confetti";
import Link from "next/link";

interface SupporterThankYouModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupporterThankYouModal: React.FC<SupporterThankYouModalProps> = ({
  isOpen,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiInstanceRef = useRef<confetti.CreateTypes | null>(null);

  // Create confetti instance when canvas is available
  useEffect(() => {
    if (canvasRef.current && !confettiInstanceRef.current) {
      confettiInstanceRef.current = confetti.create(canvasRef.current, {
        resize: true,
        useWorker: true,
      });
    }
  }, [isOpen]);

  const fireConfetti = useCallback(() => {
    if (!confettiInstanceRef.current) return;

    const myConfetti = confettiInstanceRef.current;

    const colors = ["#9333ea", "#a855f7", "#d946ef", "#ec4899", "#f472b6", "#fbbf24"];

    // Fire confetti bursts from both sides near the modal
    const sideDefaults = {
      spread: 70,
      ticks: 150,
      gravity: 0.6,
      decay: 0.94,
      startVelocity: 35,
      colors,
    };

    const shootSides = () => {
      // Left side burst - close to modal
      myConfetti({
        ...sideDefaults,
        particleCount: 60,
        scalar: 1.3,
        origin: { x: 0.35, y: 0.5 },
        angle: 60,
      });

      // Right side burst - close to modal
      myConfetti({
        ...sideDefaults,
        particleCount: 60,
        scalar: 1.3,
        origin: { x: 0.65, y: 0.5 },
        angle: 120,
      });
    };

    // Fire bursts from sides
    shootSides();
    setTimeout(shootSides, 200);
    setTimeout(shootSides, 400);
  }, []);

  // Continuous confetti stream from top
  useEffect(() => {
    if (!isOpen || !confettiInstanceRef.current) return;

    const myConfetti = confettiInstanceRef.current;
    const colors = ["#9333ea", "#a855f7", "#d946ef", "#ec4899", "#f472b6", "#fbbf24"];
    let frameId: number;
    let startTime = Date.now();
    const duration = 3000; // Stream for 3 seconds

    const streamFromTop = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) return;

      // Random x position across the top
      const x = 0.2 + Math.random() * 0.6;

      myConfetti({
        particleCount: 3,
        angle: 90,
        spread: 30,
        startVelocity: 20,
        gravity: 0.4,
        ticks: 600,
        colors,
        origin: { x, y: 0 },
        scalar: 1.0,
      });

      frameId = requestAnimationFrame(streamFromTop);
    };

    // Start streaming after a short delay
    const timer = setTimeout(() => {
      startTime = Date.now();
      streamFromTop();
    }, 200);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frameId);
    };
  }, [isOpen]);

  // Initial burst effect
  useEffect(() => {
    if (isOpen) {
      // Small delay to let modal animate in and canvas to be ready
      const timer = setTimeout(fireConfetti, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, fireConfetti]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn" />

      {/* Confetti Canvas - above everything including modal */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-30 pointer-events-none"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-purple-500/30 bg-[rgba(5,7,16,0.98)] p-8 shadow-[0_25px_80px_rgba(147,51,234,0.25)] backdrop-blur-xl animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow effect */}
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 opacity-50 blur-xl -z-10" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </div>
            {/* Sparkles */}
            <div className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-pulse">
              ✨
            </div>
            <div className="absolute -bottom-1 -left-3 w-5 h-5 text-pink-400 animate-pulse delay-150">
              ✨
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-white mb-3">
          Thank You for Supporting
          <br />
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Resonance Logs!
          </span>
        </h2>

        {/* Message */}
        <p className="text-gray-300 text-center mb-6 leading-relaxed">
          As a thank you, you&apos;ve unlocked{" "}
          <span className="text-purple-300 font-semibold">
            customization features
          </span>{" "}
          for your profile!
        </p>

        {/* Features unlocked */}
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-purple-300 mb-2 flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Unlocked Features
          </h3>
          <ul className="text-sm text-gray-300 space-y-1.5">
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Custom encounter table themes
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Personalized leaderboard styling
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Custom name colors & tags
            </li>
          </ul>
        </div>

        {/* CTA Button */}
        <Link
          href="/profile"
          onClick={onClose}
          className="block w-full py-3 px-6 text-center rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/25 transition-all duration-200 hover:-translate-y-0.5"
        >
          View Customizations
        </Link>

        <p className="text-xs text-gray-500 text-center mt-4">
          You can access customizations anytime from your profile.
        </p>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .delay-150 {
          animation-delay: 150ms;
        }
      `}</style>
    </div>
  );
};
