/** Returns a face emoji representing a morale value (0–100). */
export function moraleEmoji(morale: number): string {
  if (morale >= 80) return '😄';
  if (morale >= 60) return '🙂';
  if (morale >= 40) return '😐';
  if (morale >= 20) return '😟';
  return '😡';
}

/** Returns a qualitative label for a morale value (0–100). Never expose raw numbers in UI. */
export function moraleLabel(morale: number): string {
  if (morale >= 80) return 'ECSTATIC';
  if (morale >= 60) return 'SETTLED';
  if (morale >= 40) return 'NEUTRAL';
  if (morale >= 20) return 'UNSETTLED';
  return 'DISGRUNTLED';
}
