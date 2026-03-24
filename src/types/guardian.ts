export type GuardianGender = 'male' | 'female';

export interface Guardian {
  id: string;
  playerId: string;
  firstName: string;
  lastName: string;      // always matches player surname
  gender: GuardianGender;
  demandLevel: number;   // 1–10, mutable
  loyaltyToAcademy: number; // 0–100, mutable
  ignoredRequestCount: number; // increments on decline, resets on any response
}
