"use client";

import React, { useEffect, useRef, useState, ReactNode } from "react";
import Image from "next/image";
import { produce } from "immer";
import * as RadixSlider from "@radix-ui/react-slider";
import {
  CLASS_MAP,
  CLASS_SPEC_MAP,
  getClassIconName,
  getSpecsForClass,
} from "@/utils/classData";
import SceneData from "@/data/SceneData.json";

// Derive scene entries (id and name) from the static SceneData
const SCENE_ENTRIES = Object.entries(SceneData as Record<string, { name: string }>).map(([id, data]) => ({
  id,
  name: data.name,
}));

const DEBOUNCE_MS = 400;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface FilterConfig {
  scene?: boolean;
  class?: boolean;
  spec?: boolean;
  playerName?: boolean;
  monsterName?: boolean;
  uploaderName?: boolean;
  logId?: boolean;
  orderBy?: boolean;
  sortDirection?: boolean;
  abilityScore?: boolean;
  duration?: boolean;
  sinceDays?: boolean;
}

export interface FilterParams {
  scene_id?: number | string;
  class_id?: number | string;
  class_spec?: number | string;
  player_name?: string;
  monster_name?: string;
  user_search?: string;
  log_id?: string;
  orderBy?: string;
  sort?: "asc" | "desc";
  // Slider-based
  ability_score?: string; // "min,max"
  duration?: string; // "min,max"
  min_ability_score?: number;
  max_ability_score?: number;
  min_duration?: number;
  max_duration?: number;
  since_days?: number;
  // For resetting offset
  offset?: number;
  // Alias for entities page
  classId?: number | string;
  maxHp?: number;
}

export interface FilterProps<T extends FilterParams = FilterParams> {
  params: T;
  setParams: React.Dispatch<React.SetStateAction<T>>;
  config: FilterConfig;
  floating?: boolean;
  className?: string;
  orderByOptions?: { value: string; label: string }[];
}

