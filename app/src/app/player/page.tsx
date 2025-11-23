"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Draft, produce } from "immer";
import { suggestPlayers, SuggestPlayersResponse } from "@/api/player/player";
import type { PlayerSuggestion } from "@/types/commonTypes";
import { GlassCard } from "@/components/landing/GlassCard";
import { Input } from "@/components/ui/input";
import { Loader2, Search, UserRound } from "lucide-react";

function useImmerState<T>(initialValue: T): [T, (updater: (draft: Draft<T>) => void) => void] {
  const [state, setState] = useState(initialValue);
  const updateState = useCallback((updater: (draft: Draft<T>) => void) => {
    setState((current) => produce(current, updater));
  }, []);
  return [state, updateState];
}

export default function PlayerSearchPage() {
  const router = useRouter();
  const [searchState, updateSearchState] = useImmerState({ search: "" });
  const searchTerm = searchState.search.trim();

  const { data: suggestionsResponse, isFetching } = useQuery<SuggestPlayersResponse>({
    queryKey: ["player-suggestions", searchTerm],
    queryFn: () => suggestPlayers({ search: searchTerm }),
    enabled: searchTerm.length >= 3,
    staleTime: 30_000,
  });

  const suggestions = useMemo(() => suggestionsResponse?.players ?? [], [suggestionsResponse]);

  const goToPlayer = useCallback((playerId: number) => {
    router.push(`/player/${playerId}`);
  }, [router]);

  const handleSubmit = useCallback((event: FormEvent) => {
    event.preventDefault();
    if (suggestions.length > 0) {
      goToPlayer(suggestions[0].playerId);
    }
  }, [suggestions, goToPlayer]);

  const handleSuggestionClick = useCallback((player: PlayerSuggestion) => {
    goToPlayer(player.playerId);
  }, [goToPlayer]);

  return (
    <div className="max-w-4xl mx-auto py-24 px-6 text-white">
      <div className="text-center space-y-4 mb-12">
        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-purple-500/10 border border-purple-500/20">
          <Search className="h-4 w-4 text-purple-300" />
          <span className="text-xs uppercase tracking-[0.35em] text-purple-200">Player Search</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold">Find Any Resonance Player</h1>
        <p className="text-base text-gray-300">
          Type at least 3 characters to see live suggestions. Press enter to open the first match or click a player to view their public profile.
        </p>
      </div>

      <GlassCard className="border border-purple-500/20 p-8 space-y-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label htmlFor="player-search" className="text-sm uppercase tracking-[0.35em] text-purple-200">
            Search by player name
          </label>
          <div className="relative">
            <Input
              id="player-search"
              value={searchState.search}
              onChange={(event) => updateSearchState((draft) => { draft.search = event.target.value; })}
              placeholder="e.g. Nova, Celestine, Atlas"
              className="bg-black/40 border-purple-500/40 text-white placeholder:text-gray-500 pr-12"
              autoComplete="off"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300">
              {isFetching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
            </span>
          </div>
        </form>

        <div className="space-y-3">
          {searchTerm.length < 3 && (
            <p className="text-sm text-gray-400">Enter at least 3 characters to see suggestions.</p>
          )}
          {searchTerm.length >= 3 && suggestions.length === 0 && !isFetching && (
            <p className="text-sm text-gray-400">No players found. Try a different name.</p>
          )}
          <div className="space-y-3">
            {suggestions.map((player) => (
              <button
                key={player.playerId}
                type="button"
                onClick={() => handleSuggestionClick(player)}
                className="flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:border-purple-400/50 transition"
              >
                {player.profileUrl ? (
                  <div className="relative h-12 w-12 overflow-hidden rounded-full border border-purple-500/40">
                    <Image src={player.profileUrl} alt={player.playerName} fill className="object-cover" unoptimized />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-purple-500/40 bg-purple-500/10">
                    <UserRound className="h-6 w-6 text-purple-200" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-lg font-semibold text-white">{player.playerName || `Player ${player.playerId}`}</p>
                  <p className="text-sm text-gray-400">ID · {player.playerId}</p>
                </div>
                <span className="text-sm text-purple-200">View Profile →</span>
              </button>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
