import api from "../axios";
import type { EncounterTableEntryThemeKey, EncounterTableRowSettings, UserCustomization } from "@/types/commonTypes";

export interface GetCustomizationResponse {
  customization: UserCustomization;
}

export interface UpdateCustomizationRequest {
  encounterTableEntryTheme?: EncounterTableEntryThemeKey | "" | null;
  encounterTableRow?: EncounterTableRowSettings | null;
  entityLeaderboardTheme?: EncounterTableEntryThemeKey | "" | null;
  leaderboardEncounterTheme?: EncounterTableEntryThemeKey | "" | null;
  leaderboardPlayerTheme?: EncounterTableEntryThemeKey | "" | null;
}

export type UpdateCustomizationResponse = GetCustomizationResponse;

export const getCustomization = async (): Promise<GetCustomizationResponse> => {
  const { data } = await api.get<GetCustomizationResponse>("/customization");
  return data;
};

export const updateCustomization = async (
  payload: UpdateCustomizationRequest
): Promise<UpdateCustomizationResponse> => {
  const { data } = await api.put<UpdateCustomizationResponse>("/customization", payload);
  return data;
};
