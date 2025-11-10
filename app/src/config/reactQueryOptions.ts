// Centralized React Query defaults used across the app
export const STALE_TIME = 5 * 60 * 1000; // 5 minutes
export const CACHE_TIME = 15 * 60 * 1000; // 15 minutes

export const reactQueryOptions = {
  refetchOnWindowFocus: false,
  staleTime: STALE_TIME,
  cacheTime: CACHE_TIME,
};

export default reactQueryOptions;
