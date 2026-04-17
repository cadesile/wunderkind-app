export function getLoyaltyNote(loyalty: number, clubName: string): string {
  if (loyalty >= 80) return `They really like ${clubName}. A solid relationship.`;
  if (loyalty >= 60) return `They think well of ${clubName} — keep it that way.`;
  if (loyalty >= 40) return `They seem fairly comfortable with ${clubName} for now.`;
  if (loyalty >= 20) return `They're not particularly attached to ${clubName}.`;
  return `Frankly, they couldn't care less about ${clubName}.`;
}

export function getDemandNote(demand: number): string {
  if (demand >= 9) return "Good luck dealing with this lot. They'll be watching closely.";
  if (demand >= 7) return "Don't be surprised if they knock on your door every now and then.";
  if (demand >= 4) return "Pretty reasonable — the odd check-in here and there.";
  return "Easy-going. You won't hear much from this one.";
}
