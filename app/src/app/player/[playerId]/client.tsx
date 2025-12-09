"use client";

import { useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CharacterOverview } from "@/components/profile/CharacterOverview";
import { fetchPlayerById, GetPlayerByIdResponse } from "@/api/player/player";

export default function PlayerProfileClient() {
  const params = useParams<{ playerId?: string }>();
  const playerId = params?.playerId ?? "";

  const { data, isLoading, isError } = useQuery<GetPlayerByIdResponse>({
    queryKey: ["player-by-id", playerId],
    queryFn: () => fetchPlayerById(playerId),
    enabled: Boolean(playerId),
    retry: false,
    placeholderData: keepPreviousData,
  });

  const playerData = useMemo(() => (data ? [data] : []), [data]);

  const handleShare = useCallback(async (pid: number) => {
    if (typeof window === 'undefined' || !pid) return;
    const url = `${window.location.origin}/player/${pid}`;
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    }
  }, []);

  return (
    <CharacterOverview
      playerData={playerData}
      isLoading={isLoading}
      onShare={handleShare}
      emptyState={
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center text-gray-300">
          {isError ? 'Player not found. Try another search.' : 'Fetching player data...'}
        </div>
      }
    />
  );
}
