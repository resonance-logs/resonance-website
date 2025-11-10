/**
 * Formats a number into abbreviated form (e.g., 1.2k, 1.5m, 2.3b)
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string with abbreviation
 */
export function formatNumber(value: number | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined || isNaN(value)) return '0';
  if (!isFinite(value)) return '0';

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  const abbreviations = [
    { threshold: 1_000_000_000, suffix: 'b' },
    { threshold: 1_000_000, suffix: 'm' },
    { threshold: 1_000, suffix: 'k' },
  ];

  for (const { threshold, suffix } of abbreviations) {
    if (absValue >= threshold) {
      const abbreviated = absValue / threshold;
      return `${sign}${abbreviated.toFixed(decimals)}${suffix}`;
    }
  }

  // For numbers less than 1000, show without decimals
  return `${sign}${Math.round(absValue)}`;
}

/**
 * Formats a number with thousand separators
 * @param value - The number to format
 * @returns Formatted string with commas
 */
export function formatNumberWithCommas(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0';
  if (!isFinite(value)) return '0';

  return value.toLocaleString();
}
