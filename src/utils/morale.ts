/** Returns a face emoji representing a morale value (0–100). */
export function moraleEmoji(morale: number): string {
  if (morale >= 80) return '😄';
  if (morale >= 60) return '🙂';
  if (morale >= 40) return '😐';
  if (morale >= 20) return '😟';
  return '😡';
}
