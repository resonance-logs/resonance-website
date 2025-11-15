'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

type NavDropdownItem = {
  href: string;
  label: string;
};

type NavDropdownProps = {
  label: string;
  defaultHref: string;
  items: NavDropdownItem[];
};

export const NavDropdown: React.FC<NavDropdownProps> = ({ label, defaultHref, items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div
      className="relative"
      ref={dropdownRef}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Main Button */}
      <div className="flex items-center gap-1 cursor-pointer group">
        <Link
          href={defaultHref}
          className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
        >
          {label}
        </Link>
        <svg
          className={`w-4 h-4 text-gray-300 group-hover:text-white transition-all duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 pt-2 w-48">
          <div className="relative rounded-lg bg-[rgba(10,12,28,0.95)] border border-purple-400/40 shadow-[0_0_32px_rgba(147,51,234,0.2),0_20px_80px_rgba(0,0,0,0.95)] backdrop-blur-2xl overflow-hidden">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(147,51,234,0.15),transparent_50%)] pointer-events-none" />

            {/* Menu Items */}
            <div className="relative py-1.5">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-purple-500/20 transition-all duration-150"
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
