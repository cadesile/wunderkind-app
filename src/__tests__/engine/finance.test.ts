import { calculateStaffSignOnFee, calculateStaffSeverance } from '@/engine/finance';

describe('calculateStaffSignOnFee', () => {
  it('returns a value within [totalValue * percentMin / 100, totalValue * percentMax / 100]', () => {
    const salary = 10_000;
    const duration = 52;
    const totalValue = salary * duration; // 520_000
    const fee = calculateStaffSignOnFee(salary, duration, 2, 8);
    expect(fee).toBeGreaterThanOrEqual(Math.round(totalValue * 2 / 100));
    expect(fee).toBeLessThanOrEqual(Math.round(totalValue * 8 / 100));
  });

  it('2yr fee is ~2x 1yr fee averaged over many trials', () => {
    let sum1 = 0, sum2 = 0;
    for (let i = 0; i < 1000; i++) {
      sum1 += calculateStaffSignOnFee(10_000, 52,  2, 8);
      sum2 += calculateStaffSignOnFee(10_000, 104, 2, 8);
    }
    expect(sum2 / sum1).toBeCloseTo(2.0, 0);
  });

  it('returns 0 when salary is 0', () => {
    expect(calculateStaffSignOnFee(0, 52, 2, 8)).toBe(0);
  });
});

describe('calculateStaffSeverance', () => {
  it('returns salary * weeksRemaining * percent / 100', () => {
    // 10_000 * 26 * 50 / 100 = 130_000
    expect(calculateStaffSeverance(10_000, 26, 50)).toBe(130_000);
  });

  it('returns 0 when no weeks remain', () => {
    expect(calculateStaffSeverance(10_000, 0, 50)).toBe(0);
  });

  it('returns 0 when severance percent is 0', () => {
    expect(calculateStaffSeverance(10_000, 52, 0)).toBe(0);
  });

  it('returns full remaining value when percent is 100', () => {
    expect(calculateStaffSeverance(5_000, 10, 100)).toBe(50_000);
  });
});
