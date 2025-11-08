import api from "../axios";

export interface User {
  id: number;
  discord_user_id: string;
  discord_username: string;
  discord_global_name: string | null;
  discord_avatar_url: string | null;
  role: string;
  created_at: string;
  last_login_at: string | null;
}

export interface DiscordAuthUrlResponse {
  url: string;
  state: string;
}

/**
 * Get the Discord OAuth authorization URL
 */
export const getDiscordAuthUrl = async (): Promise<DiscordAuthUrlResponse> => {
  const response = await api.get("/auth/discord/url");
  return response.data;
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get("/auth/me");
  return response.data;
};

/**
 * Logout the current user
 */
export const logout = async (): Promise<void> => {
  await api.post("/auth/logout");
};
