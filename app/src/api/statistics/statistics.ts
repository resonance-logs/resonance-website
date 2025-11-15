import api from "@/api/axios";


export interface OverviewResponse {
  total_damage: number;
  total_duration: number;
  total_healing: number;
  encounters: number;
}

// GET /api/v1/statistics
export async function fetchStatisticsOverview() {
  const { data } = await api.get<OverviewResponse>("/statistics");
  return data;
}

export interface ClassStatsParams {
  // Include encounters started within last N days
  since_days?: number;
  // Encounter duration range (seconds)
  min_duration?: number;
  max_duration?: number;
  // Filter by encounter scene name
  scene_name?: string;
  // Filter by ability score range
  min_ability_score?: number;
  max_ability_score?: number;
}

export interface ClassStatsItem {
  class_spec: number; // -1 when unknown
  count: number;
  avg_dps: number;
  dps_q1: number;
  dps_median: number;
  dps_q3: number;
  dps_min: number;
  dps_max: number;
  avg_hps: number;
  hps_q1: number;
  hps_median: number;
  hps_q3: number;
  hps_min: number;
  hps_max: number;
  // Outlier points for this class (matches server `Outlier` JSON)
  outliers?: Outlier[];
}

export interface ClassStatsResponse {
  classes: ClassStatsItem[];
}

export interface Outlier {
  type: 'dps' | 'hps';
  encounterId: number;
  value: number;
}


// GET /api/v1/statistics/classes
export async function fetchClassStats(params?: ClassStatsParams) {
  const { data } = await api.get<ClassStatsResponse>("/statistics/classes", { params });
  return data;
}

// Totals response returned by GET /api/v1/statistics/total
export interface TotalsResponse {
  totalPlayers: number;
  classSpec: Record<string, number>;
  classId: Record<string, number>;
  abilityScore: Record<string, number>;
}

// GET /api/v1/statistics/total
export async function fetchTotals() {
  const { data } = await api.get<TotalsResponse>("/statistics/total");
  return data;
}

