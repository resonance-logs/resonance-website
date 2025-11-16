"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { produce } from "immer";
import { CLASS_MAP, getClassIconName } from "@/utils/classData";
import { FetchEncountersParams } from "@/api/encounter/encounter";

interface AdvancedEncounterFiltersProps {
  params: FetchEncountersParams;
  setParams: React.Dispatch<React.SetStateAction<FetchEncountersParams>>;
  scenes: string[];
  /**
   * When true (default) renders the floating overlay layout used on /logs.
   * Set to false to let the parent control positioning while still reusing the internals.
   */
  floating?: boolean;
}

const DEBOUNCE_MS = 400;

const ORDER_BY_OPTIONS: { value: FetchEncountersParams["orderBy"]; label: string }[] = [
  { value: "startedAt", label: "Start Time" },
  { value: "date", label: "Upload Date" },
  { value: "duration", label: "Duration" },
  { value: "dps", label: "Team DPS" },
];

export function AdvancedEncounterFilters({ params, setParams, scenes, floating = true }: AdvancedEncounterFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Local debounced inputs for player + monster filters
  const [playerInput, setPlayerInput] = useState<string>(params.player_name ?? "");
  const [monsterInput, setMonsterInput] = useState<string>(params.monster_name ?? "");

  useEffect(() => {
    const t = setTimeout(() => {
      setParams((prev) =>
        produce(prev, (draft: FetchEncountersParams) => {
          if (playerInput.length === 0) {
            draft.player_name = "";
          } else if (playerInput.length > 3) {
            draft.player_name = playerInput;
          }
          draft.offset = 0;
        }),
      );
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [playerInput, setParams]);

  useEffect(() => {
    const t = setTimeout(() => {
      setParams((prev) =>
        produce(prev, (draft: FetchEncountersParams) => {
          if (monsterInput.length === 0) {
            draft.monster_name = "";
          } else if (monsterInput.length > 3) {
            draft.monster_name = monsterInput;
          }
          draft.offset = 0;
        }),
      );
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [monsterInput, setParams]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const activeFiltersCount = [params.scene_name, params.player_name, params.monster_name, params.class_id].filter(Boolean).length;

  function clearAllFilters() {
    setParams(
      produce((draft: FetchEncountersParams) => {
        draft.scene_name = "";
        draft.player_name = "";
        draft.monster_name = "";
        draft.class_id = "";
        draft.offset = 0;
      }),
    );
    setPlayerInput("");
    setMonsterInput("");
  }

  return (
    <>
      {/* Active filter chips */}
      {activeFiltersCount > 0 && (
        <div className={`${floating ? "fixed top-20 left-6" : "mt-4"} z-30 flex flex-wrap gap-2 max-w-xl animate-fade-in`}>
          {params.scene_name && (
            <FilterChip label={`Scene: ${params.scene_name}`} onClear={() => setParams(produce((draft: FetchEncountersParams) => { draft.scene_name = ""; draft.offset = 0; }))} />
          )}
          {params.player_name && (
            <FilterChip
              label={`Player: ${params.player_name}`}
              onClear={() => {
                setParams(produce((draft: FetchEncountersParams) => { draft.player_name = ""; draft.offset = 0; }));
                setPlayerInput("");
              }}
            />
          )}
          {params.monster_name && (
            <FilterChip
              label={`Monster: ${params.monster_name}`}
              onClear={() => {
                setParams(produce((draft: FetchEncountersParams) => { draft.monster_name = ""; draft.offset = 0; }));
                setMonsterInput("");
              }}
            />
          )}
          {params.class_id && (
            <FilterChip label={`Class: ${CLASS_MAP[Number(params.class_id)]}`} onClear={() => setParams(produce((draft: FetchEncountersParams) => { draft.class_id = ""; draft.offset = 0; }))} />
          )}
        </div>
      )}

      <div className={`${floating ? "fixed top-20 right-6" : "relative"} z-40 animate-fade-in`} ref={dropdownRef}>
        <div className="group relative">
          <div className="absolute inset-0 -m-0.5 bg-linear-to-r from-purple-600 to-pink-600 rounded-2xl opacity-20 blur group-hover:opacity-40 transition-all duration-300 pointer-events-none"></div>

          <div className={`relative w-80 bg-gray-900/95 border border-purple-500/30 backdrop-blur-xl shadow-2xl shadow-purple-500/10 transition-all duration-300 overflow-hidden ${isOpen ? "rounded-2xl" : "rounded-2xl hover:shadow-purple-500/20 hover:border-purple-500/50"}`}>
            <button onClick={() => setIsOpen((v) => !v)} className="relative flex items-center gap-3 px-5 py-3.5 w-full transition-all duration-300">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-linear-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 transition-all duration-300">
                <svg className="w-4.5 h-4.5 text-purple-300" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <div className="h-8 w-px bg-linear-to-b from-transparent via-purple-500/40 to-transparent" />
              <div className="flex flex-col gap-1 flex-1 text-left">
                <label className="text-[10px] uppercase tracking-widest text-purple-300/70 font-semibold">Filters</label>
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium truncate">{activeFiltersCount > 0 ? `${activeFiltersCount} active` : "None active"}</span>
                  <svg className={`w-4 h-4 text-purple-300 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </button>

            <div className={`transition-all duration-300 ease-in-out ${isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}`}>
              <div className="max-h-[600px] overflow-y-auto py-2 px-4 space-y-4">
                <FilterSection label="Scene">
                  <select
                    className="w-full p-2.5 bg-gray-800/80 border border-gray-700 rounded-lg text-sm text-gray-200 focus:border-purple-500 focus:outline-none transition-colors"
                    value={params.scene_name ?? ""}
                    onChange={(e) => setParams((prev) => produce(prev, (draft) => { draft.scene_name = e.target.value; draft.offset = 0; }))}
                  >
                    <option value="">All Scenes</option>
                    {scenes.map((scene) => (
                      <option key={scene} value={scene}>
                        {scene}
                      </option>
                    ))}
                  </select>
                </FilterSection>

                <FilterSection label="Class">
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(CLASS_MAP).map(([idStr, name]) => {
                      const isActive = params.class_id === idStr;
                      return (
                        <button
                          key={idStr}
                          type="button"
                          onClick={() =>
                            setParams((prev) =>
                              produce(prev, (draft) => {
                                draft.class_id = isActive ? "" : idStr;
                                draft.offset = 0;
                              }),
                            )
                          }
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? "bg-purple-500/30 border border-purple-500 text-purple-200" : "bg-gray-800/80 border border-gray-700 hover:bg-gray-800 text-gray-300"}`}
                        >
                          <Image src={`/images/classes/${getClassIconName(Number(idStr))}`} alt={name} width={18} height={18} className="object-contain" />
                          <span>{name}</span>
                        </button>
                      );
                    })}
                  </div>
                </FilterSection>

                <FilterSection label="Player Name">
                  <input
                    type="text"
                    value={playerInput}
                    onChange={(e) => setPlayerInput(e.target.value)}
                    placeholder="Type at least 4 characters..."
                    className="w-full p-2.5 bg-gray-800/80 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </FilterSection>

                <FilterSection label="Monster Name">
                  <input
                    type="text"
                    value={monsterInput}
                    onChange={(e) => setMonsterInput(e.target.value)}
                    placeholder="Type at least 4 characters..."
                    className="w-full p-2.5 bg-gray-800/80 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </FilterSection>

                <FilterSection label="Ordering">
                  <div className="space-y-3">
                    <select
                      className="w-full p-2.5 bg-gray-800/80 border border-gray-700 rounded-lg text-sm text-gray-200 focus:border-purple-500 focus:outline-none transition-colors"
                      value={params.orderBy}
                      onChange={(e) =>
                        setParams((prev) =>
                          produce(prev, (draft) => {
                            draft.orderBy = e.target.value as FetchEncountersParams["orderBy"];
                            draft.offset = 0;
                          }),
                        )
                      }
                    >
                      {ORDER_BY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <div className="flex gap-2">
                      {(["asc", "desc"] as FetchEncountersParams["sort"][]).map((direction) => {
                        const isActive = params.sort === direction;
                        return (
                          <button
                            type="button"
                            key={direction}
                            onClick={() =>
                              setParams((prev) =>
                                produce(prev, (draft) => {
                                  draft.sort = direction;
                                  draft.offset = 0;
                                }),
                              )
                            }
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isActive ? "bg-purple-500/30 border border-purple-500 text-purple-100" : "bg-gray-800/80 border border-gray-700 hover:bg-gray-800 text-gray-300"
                            }`}
                          >
                            {direction === "asc" ? "Ascending" : "Descending"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </FilterSection>

                <div className="flex gap-2 pt-2 border-t border-gray-800">
                  <button type="button" className="flex-1 px-4 py-2.5 rounded-lg bg-gray-800/80 border border-gray-700 hover:bg-gray-800 text-gray-300 text-sm font-medium transition-colors" onClick={clearAllFilters}>
                    Reset All
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 backdrop-blur-md text-sm text-purple-200 font-medium shadow-lg">
      <span>{label}</span>
      <button onClick={onClear} className="hover:bg-purple-500/30 rounded-full p-0.5 transition-colors" aria-label={`Remove ${label} filter`}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function FilterSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-purple-300 mb-2 uppercase tracking-wide">{label}</div>
      {children}
    </div>
  );
}
