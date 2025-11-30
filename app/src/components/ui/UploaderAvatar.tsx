'use client';

import Image from 'next/image';
import { User } from '@/types/commonTypes';

interface UploaderAvatarProps {
  user: User | null | undefined;
  size?: number;
  className?: string;
}

/**
 * Determines if a user should be displayed as anonymous
 */
export function isAnonymousUser(user: User | null | undefined): boolean {
  if (!user) return true;
  return user.discord_username === 'Anonymous';
}

/**
 * Gets the display name for an uploader
 */
export function getUploaderName(user: User | null | undefined, fallback: string = 'Fireteam'): string {
  if (!user) return fallback;
  if (isAnonymousUser(user)) return 'Anonymous';
  return user.discord_global_name ?? user.discord_username ?? fallback;
}

/**
 * Gets the avatar URL for an uploader, or undefined if anonymous
 */
export function getUploaderAvatarUrl(user: User | null | undefined): string | undefined {
  if (!user || isAnonymousUser(user)) return undefined;
  return user.discord_avatar_url ?? undefined;
}

/**
 * Anonymous avatar SVG component
 */
function AnonymousSvg({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-gray-400"
    >
      <circle cx="12" cy="8" r="4" fill="currentColor" opacity="0.6" />
      <path
        d="M4 20c0-4 4-6 8-6s8 2 8 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3" />
    </svg>
  );
}

/**
 * Reusable uploader avatar component that handles anonymous users
 */
export function UploaderAvatar({ user, size = 40, className = '' }: UploaderAvatarProps) {
  const isAnonymous = isAnonymousUser(user);
  const avatarUrl = getUploaderAvatarUrl(user);
  const displayName = getUploaderName(user);
  const initial = displayName.charAt(0).toUpperCase();

  if (isAnonymous) {
    return (
      <div
        className={`relative overflow-hidden rounded-full border-2 border-gray-600/50 bg-gray-800/80 flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
        title="Anonymous"
      >
        <AnonymousSvg size={Math.round(size * 0.65)} />
      </div>
    );
  }

  if (avatarUrl) {
    return (
      <div
        className={`relative overflow-hidden rounded-full border-2 border-gray-700/80 bg-white/5 flex items-center justify-center shadow-md ${className}`}
        style={{ width: size, height: size }}
      >
        <Image src={avatarUrl} alt={displayName} fill sizes={`${size}px`} className="object-cover" />
      </div>
    );
  }

  // Fallback to initial letter
  return (
    <div
      className={`relative overflow-hidden rounded-full border-2 border-gray-700/80 bg-linear-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold shadow-md ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initial}
    </div>
  );
}

export default UploaderAvatar;
