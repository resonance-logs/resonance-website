"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { fetchDetailedPlayerData, GetDetailedPlayerDataResponse } from "@/api/player/player";
import { CharacterOverview } from '@/components/profile/CharacterOverview';

export default function ProfileDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/get-started');
    }
  }, [user, authLoading, router]);

  const { data: playerDataResponse, isLoading: isPlayerLoading } = useQuery<GetDetailedPlayerDataResponse>({
    queryKey: ["detailedPlayerData", user?.id],
    queryFn: () => fetchDetailedPlayerData(user!.id),
    enabled: !!user,
  });

  const playerData = playerDataResponse?.playerData ?? [];

  const handleShare = useCallback(async (playerId: number) => {
    if (typeof window === 'undefined' || !playerId) return;
    const url = `${window.location.origin}/player/${playerId}`;
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    }
  }, []);

  return (
    <CharacterOverview
      playerData={playerData}
      isLoading={isPlayerLoading}
      onShare={handleShare}
      emptyState={
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center text-gray-300">
          Link your characters to see their detailed profiles.
        </div>
      }
    />
  );
}
