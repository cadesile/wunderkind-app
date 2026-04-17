import { SelectionService } from '../../engine/SelectionService';
import { Player, Position } from '../../types/player';

describe('SelectionService', () => {
  const createMockPlayer = (id: string, position: Position, overallRating: number, morale: number = 50): Player => ({
    id,
    name: `Player ${id}`,
    dateOfBirth: '2000-01-01',
    age: 20,
    position,
    nationality: 'Testland',
    overallRating,
    morale,
    potential: 3,
    wage: 1000,
    personality: {
      determination: 10,
      professionalism: 10,
      ambition: 10,
      loyalty: 10,
      adaptability: 10,
      pressure: 10,
      temperament: 10,
      consistency: 10,
    },
    agentId: null,
    joinedWeek: 1,
    isActive: true,
  });

  describe('calculateScore', () => {
    it('should calculate score correctly based on morale (neutral morale)', () => {
      const player = createMockPlayer('1', 'MID', 80, 50);
      // Formula: Ability * (1 + (Morale - 50) / 100)
      // 80 * (1 + (50 - 50) / 100) = 80 * 1 = 80
      expect(SelectionService.calculateScore(player)).toBe(80);
    });

    it('should calculate score correctly with high morale', () => {
      const player = createMockPlayer('1', 'MID', 80, 100);
      // 80 * (1 + (100 - 50) / 100) = 80 * 1.5 = 120
      expect(SelectionService.calculateScore(player)).toBe(120);
    });

    it('should calculate score correctly with low morale', () => {
      const player = createMockPlayer('1', 'MID', 80, 0);
      // 80 * (1 + (0 - 50) / 100) = 80 * 0.5 = 40
      expect(SelectionService.calculateScore(player)).toBe(40);
    });

    it('should handle missing morale by defaulting to 50', () => {
      const player = createMockPlayer('1', 'MID', 80);
      delete player.morale;
      expect(SelectionService.calculateScore(player)).toBe(80);
    });
  });

  describe('selectStartingXI', () => {
    it('should select best players for 4-4-2 formation when positions match exactly', () => {
      const players = [
        createMockPlayer('gk1', 'GK', 80),
        createMockPlayer('def1', 'DEF', 70),
        createMockPlayer('def2', 'DEF', 71),
        createMockPlayer('def3', 'DEF', 72),
        createMockPlayer('def4', 'DEF', 73),
        createMockPlayer('def5', 'DEF', 60), // Extra DEF
        createMockPlayer('mid1', 'MID', 75),
        createMockPlayer('mid2', 'MID', 76),
        createMockPlayer('mid3', 'MID', 77),
        createMockPlayer('mid4', 'MID', 78),
        createMockPlayer('mid5', 'MID', 65), // Extra MID
        createMockPlayer('fwd1', 'FWD', 85),
        createMockPlayer('fwd2', 'FWD', 86),
        createMockPlayer('fwd3', 'FWD', 80), // Extra FWD
      ];

      const selected = SelectionService.selectStartingXI(players, '4-4-2');

      expect(selected).toHaveLength(11);
      expect(selected.filter(p => p.position === 'GK')).toHaveLength(1);
      expect(selected.filter(p => p.position === 'DEF')).toHaveLength(4);
      expect(selected.filter(p => p.position === 'MID')).toHaveLength(4);
      expect(selected.filter(p => p.position === 'FWD')).toHaveLength(2);

      // Verify they are the best players
      expect(selected.map(p => p.id)).toContain('gk1');
      expect(selected.map(p => p.id)).toContain('def1');
      expect(selected.map(p => p.id)).toContain('def2');
      expect(selected.map(p => p.id)).toContain('def3');
      expect(selected.map(p => p.id)).toContain('def4');
      expect(selected.map(p => p.id)).not.toContain('def5');
      expect(selected.map(p => p.id)).toContain('mid1');
      expect(selected.map(p => p.id)).toContain('mid2');
      expect(selected.map(p => p.id)).toContain('mid3');
      expect(selected.map(p => p.id)).toContain('mid4');
      expect(selected.map(p => p.id)).not.toContain('mid5');
      expect(selected.map(p => p.id)).toContain('fwd1');
      expect(selected.map(p => p.id)).toContain('fwd2');
      expect(selected.map(p => p.id)).not.toContain('fwd3');
    });
  });
});
