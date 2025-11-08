'use client';

import React, { useState, useEffect } from 'react';

type AccentColor = {
  name: string;
  value: string;
  gradient: string;
};

const accentColors: AccentColor[] = [
  {
    name: 'Purple',
    value: '#9333EA',
    gradient: 'linear-gradient(135deg, #9333EA 0%, #7C3AED 100%)'
  },
  {
    name: 'Blue',
    value: '#3B82F6',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
  },
  {
    name: 'Cyan',
    value: '#06B6D4',
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)'
  },
  {
    name: 'Pink',
    value: '#EC4899',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)'
  }
];

type AccentPickerProps = {
  onAccentChange?: (color: AccentColor) => void;
  className?: string;
};

export const AccentPicker: React.FC<AccentPickerProps> = ({
  onAccentChange,
  className = '',
}) => {
  const [selectedAccent, setSelectedAccent] = useState<AccentColor>(accentColors[0]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Load saved accent from localStorage (or apply default)
    const savedAccent = localStorage.getItem('resonance-accent');
    if (savedAccent) {
      const accent = accentColors.find(c => c.value === savedAccent);
      if (accent) {
        setSelectedAccent(accent);
        applyAccent(accent.value);
        return;
      }
    }

    // No saved accent found — apply the initial default
    applyAccent(selectedAccent.value);
  }, []);

  const applyAccent = (color: string) => {
    const root = document.documentElement;
    // Set the site's accent variable (globals.css expects --accent)
    root.style.setProperty('--accent', color);

    // Generate simple lighter/darker variants and ensure the values are valid hex strings (#rrggbb)
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    const lightR = Math.min(r + 40, 255);
    const lightG = Math.min(g + 40, 255);
    const lightB = Math.min(b + 40, 255);

    const darkR = Math.max(r - 20, 0);
    const darkG = Math.max(g - 20, 0);
    const darkB = Math.max(b - 20, 0);

    const toHex = (n: number) => `#${n.toString(16).padStart(2, '0')}`;

    root.style.setProperty('--accent-light', `${toHex(lightR)}${toHex(lightG).slice(1)}${toHex(lightB).slice(1)}`);
    root.style.setProperty('--accent-dark', `${toHex(darkR)}${toHex(darkG).slice(1)}${toHex(darkB).slice(1)}`);
  };

  const handleAccentSelect = (accent: AccentColor) => {
    setSelectedAccent(accent);
    applyAccent(accent.value);
    localStorage.setItem('resonance-accent', accent.value);
    onAccentChange?.(accent);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        className="w-8 h-8 rounded-full border-2 border-current overflow-hidden transition-transform hover:scale-110"
        style={{ borderColor: selectedAccent.value }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select accent color"
      >
        <div
          className="w-full h-full rounded-full"
          style={{ background: selectedAccent.gradient }}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-[rgba(5,7,22,0.98)] border border-purple-500/20 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.95)] backdrop-blur-lg z-50 min-w-[140px]">
          <div className="p-2">
            <div className="text-xs font-medium text-purple-300 mb-2 px-2">
              Theme Color
            </div>
            <div className="space-y-1">
              {accentColors.map((accent) => (
                <button
                  key={accent.name}
                  type="button"
                  className={`
                    w-full px-3 py-2 rounded-md text-sm font-medium transition-all
                    flex items-center gap-2
                    ${selectedAccent.value === accent.value
                      ? 'bg-purple-500/20 text-white border-purple-400'
                      : 'bg-transparent text-gray-300 border-transparent hover:bg-purple-500/10 hover:text-white'
                    }
                  `}
                  onClick={() => handleAccentSelect(accent)}
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ background: accent.gradient }}
                  />
                  <span>{accent.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};