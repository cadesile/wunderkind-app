/**
 * Currency formatting utilities.
 * Backend stores all monetary values in pence (100 = £1.00).
 * Local Zustand stores use whole pounds — only use these formatters for API response data.
 */

/**
 * Format pence to currency with 2 decimal places.
 * @example formatCurrency(500000) → "£5,000.00"
 */
export const formatCurrency = (pence: number, symbol: string = '£'): string => {
  const pounds = pence / 100;
  return `${symbol}${pounds.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Format pence to whole pounds (no decimals).
 * @example formatCurrencyWhole(500000) → "£5,000"
 */
export const formatCurrencyWhole = (pence: number, symbol: string = '£'): string => {
  const pounds = Math.round(pence / 100);
  return `${symbol}${pounds.toLocaleString('en-GB')}`;
};

/**
 * Format pence to compact notation.
 * @example formatCurrencyCompact(500000) → "£5.0k"
 * @example formatCurrencyCompact(120000000) → "£1.2M"
 */
export const formatCurrencyCompact = (pence: number): string => {
  const pounds = pence / 100;

  if (pounds >= 1_000_000) {
    return `£${(pounds / 1_000_000).toFixed(1)}M`;
  } else if (pounds >= 1_000) {
    return `£${(pounds / 1_000).toFixed(1)}k`;
  }

  return formatCurrencyWhole(pence);
};

/**
 * Format whole pounds (already converted from pence) with £ prefix.
 * Handles negative values by prepending a minus sign.
 * @example formatPounds(5000) → "£5,000"
 * @example formatPounds(-200) → "-£200"
 */
export const formatPounds = (pounds: number, symbol: string = '£'): string => {
  const abs = Math.abs(pounds);
  const formatted = `${symbol}${abs.toLocaleString('en-GB')}`;
  return pounds < 0 ? `-${formatted}` : formatted;
};

/** Returns true when a balance value represents debt (negative). */
export const isDebt = (balance: number): boolean => balance < 0;

/** Returns the absolute value of debt, or 0 if not in debt. */
export const getDebtAmount = (balance: number): number =>
  balance < 0 ? Math.abs(balance) : 0;

/** Convert backend pence to whole pounds (integer). */
export const penceToPounds = (pence: number): number => Math.round(pence / 100);

/** Convert whole pounds to pence. */
export const poundsToPence = (pounds: number): number => Math.round(pounds * 100);

/**
 * Derive a player's asking price in whole pounds from their market fields.
 * currentOffer and marketValue are stored in pence; falls back to currentAbility × 10 if absent.
 */
export const getPlayerAskingPrice = (player: {
  currentOffer?: number | null;
  marketValue?: number | null;
  currentAbility: number;
}): number => Math.round((player.currentOffer ?? player.marketValue ?? player.currentAbility * 1000) / 100);