const DEFAULT_ORDER_BY_OPTIONS = [
  { value: "startedAt", label: "Start Time" },
  { value: "date", label: "Upload Date" },
  { value: "duration", label: "Duration" },
  { value: "dps", label: "Team DPS" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function Filter<T extends FilterParams>({
  params,
  setParams,
  config,
  floating = true,
  className = "",
  orderByOptions = DEFAULT_ORDER_BY_OPTIONS,
}: FilterProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Helper to update params with proper immer produce typing
  // We use a recipe that works on the draft and setParams handles the produce
  const updateParams = (recipe: (draft: T) => void) => {
    setParams((prev) => produce(prev, recipe));
  };

  // ─── Debounced text inputs ───
  const [playerInput, setPlayerInput] = useState<string>(params.player_name ?? "");
  const [monsterInput, setMonsterInput] = useState<string>(params.monster_name ?? "");
  const [userSearchInput, setUserSearchInput] = useState<string>(params.user_search ?? "");
  const [logIdInput, setLogIdInput] = useState<string>(params.log_id ?? "");
  const [sinceDaysInput, setSinceDaysInput] = useState<string>(
    params.since_days ? String(params.since_days) : ""
  );

  // ─── Slider states ───
  const [durationMin, setDurationMin] = useState<number>(params.min_duration ?? 0);
  const [durationMax, setDurationMax] = useState<number>(params.max_duration ?? 3600);
  const [abilityMin, setAbilityMin] = useState<number>(params.min_ability_score ?? 0);
  const [abilityMax, setAbilityMax] = useState<number>(params.max_ability_score ?? 100000);

  // ─── Class/Spec selection ───
  const selectedClassId: number | null = params.class_id
    ? Number(params.class_id)
    : (params.classId ? Number(params.classId) : null);
  const selectedSpecs: number[] = (() => {
    const spec = params.class_spec;
    if (!spec) return [];
    if (typeof spec === "number") return [spec];
    return String(spec)
      .split(",")
      .map((s) => parseInt(s, 10))
      .filter((n) => !Number.isNaN(n));
  })();

  // ─────────────────────────────────────────────────────────────────────────────
  // Debounce effects for text inputs
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!config.playerName) return;
    const t = setTimeout(() => {
      updateParams((draft) => {
        const next = playerInput.length > 3 ? playerInput : "";
        if ((draft.player_name || "") !== next) {
          draft.player_name = next || undefined;
          draft.offset = 0;
        }
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [playerInput, config.playerName]);

  useEffect(() => {
    if (!config.monsterName) return;
    const t = setTimeout(() => {
      updateParams((draft) => {
        const next = monsterInput.length > 3 ? monsterInput : "";
        if ((draft.monster_name || "") !== next) {
          draft.monster_name = next || undefined;
          draft.offset = 0;
        }
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [monsterInput, config.monsterName]);

  useEffect(() => {
    if (!config.uploaderName) return;
    const t = setTimeout(() => {
      updateParams((draft) => {
        const next = userSearchInput.length > 2 ? userSearchInput : "";
        if ((draft.user_search || "") !== next) {
          draft.user_search = next || undefined;
          draft.offset = 0;
        }
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [userSearchInput, config.uploaderName]);

  useEffect(() => {
    if (!config.logId) return;
    const t = setTimeout(() => {
      updateParams((draft) => {
        const next = logIdInput || undefined;
        if ((draft.log_id || undefined) !== next) {
          draft.log_id = next;
          draft.offset = 0;
        }
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [logIdInput, config.logId]);

  useEffect(() => {
    if (!config.sinceDays) return;
    const t = setTimeout(() => {
      updateParams((draft) => {
        const days = parseInt(sinceDaysInput);
        if (!isNaN(days) && days > 0) {
          draft.since_days = days;
        } else {
          draft.since_days = undefined;
        }
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [sinceDaysInput, config.sinceDays]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Slider effects
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!config.duration) return;
    updateParams((draft) => {
      if (durationMin === 0 && durationMax === 3600) {
        draft.min_duration = undefined;
        draft.max_duration = undefined;
        draft.duration = undefined;
      } else {
        draft.min_duration = durationMin;
        draft.max_duration = durationMax;
        draft.duration = `${durationMin},${durationMax}`;
      }
    });
  }, [durationMin, durationMax, config.duration]);

  useEffect(() => {
    if (!config.abilityScore) return;
    updateParams((draft) => {
      if (abilityMin === 0 && abilityMax === 100000) {
        draft.min_ability_score = undefined;
        draft.max_ability_score = undefined;
        draft.ability_score = undefined;
      } else {
        draft.min_ability_score = abilityMin;
        draft.max_ability_score = abilityMax;
        draft.ability_score = `${abilityMin},${abilityMax}`;
      }
    });
  }, [abilityMin, abilityMax, config.abilityScore]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Click outside to close
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  const activeFiltersCount = [
    params.scene_id,
    params.player_name,
    params.monster_name,
    params.class_id || params.classId,
    params.user_search,
    params.log_id,
    params.since_days,
    params.min_duration !== undefined && params.max_duration !== undefined && (params.min_duration !== 0 || params.max_duration !== 3600),
    params.min_ability_score !== undefined && params.max_ability_score !== undefined && (params.min_ability_score !== 0 || params.max_ability_score !== 100000),
  ].filter(Boolean).length;

  function clearAllFilters() {
    updateParams((draft) => {
      draft.scene_id = undefined;
      draft.player_name = undefined;
      draft.monster_name = undefined;
      draft.class_id = undefined;
      draft.classId = undefined;
      draft.class_spec = undefined;
      draft.user_search = undefined;
      draft.log_id = undefined;
      draft.since_days = undefined;
      draft.min_duration = undefined;
      draft.max_duration = undefined;
      draft.duration = undefined;
      draft.min_ability_score = undefined;
      draft.max_ability_score = undefined;
      draft.ability_score = undefined;
      draft.maxHp = undefined;
      draft.offset = 0;
    });
    setPlayerInput("");
    setMonsterInput("");
    setUserSearchInput("");
    setLogIdInput("");
    setSinceDaysInput("");
    setDurationMin(0);
    setDurationMax(3600);
    setAbilityMin(0);
    setAbilityMax(100000);
  }

  function setClassId(id: number | null) {
    updateParams((draft) => {
      if (id === null) {
        draft.class_id = undefined;
        draft.classId = undefined;
        draft.class_spec = undefined;
      } else {
        draft.class_id = id;
        draft.classId = id;
      }
      draft.offset = 0;
    });
  }

  function toggleSpec(specId: number) {
    updateParams((draft) => {
      const current = selectedSpecs;
      let next: number[];
      if (current.includes(specId)) {
        next = current.filter((s) => s !== specId);
      } else {
        next = [...current, specId];
      }
      if (next.length === 0) {
        draft.class_spec = undefined;
      } else if (next.length === 1) {
        draft.class_spec = next[0];
      } else {
        draft.class_spec = next.join(",");
      }
      draft.offset = 0;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  // Look up scene name for display
  const selectedSceneData = params.scene_id
    ? (SceneData as any)[String(params.scene_id)]
    : null;
  const selectedSceneName = selectedSceneData?.name;
  const difficulties: number[] = selectedSceneData?.boss?.values || [];

  const summaryLabel = selectedSceneName || (activeFiltersCount > 0 ? `${activeFiltersCount} active` : "None active");

  return (
    <>
      {/* Active filter chips */}
      {activeFiltersCount > 0 && (
        <div className={`${floating ? "fixed top-20 left-6" : "mt-4"} z-30 flex flex-wrap gap-2 max-w-xl animate-fade-in`}>
          {selectedSceneName && (
            <FilterChip
              label={`Scene: ${selectedSceneName}`}
              onClear={() => {
                updateParams((draft) => {
                  draft.scene_id = undefined;
                  draft.maxHp = undefined;
                  draft.offset = 0;
                });
              }}
            />
          )}
          {params.maxHp && (
            <FilterChip
              label={`Difficulty: ${difficulties.indexOf(params.maxHp) + 1}`}
              onClear={() => {
                updateParams((draft) => {
                  draft.maxHp = undefined;
                  draft.offset = 0;
                });
              }}
            />
          )}
          {params.player_name && (
            <FilterChip
              label={`Player: ${params.player_name}`}
              onClear={() => {
                updateParams((draft) => {
                  draft.player_name = undefined;
                  draft.offset = 0;
                });
                setPlayerInput("");
              }}
            />
          )}
          {params.monster_name && (
            <FilterChip
              label={`Monster: ${params.monster_name}`}
              onClear={() => {
                updateParams((draft) => {
                  draft.monster_name = undefined;
                  draft.offset = 0;
                });
                setMonsterInput("");
              }}
            />
          )}
          {(params.class_id || params.classId) && (
            <FilterChip
              label={`Class: ${CLASS_MAP[Number(params.class_id || params.classId)]}`}
              onClear={() => setClassId(null)}
            />
          )}
          {params.user_search && (
            <FilterChip
              label={`Uploader: ${params.user_search}`}
              onClear={() => {
                updateParams((draft) => {
                  draft.user_search = undefined;
                  draft.offset = 0;
                });
                setUserSearchInput("");
              }}
            />
          )}
          {params.log_id && (
            <FilterChip
              label={`Log ID: ${params.log_id}`}
              onClear={() => {
                updateParams((draft) => {
                  draft.log_id = undefined;
                  draft.offset = 0;
                });
                setLogIdInput("");
              }}
            />
          )}
          {params.since_days && (
            <FilterChip
              label={`Last ${params.since_days} days`}
              onClear={() => {
                updateParams((draft) => {
                  draft.since_days = undefined;
                });
                setSinceDaysInput("");
              }}
            />
          )}
          {params.min_duration !== undefined && params.max_duration !== undefined && (params.min_duration !== 0 || params.max_duration !== 3600) && (
            <FilterChip
              label={`Duration: ${params.min_duration}s-${params.max_duration}s`}
              onClear={() => {
                updateParams((draft) => {
                  draft.min_duration = undefined;
                  draft.max_duration = undefined;
                  draft.duration = undefined;
                });
                setDurationMin(0);
                setDurationMax(3600);
              }}
            />
          )}
          {params.min_ability_score !== undefined && params.max_ability_score !== undefined && (params.min_ability_score !== 0 || params.max_ability_score !== 100000) && (
            <FilterChip
              label={`Ability: ${params.min_ability_score}-${params.max_ability_score}`}
              onClear={() => {
                updateParams((draft) => {
                  draft.min_ability_score = undefined;
                  draft.max_ability_score = undefined;
                  draft.ability_score = undefined;
                });
                setAbilityMin(0);
                setAbilityMax(100000);
              }}
            />
          )}
        </div>
      )}

      {/* Main dropdown */}
      <div className={`${floating ? "fixed top-20 right-6" : "relative"} z-40 animate-fade-in ${className}`} ref={dropdownRef}>
        <div className="group relative">
          <div className="absolute inset-0 -m-0.5 bg-linear-to-r from-purple-600 to-pink-600 rounded-2xl opacity-20 blur group-hover:opacity-40 transition-all duration-300 pointer-events-none"></div>

          <div
            className={`relative w-80 bg-gray-900/95 border border-purple-500/30 backdrop-blur-xl shadow-2xl shadow-purple-500/10 transition-all duration-300 overflow-hidden ${isOpen ? "rounded-2xl" : "rounded-2xl hover:shadow-purple-500/20 hover:border-purple-500/50"
              }`}
          >
            <button
              onClick={() => setIsOpen((v) => !v)}
              className="relative flex items-center gap-3 px-5 py-3.5 w-full transition-all duration-300"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-linear-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 transition-all duration-300">
                <svg
                  className="w-4.5 h-4.5 text-purple-300"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <div className="h-8 w-px bg-linear-to-b from-transparent via-purple-500/40 to-transparent" />
              <div className="flex flex-col gap-1 flex-1 text-left">
                <label className="text-[10px] uppercase tracking-widest text-purple-300/70 font-semibold">Filters</label>
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium truncate">{summaryLabel}</span>
                  <svg
                    className={`w-4 h-4 text-purple-300 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </button>

            <div className={`transition-all duration-300 ease-in-out ${isOpen ? "max-h-[700px] opacity-100" : "max-h-0 opacity-0"}`}>
              <div className="max-h-[700px] overflow-y-auto py-2 px-4 space-y-4">
                {/* Scene */}
                {config.scene && SCENE_ENTRIES.length > 0 && (
                  <FilterSection label="Scene">
                    <select
                      className="w-full p-2.5 bg-gray-800/80 border border-gray-700 rounded-lg text-sm text-gray-200 focus:border-purple-500 focus:outline-none transition-colors"
                      value={params.scene_id ?? ""}
                      onChange={(e) =>
                        setParams((prev) =>
                          produce(prev, (draft) => {
                            const newSceneId = e.target.value || undefined;
                            draft.scene_id = newSceneId;

                            // Auto-select hardest difficulty (max HP) if scene changes
                            if (newSceneId) {
                              const data = (SceneData as any)[newSceneId];
                              const vals = (data?.boss?.values || []) as number[];
                              const validVals = vals.filter(v => v > 0);
                              if (validVals.length > 0) {
                                // Assuming "hardest" is the max value
                                draft.maxHp = Math.max(...validVals);
                              } else {
                                draft.maxHp = undefined;
                              }
                            } else {
                              draft.maxHp = undefined;
                            }

                            draft.offset = 0;
                          })
                        )
                      }
                    >
                      <option value="">All Scenes</option>
                      {SCENE_ENTRIES.map((scene) => (
                        <option key={scene.id} value={scene.id}>
                          {scene.name}
                        </option>
                      ))}
                    </select>
                  </FilterSection>
                )}

                {config.scene && difficulties.length > 0 && (
                  <FilterSection label="Master Mode Difficulty">
                    <div className="grid grid-cols-5 gap-2">
                      {difficulties.map((hp, idx) => {
                        if (hp === 0) return null;
                        const difficultyLevel = idx + 1;
                        const isActive = params.maxHp === hp;

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() =>
                              setParams((prev) =>
                                produce(prev, (draft) => {
                                  draft.maxHp = isActive ? undefined : hp;
                                  draft.offset = 0;
                                })
                              )
                            }
                            className={`flex items-center justify-center h-10 rounded-xl text-sm font-bold transition-all duration-200 border ${isActive
                                ? "bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/20 scale-105"
                                : "bg-gray-800/80 border-gray-700 text-gray-400 hover:bg-gray-700 hover:border-gray-600 hover:text-gray-200"
                              }`}
                            title={`Difficulty ${difficultyLevel} (HP: ${hp.toLocaleString()})`}
                          >
                            {difficultyLevel}
                          </button>
                        );
                      })}
                    </div>
                  </FilterSection>
                )}

                {/* Class */}
                {config.class && (
                  <FilterSection label="Class">
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(CLASS_MAP).map(([idStr, name]) => {
                        const id = Number(idStr);
                        const isActive = selectedClassId === id;
                        return (
                          <button
                            key={idStr}
                            type="button"
                            onClick={() => setClassId(isActive ? null : id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                              ? "bg-purple-500/30 border border-purple-500 text-purple-200"
                              : "bg-gray-800/80 border border-gray-700 hover:bg-gray-800 text-gray-300"
                              }`}
                          >
                            <Image
                              src={`/images/classes/${getClassIconName(id)}`}
                              alt={name}
                              width={18}
                              height={18}
                              className="object-contain"
                            />
                            <span>{name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </FilterSection>
                )}

                {/* Spec */}
                {config.spec && selectedClassId && (
                  <FilterSection label="Specialization">
                    <div className="flex gap-2 flex-wrap">
                      {getSpecsForClass(selectedClassId).map((specId) => {
                        const specName = CLASS_SPEC_MAP[specId] ?? `Spec ${specId}`;
                        const checked = selectedSpecs.includes(specId);
                        return (
                          <label
                            key={specId}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${checked
                              ? "bg-purple-500/30 border border-purple-500 text-purple-200"
                              : "bg-gray-800/80 border border-gray-700 hover:bg-gray-800 text-gray-300"
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSpec(specId)}
                              className="sr-only"
                            />
                            <span>{specName}</span>
                          </label>
                        );
                      })}
                    </div>
                  </FilterSection>
                )}

                {/* Player Name */}
                {config.playerName && (
                  <FilterSection label="Player Name">
                    <input
                      type="text"
                      value={playerInput}
                      onChange={(e) => setPlayerInput(e.target.value)}
                      placeholder="Type at least 4 characters..."
                      className="w-full p-2.5 bg-gray-800/80 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                    />
                  </FilterSection>
                )}

                {/* Monster Name */}
                {config.monsterName && (
                  <FilterSection label="Monster Name">
                    <input
                      type="text"
                      value={monsterInput}
                      onChange={(e) => setMonsterInput(e.target.value)}
                      placeholder="Type at least 4 characters..."
                      className="w-full p-2.5 bg-gray-800/80 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                    />
                  </FilterSection>
                )}

                {/* Uploader Name */}
                {config.uploaderName && (
                  <FilterSection label="Uploader Name">
                    <input
                      type="text"
                      value={userSearchInput}
                      onChange={(e) => setUserSearchInput(e.target.value)}
                      placeholder="Search by uploader..."
                      className="w-full p-2.5 bg-gray-800/80 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                    />
                  </FilterSection>
                )}

                {/* Log ID */}
                {config.logId && (
                  <FilterSection label="Log ID">
                    <input
                      type="text"
                      value={logIdInput}
                      onChange={(e) => setLogIdInput(e.target.value)}
                      placeholder="Enter encounter ID..."
                      className="w-full p-2.5 bg-gray-800/80 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                    />
                  </FilterSection>
                )}

                {/* Since Days */}
                {config.sinceDays && (
                  <FilterSection label="Last N Days">
                    <input
                      type="number"
                      value={sinceDaysInput}
                      onChange={(e) => setSinceDaysInput(e.target.value)}
                      placeholder="e.g. 7"
                      min="1"
                      className="w-full p-2.5 bg-gray-800/80 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                    />
                  </FilterSection>
                )}

                {/* Ability Score Slider */}
                {config.abilityScore && (
                  <FilterSection label="Ability Score">
                    <RadixSlider.Root
                      className="relative flex items-center select-none touch-none w-full h-6"
                      value={[abilityMin, abilityMax]}
                      onValueChange={(vals: number[]) => {
                        setAbilityMin(vals[0]);
                        setAbilityMax(vals[1]);
                      }}
                      min={0}
                      max={100000}
                      step={100}
                      aria-label="Ability score range"
                    >
                      <RadixSlider.Track className="relative bg-gray-800/80 rounded-full h-2 w-full">
                        <RadixSlider.Range className="absolute bg-purple-500 h-full rounded-full" />
                      </RadixSlider.Track>
                      <RadixSlider.Thumb className="block w-4 h-4 bg-purple-400 border-2 border-purple-300 rounded-full shadow-lg hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-purple-400" />
                      <RadixSlider.Thumb className="block w-4 h-4 bg-purple-400 border-2 border-purple-300 rounded-full shadow-lg hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-purple-400" />
                    </RadixSlider.Root>
                    <div className="text-sm text-gray-400 mt-2 font-medium">
                      {abilityMin.toLocaleString()} — {abilityMax.toLocaleString()}
                    </div>
                  </FilterSection>
                )}

                {/* Duration Slider */}
                {config.duration && (
                  <FilterSection label="Duration (seconds)">
                    <RadixSlider.Root
                      className="relative flex items-center select-none touch-none w-full h-6"
                      value={[durationMin, durationMax]}
                      onValueChange={(vals: number[]) => {
                        setDurationMin(vals[0]);
                        setDurationMax(vals[1]);
                      }}
                      min={0}
                      max={3600}
                      step={10}
                      aria-label="Duration range"
                    >
                      <RadixSlider.Track className="relative bg-gray-800/80 rounded-full h-2 w-full">
                        <RadixSlider.Range className="absolute bg-purple-500 h-full rounded-full" />
                      </RadixSlider.Track>
                      <RadixSlider.Thumb className="block w-4 h-4 bg-purple-400 border-2 border-purple-300 rounded-full shadow-lg hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-purple-400" />
                      <RadixSlider.Thumb className="block w-4 h-4 bg-purple-400 border-2 border-purple-300 rounded-full shadow-lg hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-purple-400" />
                    </RadixSlider.Root>
                    <div className="text-sm text-gray-400 mt-2 font-medium">
                      {durationMin}s — {durationMax}s
                    </div>
                  </FilterSection>
                )}

                {/* Order By */}
                {config.orderBy && (
                  <FilterSection label="Order By">
                    <select
                      className="w-full p-2.5 bg-gray-800/80 border border-gray-700 rounded-lg text-sm text-gray-200 focus:border-purple-500 focus:outline-none transition-colors"
                      value={params.orderBy ?? ""}
                      onChange={(e) =>
                        setParams((prev) =>
                          produce(prev, (draft) => {
                            draft.orderBy = e.target.value || undefined;
                            draft.offset = 0;
                          })
                        )
                      }
                    >
                      {orderByOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FilterSection>
                )}

                {/* Sort Direction */}
                {config.sortDirection && (
                  <FilterSection label="Sort Direction">
                    <div className="flex gap-2">
                      {(["asc", "desc"] as const).map((direction) => {
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
                                })
                              )
                            }
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                              ? "bg-purple-500/30 border border-purple-500 text-purple-100"
                              : "bg-gray-800/80 border border-gray-700 hover:bg-gray-800 text-gray-300"
                              }`}
                          >
                            {direction === "asc" ? "Ascending" : "Descending"}
                          </button>
                        );
                      })}
                    </div>
                  </FilterSection>
                )}

                {/* Reset */}
                <div className="flex gap-2 pt-2 border-t border-gray-800">
                  <button
                    type="button"
                    className="flex-1 px-4 py-2.5 rounded-lg bg-gray-800/80 border border-gray-700 hover:bg-gray-800 text-gray-300 text-sm font-medium transition-colors"
                    onClick={clearAllFilters}
                  >
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

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

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
