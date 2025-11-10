/**
 * Gets the duration in seconds between two dates
 * @param startDate - Start date/timestamp (ISO string, Date, or timestamp)
 * @param endDate - End date/timestamp (ISO string, Date, or timestamp)
 * @returns Duration in seconds
 */
export function getDuration(startDate?: string | Date | number | null, endDate?: string | Date | number | null): number {
  if (!startDate || !endDate) return 0;

  const startMs = typeof startDate === 'string' ? new Date(startDate).getTime() :
                  startDate instanceof Date ? startDate.getTime() : startDate;
  const endMs = typeof endDate === 'string' ? new Date(endDate).getTime() :
                endDate instanceof Date ? endDate.getTime() : endDate;

  const durationSeconds = Math.floor((endMs - startMs) / 1000);

  return durationSeconds < 0 ? 0 : durationSeconds;
}

/**
 * Formats a duration between two dates to MM:SS format
 * @param startDate - Start date/timestamp (ISO string, Date, or timestamp)
 * @param endDate - End date/timestamp (ISO string, Date, or timestamp)
 * @returns Formatted string like "05:30" or "125:45"
 */
export function formatDuration(startDate?: string | Date | number | null, endDate?: string | Date | number | null): string {
  const durationSeconds = getDuration(startDate, endDate);

  if (durationSeconds === 0) return "00:00";

  const mins = Math.floor(durationSeconds / 60);
  const secs = Math.floor(durationSeconds % 60);

  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Formats a timestamp to a relative time string
 * @param timestamp - ISO date string, Date object, or Unix timestamp (in seconds or milliseconds)
 * @returns Formatted string like "5 minutes ago" or "2 hours ago"
 */
export function formatRelativeTime(timestamp?: string | Date | number | null): string {
  if (!timestamp) return "Unknown";

  let timestampMs: number;

  if (typeof timestamp === 'string') {
    timestampMs = new Date(timestamp).getTime();
  } else if (timestamp instanceof Date) {
    timestampMs = timestamp.getTime();
  } else {
    // Convert to milliseconds if needed (assume timestamps < 10000000000 are in seconds)
    timestampMs = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  }

  const now = Date.now();
  const diffMs = now - timestampMs;
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 0) return "Just now";

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const count = Math.floor(diffSeconds / secondsInUnit);
    if (count >= 1) {
      return `${count} ${unit}${count > 1 ? 's' : ''} ago`;
    }
  }

  return "Just now";
}
