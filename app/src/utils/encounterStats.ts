import {
  ActorEncounterStat,
  DamageSkillStat,
  HealSkillStat,
  DamageHitDetail,
  HealDetail,
} from "@/types/commonTypes";

/**
 * Calculates filtered player stats based on a time range (in seconds)
 * by processing hitDetails from damageSkillStats and healSkillStats
 */
export interface FilteredPlayerStats {
  damageDealt: number;
  healDealt: number;
  damageTaken: number;
  hitsDealt: number;
  hitsHeal: number;
  hitsTaken: number;
  dps: number;
  hps: number;
}

export function calculateFilteredPlayerStats(
  playerId: number,
  damageSkillStats: DamageSkillStat[],
  healSkillStats: HealSkillStat[],
  timeRange: { start: number; end: number } | null,
  totalDurationSec: number
): FilteredPlayerStats {
  let damageDealt = 0;
  let hitsDealt = 0;

  // Calculate damage dealt by this player
  damageSkillStats
    .filter((stat) => stat.attackerId === playerId)
    .forEach((stat) => {
      if (!stat.hitDetails) return;

      (stat.hitDetails as DamageHitDetail[]).forEach((detail) => {
        const msFromStart = detail.ms_from_start;
        if (msFromStart === undefined) return;

        // If no time range specified, include all hits
        if (!timeRange) {
          const damageValue = detail.damage ?? detail.hp_loss ?? 0;
          damageDealt += damageValue;
          hitsDealt += 1;
        } else {
          const startMs = timeRange.start * 1000;
          const endMs = timeRange.end * 1000;
          if (msFromStart >= startMs && msFromStart <= endMs) {
            const damageValue = detail.damage ?? detail.hp_loss ?? 0;
            damageDealt += damageValue;
            hitsDealt += 1;
          }
        }
      });
    });

  let healDealt = 0;
  let hitsHeal = 0;

  // Calculate healing dealt by this player
  healSkillStats
    .filter((stat) => stat.healerId === playerId)
    .forEach((stat) => {
      if (!stat.healDetails) return;

      (stat.healDetails as HealDetail[]).forEach((detail) => {
        const msFromStart = detail.ms_from_start;
        if (msFromStart === undefined) return;

        // If no time range specified, include all hits
        if (!timeRange) {
          const healValue = detail.heal ?? 0;
          healDealt += healValue;
          hitsHeal += 1;
        } else {
          const startMs = timeRange.start * 1000;
          const endMs = timeRange.end * 1000;
          if (msFromStart >= startMs && msFromStart <= endMs) {
            const healValue = detail.heal ?? 0;
            healDealt += healValue;
            hitsHeal += 1;
          }
        }
      });
    });

  let damageTaken = 0;
  let hitsTaken = 0;

  // Calculate damage taken by this player (where they are the defender)
  damageSkillStats
    .filter((stat) => stat.defenderId === playerId)
    .forEach((stat) => {
      if (!stat.hitDetails) return;

      (stat.hitDetails as DamageHitDetail[]).forEach((detail) => {
        const msFromStart = detail.ms_from_start;
        if (msFromStart === undefined) return;

        // If no time range specified, include all hits
        if (!timeRange) {
          const damageValue = detail.damage ?? detail.hp_loss ?? 0;
          damageTaken += damageValue;
          hitsTaken += 1;
        } else {
          const startMs = timeRange.start * 1000;
          const endMs = timeRange.end * 1000;
          if (msFromStart >= startMs && msFromStart <= endMs) {
            const damageValue = detail.damage ?? detail.hp_loss ?? 0;
            damageTaken += damageValue;
            hitsTaken += 1;
          }
        }
      });
    });

  // Calculate duration: use filtered range if provided, otherwise use total duration
  const durationSec = timeRange
    ? Math.max(1, timeRange.end - timeRange.start)
    : totalDurationSec;

  const dps = damageDealt / durationSec;
  const hps = healDealt / durationSec;

  return {
    damageDealt,
    healDealt,
    damageTaken,
    hitsDealt,
    hitsHeal,
    hitsTaken,
    dps,
    hps,
  };
}

/**
 * Calculates stats for all players within the given time range
 */
export function calculateAllPlayerStats(
  players: ActorEncounterStat[],
  damageSkillStats: DamageSkillStat[],
  healSkillStats: HealSkillStat[],
  timeRange: { start: number; end: number } | null,
  totalDurationSec: number
): Map<number, FilteredPlayerStats> {
  const playerStatsMap = new Map<number, FilteredPlayerStats>();

  players.forEach((player) => {
    const stats = calculateFilteredPlayerStats(
      player.actorId,
      damageSkillStats,
      healSkillStats,
      timeRange,
      totalDurationSec
    );
    playerStatsMap.set(player.actorId, stats);
  });

  return playerStatsMap;
}
