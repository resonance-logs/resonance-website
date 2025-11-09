import api from "../axios";

export interface ApiKeyMeta {
  has_key: boolean;
  created_at?: string;
  revoked_at?: string | null;
  last_used_at?: string | null;
}

export interface ApiKeyGenerateResponse {
  plaintext_key: string;
  meta: ApiKeyMeta;
}

export const getApiKeyMeta = async (): Promise<ApiKeyMeta> => {
  const res = await api.get("/apikey");
  return res.data;
};

export const generateApiKey = async (): Promise<ApiKeyGenerateResponse> => {
  const res = await api.post("/apikey");
  return res.data;
};
