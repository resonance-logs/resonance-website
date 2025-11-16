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

// Totals API types
export interface ByClassIDItem {
  class_id: number;
  count: number;
}

export interface ByClassSpecItem {
  class_spec: number;
  count: number;
}

export interface GearBracketItem {
  bracket: number; // 0,100,200,...
  count: number;
}

export interface TotalsResponse {
  total_players: number;
  by_class_id: ByClassIDItem[];
  by_class_spec: ByClassSpecItem[];
  gear_brackets: GearBracketItem[];
}

// GET /api/v1/statistics/total
export async function fetchStatisticsTotals() {
  const { data } = await api.get<TotalsResponse>("/statistics/total");
  return data;
}
