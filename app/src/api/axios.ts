import axios from 'axios';

// Create main axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_REVERSE_PROXY_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies in requests
});

export default api;
