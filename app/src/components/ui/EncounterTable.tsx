"use client";

import EncounterTableEntry from "@/components/ui/EncounterTableEntry";
import { Encounter } from "@/types/commonTypes";

interface Props {
  rows: Encounter[];
  isLoading?: boolean;
  limit?: number;
  onRowClick?: (encounter: Encounter) => void;
  showLocalPlayerDetails?: boolean;
}

export default function EncounterTable({ rows, isLoading = false, limit = 20, onRowClick, showLocalPlayerDetails = false }: Props) {
  // navigation is handled by the row component

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: limit }).map((_, idx) => (
          <EncounterTableEntry key={`s-${idx}`} idx={idx} loading showLocalPlayerDetails={showLocalPlayerDetails} onRowClick={onRowClick} />
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="text-center py-12 border border-dashed border-gray-800/80 rounded-2xl bg-gray-900/40">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-800/60 rounded-full mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No encounters found</h3>
        <p className="text-gray-400">Try adjusting your filters or check back later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((encounter, idx) => (
        <EncounterTableEntry
          key={encounter.id ?? idx}
          encounter={encounter}
          idx={idx}
          showLocalPlayerDetails={showLocalPlayerDetails}
          onRowClick={onRowClick}
        />
      ))}
    </div>
  );
}

