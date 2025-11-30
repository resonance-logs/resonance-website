import api from "../axios";

export interface GetSettingsResponse {
  anonymize_uploader: boolean;
  anonymize_players: boolean;
}

export interface UpdateSettingsRequest {
  anonymize_uploader?: boolean;
  anonymize_players?: boolean;
}

export interface UpdateSettingsResponse {
  anonymize_uploader: boolean;
  anonymize_players: boolean;
}

/**
 * Get current user settings
 */
export const getSettings = async (): Promise<GetSettingsResponse> => {
  const response = await api.get("/settings");
  return response.data;
};

/**
 * Update user settings
 */
export const updateSettings = async (
  settings: UpdateSettingsRequest
): Promise<UpdateSettingsResponse> => {
  const response = await api.put("/settings", settings);
  return response.data;
};
