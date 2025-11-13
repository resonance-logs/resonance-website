"use client";

import React from "react";
import { EncounterPhase } from "@/types/commonTypes";
import { formatDuration } from "@/utils/timeFormat";

interface Props {
  phases?: EncounterPhase[];
}

export default function EncounterPhases({ phases }: Props) {
  if (!phases || phases.length === 0) {
    return null;
  }

  const getPhaseIcon = (phaseType: string) => {
    return phaseType === "mob" ? "⚔️" : "👑";
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case "success":
        return "text-green-400 bg-green-400/10 border-green-400/30";
      case "wipe":
        return "text-red-400 bg-red-400/10 border-red-400/30";
      default:
        return "text-gray-400 bg-gray-400/10 border-gray-400/30";
    }
  };

  const getOutcomeLabel = (outcome: string) => {
    return outcome.charAt(0).toUpperCase() + outcome.slice(1);
  };

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3 text-gray-200">Encounter Phases</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {phases.map((phase) => (
          <div
            key={phase.id}
            className="rounded-lg border border-gray-800 bg-gray-900/40 p-4 hover:bg-gray-900/60 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getPhaseIcon(phase.phaseType)}</span>
                <span className="font-semibold text-white capitalize">
                  {phase.phaseType} Phase
                </span>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-medium border ${getOutcomeColor(
                  phase.outcome
                )}`}
              >
                {getOutcomeLabel(phase.outcome)}
              </span>
            </div>
            <div className="text-sm text-gray-400">
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="text-gray-300 font-mono">
                  {formatDuration(phase.startTime, phase.endTime ?? undefined)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
