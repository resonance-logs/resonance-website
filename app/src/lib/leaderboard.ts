import { EncounterPlayerDTO, EncounterRowDTO } from "@/api/encounter";

export interface AggregatedPlayer extends EncounterPlayerDTO {
  totalDamage: number;
  totalHeal: number;
  totalTaken: number;
  encounterCount: number;
  totalDurationSeconds: number;
  averageDps: number;
  bestDps: number;
  lastSeenAtMs: number;
}

function initialAggregate(player: EncounterPlayerDTO, encounter: EncounterRowDTO, durationSeconds: number): AggregatedPlayer {
  const damageDealt = player.damageDealt ?? 0;
  const healDealt = player.healDealt ?? 0;
  const damageTaken = player.damageTaken ?? 0;

  const averageDps = Math.round(damageDealt / Math.max(1, durationSeconds));

  return {
    ...player,
    totalDamage: damageDealt,
    totalHeal: healDealt,
    totalTaken: damageTaken,
    encounterCount: 1,
    totalDurationSeconds: durationSeconds,
    averageDps,
    bestDps: averageDps,
    lastSeenAtMs: encounter.startedAtMs ?? Date.now(),
  };
}

export function aggregatePlayersFromEncounters(encounters: EncounterRowDTO[]): AggregatedPlayer[] {
  const aggregates = new Map<number, AggregatedPlayer>();

  encounters.forEach((encounter) => {
    const durationSeconds = Math.max(1, Math.floor((encounter.durationMs ?? 0) / 1000));

    encounter.players.forEach((player) => {
      if (!player.isPlayer) return;

      const actorId = player.actorId;
      const damageDealt = player.damageDealt ?? 0;
      const healDealt = player.healDealt ?? 0;
      const damageTaken = player.damageTaken ?? 0;
      const encounterDps = Math.round(damageDealt / Math.max(1, durationSeconds));

      if (!aggregates.has(actorId)) {
        aggregates.set(actorId, initialAggregate(player, encounter, durationSeconds));
        return;
      }

      const existing = aggregates.get(actorId)!;

      const totalDurationSeconds = existing.totalDurationSeconds + durationSeconds;
      const totalDamage = existing.totalDamage + damageDealt;
      const averageDps = Math.round(totalDamage / Math.max(1, totalDurationSeconds));

      aggregates.set(actorId, {
        ...existing,
        name: player.name ?? existing.name,
        classId: player.classId ?? existing.classId,
        classSpec: player.classSpec ?? existing.classSpec,
        abilityScore: player.abilityScore ?? existing.abilityScore,
        totalDamage,
        totalHeal: existing.totalHeal + healDealt,
        totalTaken: existing.totalTaken + damageTaken,
        encounterCount: existing.encounterCount + 1,
        totalDurationSeconds,
        averageDps,
        bestDps: Math.max(existing.bestDps, encounterDps),
        lastSeenAtMs: Math.max(existing.lastSeenAtMs, encounter.startedAtMs ?? existing.lastSeenAtMs),
      });
    });
  });

  return Array.from(aggregates.values()).sort((a, b) => b.averageDps - a.averageDps);
}

export function getMetricValue(player: AggregatedPlayer, metric: string): number {
  switch (metric) {
    case "averageDps":
      return player.averageDps;
    case "bestDps":
      return player.bestDps;
    case "totalDamage":
      return player.totalDamage;
    case "totalHeal":
      return player.totalHeal;
    case "encounterCount":
      return player.encounterCount;
    case "totalTaken":
      return player.totalTaken;
    default:
      return player.averageDps;
  }
}
