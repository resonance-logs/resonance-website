import api from '../axios';

// Types
export interface PingResponse {
  status: string;
  timestamp: string;
  message?: string;
}

// Ping endpoint handlers
export const pingApi = {
  // Basic ping
  ping: async (): Promise<PingResponse> => {
    const response = await api.get<PingResponse>('/ping');
    return response.data;
  },

};

export default pingApi;
