import React, { useState, useMemo, useEffect } from 'react';
import { View, FlatList, ScrollView, Modal, Pressable } from 'react-native';
import { FAB_CLEARANCE } from './_layout';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { SlidersHorizontal } from 'lucide-react-native';
import { useFacilityStore, facilityUpgradeCost, calculateFacilityUpkeep } from '@/stores/facilityStore';
import { calculateTotalUpkeep } from '@/utils/facilityUpkeep';
import { repairFacilityCost } from '@/types/facility';
import type { FacilityTemplate } from '@/types/facility';
import { useClubStore } from '@/stores/clubStore';
import { useCoachStore } from '@/stores/coachStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useMarketStore } from '@/stores/marketStore';
import { useScoutStore } from '@/stores/scoutStore';
import { useGameConfigStore } from '@/stores/gameConfigStore';
import { useArchetypeStore } from '@/stores/archetypeStore';
import { useDofScoutingConfigStore } from '@/stores/dofScoutingConfigStore';
import type { ScoutPosition, ScoutTargetType } from '@/stores/dofScoutingConfigStore';
import { PixelText, BodyText } from '@/components/ui/PixelText';
import { PixelTopTabBar } from '@/components/ui/PixelTopTabBar';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { FlagText } from '@/components/ui/FlagText';
import { PixelDialog } from '@/components/ui/PixelDialog';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { Money } from '@/components/ui/Money';
import { WK, pixelShadow } from '@/constants/theme';
import { hapticTap } from '@/utils/haptics';
import { penceToPounds } from '@/utils/currency';
import { nationalityToCode } from '@/utils/nationality';
import { TIER_ORDER } from '@/types/club';
import type { ClubTier } from '@/types/club';
import { MarketCoach, MarketScout } from '@/types/market';
import { getArchetypeForPlayer } from '@/engine/archetypeEngine';
import { generateAppearance } from '@/engine/appearance';
import { calculateStaffSignOnFee } from '@/engine/finance';
import type { Player } from '@/types/player';

const DURATION_OPTIONS = [
  { weeks: 52,  label: '1 YEAR' },
  { weeks: 104, label: '2 YEARS' },
  { weeks: 156, label: '3 YEARS' },
] as const;

function isoToFlag(code: string): string {
  if (!code || code.length !== 2) return '';
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

function nationalityFlag(nationality: string): string {
  return isoToFlag(nationalityToCode(nationality));
}

// ─── Category definition ──────────────────────────────────────────────────────

type FacilityCategory = 'TRAINING' | 'MEDICAL' | 'SCOUTING';
type FacilitiesTab = FacilityCategory | 'HIRE';

const CATEGORIES: { id: FacilityCategory; label: string }[] = [
  { id: 'TRAINING', label: 'TRAINING' },
  { id: 'MEDICAL',  label: 'MEDICAL'  },
  { id: 'SCOUTING', label: 'SCOUTING' },
];

const ALL_TABS = [...CATEGORIES.map((c) => c.label), 'HIRE'] as const;

// ─── Benefit labels (client-side game logic) ──────────────────────────────────

const LEVEL_BENEFIT_LABELS: Record<string, (level: number) => string> = {
  technical_zone:  (l) => l === 0 ? 'INACTIVE' : `+${(l * 5).toFixed(0)}% XP BOOST`,
  strength_suite:  (l) => l === 0 ? 'INACTIVE' : `+${(l * 2).toFixed(0)}% POWER/STAM XP`,
  tactical_room:   (l) => l === 0 ? 'INACTIVE' : `+${(l * 5).toFixed(0)}% COACH PERF`,
  physio_clinic:   (l) => l === 0 ? 'INACTIVE' : `-${(l * 8).toFixed(0)}% INJURY PROB · MAX ${10 + l * 3} PLAYERS`,
  hydro_pool:      (l) => l === 0 ? 'INACTIVE' : `-${(l * 10).toFixed(0)}% RECOVERY TIME`,
  scouting_center: (l) => l === 0 ? 'INACTIVE' : `SCOUTING ACTIVE · +${(l * 0.8).toFixed(1)} REP/WK`,
};

function benefitLabel(slug: string, level: number): string {
  return LEVEL_BENEFIT_LABELS[slug]?.(level) ?? (level === 0 ? 'INACTIVE' : `LEVEL ${level} ACTIVE`);
}

/** Condition bar colour: ≥60 teal, ≥30 orange, <30 red */
function conditionColor(pct: number): string {
  if (pct >= 60) return WK.tealLight;
  if (pct >= 30) return WK.orange;
  return WK.red;
}

// ─── Scouting Config Card (DOF) ───────────────────────────────────────────────

const SCOUT_POSITIONS: ScoutPosition[] = ['GK', 'DEF', 'MID', 'FWD'];
const TARGET_TYPE_OPTIONS: { id: ScoutTargetType; label: string; desc: string }[] = [
  { id: 'FIRST_TEAM',    label: 'FIRST TEAM',    desc: 'Better than top 3 players' },
  { id: 'SQUAD_PLAYER',  label: 'SQUAD PLAYER',  desc: 'Better than bottom 50%' },
  { id: 'NO_RESTRICTION', label: 'NO RESTRICTION', desc: 'Sign whoever the manager wants' },
];

function ScoutingConfigCard() {
  const { config, togglePosition, setTargetType } = useDofScoutingConfigStore();

  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.yellow,
      padding: 12,
      marginBottom: 10,
      ...pixelShadow,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <PixelText size={8} color={WK.yellow}>DOF SCOUTING CONFIG</PixelText>
      </View>

      {/* Position multi-select */}
      <BodyText size={11} dim style={{ marginBottom: 6 }}>POSITION</BodyText>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
        {SCOUT_POSITIONS.map((pos) => {
          const active = config.positions.includes(pos);
          return (
            <Pressable
              key={pos}
              onPress={() => { hapticTap(); togglePosition(pos); }}
              style={{
                flex: 1,
                paddingVertical: 8,
                alignItems: 'center',
                backgroundColor: active ? WK.yellow : WK.tealMid,
                borderWidth: 2,
                borderColor: active ? WK.yellow : WK.border,
              }}
            >
              <PixelText size={8} color={active ? WK.border : WK.dim}>{pos}</PixelText>
            </Pressable>
          );
        })}
      </View>

      {/* Target type single-select */}
      <BodyText size={11} dim style={{ marginBottom: 6 }}>TYPE</BodyText>
      <View style={{ gap: 6 }}>
        {TARGET_TYPE_OPTIONS.map((opt) => {
          const active = config.targetType === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => { hapticTap(); setTargetType(opt.id); }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 10,
                paddingVertical: 8,
                backgroundColor: active ? WK.yellow : WK.tealMid,
                borderWidth: 2,
                borderColor: active ? WK.yellow : WK.border,
              }}
            >
              <PixelText size={8} color={active ? WK.border : WK.text}>{opt.label}</PixelText>
              <BodyText size={11} color={active ? WK.tealDark : WK.dim}>{opt.desc}</BodyText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Facility card ────────────────────────────────────────────────────────────

function FacilityCard({
  template,
  level,
  condition,
  balancePence,
}: {
  template: FacilityTemplate;
  level: number;
  condition: number;
  balancePence: number;
}) {
  const { upgradeLevel, repairFacility } = useFacilityStore();
  const { club } = useClubStore();
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [repairModalVisible, setRepairModalVisible] = useState(false);

  const upgradeCost     = facilityUpgradeCost(template, level);
  const maintenance     = calculateFacilityUpkeep(template, level);
  const nextMaintenance = calculateFacilityUpkeep(template, level + 1);
  const repairCost      = repairFacilityCost(level, condition, template.baseCost);

  const canAffordUpgrade = balancePence >= upgradeCost;
  const canAffordRepair  = balancePence >= repairCost;
  const atMax      = level >= template.maxLevel;
  const levelPct   = (level / template.maxLevel) * 100;
  const needsRepair = level > 0 && condition < 100;

  function confirmUpgrade() {
    setUpgradeModalVisible(false);
    upgradeLevel(template.slug);
    useFinanceStore.getState().addTransaction({
      amount:      -upgradeCost,
      category:    'facility_upgrade',
      description: `Upgraded ${template.label} to level ${level + 1}`,
      weekNumber:  club.weekNumber ?? 1,
    });
  }

  function confirmRepair() {
    setRepairModalVisible(false);
    repairFacility(template.slug);
  }

  const condColor  = conditionColor(condition);
  const cardBorder = level > 0
    ? (condition < 30 ? WK.red : WK.tealLight)
    : WK.border;

  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: cardBorder,
      padding: 12,
      marginBottom: 10,
      ...pixelShadow,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <BodyText size={15} upper style={{ flex: 1 }}>{template.label}</BodyText>
        <View style={{
          borderWidth: 2,
          borderColor: level > 0 ? WK.yellow : WK.border,
          paddingHorizontal: 6,
          paddingVertical: 3,
        }}>
          <PixelText size={7} color={level > 0 ? WK.yellow : WK.dim}>LV {level}</PixelText>
        </View>
      </View>

      <BodyText size={13} color={WK.tealLight} style={{ marginBottom: 2 }}>
        ◆ {benefitLabel(template.slug, level)}
      </BodyText>

      <BodyText size={12} dim style={{ marginBottom: 10 }}>{template.description}</BodyText>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
            <BodyText size={11} dim>LEVEL</BodyText>
            <BodyText size={11} dim>{level}/{template.maxLevel}</BodyText>
          </View>
          <View style={{ height: 6, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: WK.border }}>
            <View style={{ height: '100%', width: `${levelPct}%`, backgroundColor: WK.tealLight }} />
          </View>
        </View>

        {level > 0 && (
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <BodyText size={11} dim>CONDITION</BodyText>
              <BodyText size={11} color={condColor}>{Math.round(condition)}%</BodyText>
            </View>
            <View style={{ height: 6, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: WK.border }}>
              <View style={{ height: '100%', width: `${condition}%`, backgroundColor: condColor }} />
            </View>
          </View>
        )}
      </View>

      <BodyText size={12} dim style={{ marginBottom: 12 }}>
        MAINT: {maintenance === 0 ? 'FREE' : <Money pence={maintenance} dim />}
        {!atMax ? <>  ·  LV{level + 1}: <Money pence={nextMaintenance} dim /></> : ''}
      </BodyText>

      <View style={{ gap: 8 }}>
        {needsRepair && (
          <Button
            label={`REPAIR  £${Math.round(repairCost / 100).toLocaleString()}`}
            variant={condition < 30 ? 'orange' : 'teal'}
            fullWidth
            onPress={() => setRepairModalVisible(true)}
            disabled={!canAffordRepair}
          />
        )}

        {atMax ? (
          <View style={{ borderWidth: 2, borderColor: WK.dim, padding: 8, alignItems: 'center' }}>
            <PixelText size={7} dim>MAX LEVEL</PixelText>
          </View>
        ) : (
          <Button
            label={`UPGRADE → LV${level + 1}  £${Math.round(upgradeCost / 100).toLocaleString()}`}
            variant={canAffordUpgrade ? 'yellow' : 'teal'}
            fullWidth
            onPress={() => setUpgradeModalVisible(true)}
            disabled={!canAffordUpgrade}
          />
        )}
      </View>

      <Modal visible={upgradeModalVisible} transparent animationType="fade" onRequestClose={() => setUpgradeModalVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setUpgradeModalVisible(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{ backgroundColor: WK.tealCard, borderWidth: 4, borderColor: WK.yellow, padding: 20, minWidth: 280, maxWidth: 340, ...pixelShadow }}>
              <PixelText size={9} upper style={{ marginBottom: 12 }}>Upgrade {template.label}</PixelText>
              {!canAffordUpgrade ? (
                <View style={{ marginBottom: 20 }}>
                  <BodyText size={13} color={WK.orange}>
                    INSUFFICIENT FUNDS — need
                  </BodyText>
                  <Money pence={upgradeCost} color={WK.orange} size={13} />
                </View>
              ) : (
                <>
                  <BodyText size={13} dim style={{ marginBottom: 4 }}>LEVEL {level} → {level + 1}</BodyText>
                  <View style={{ flexDirection: 'row', gap: 4, marginBottom: 20 }}>
                    <BodyText size={13} color={WK.yellow}>COST:</BodyText>
                    <Money pence={upgradeCost} color={WK.yellow} size={13} />
                  </View>
                </>
              )}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button label="CANCEL" variant="teal" onPress={() => setUpgradeModalVisible(false)} style={{ flex: 1 }} />
                {canAffordUpgrade && <Button label="UPGRADE" variant="yellow" onPress={confirmUpgrade} style={{ flex: 1 }} />}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={repairModalVisible} transparent animationType="fade" onRequestClose={() => setRepairModalVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setRepairModalVisible(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{ backgroundColor: WK.tealCard, borderWidth: 4, borderColor: WK.orange, padding: 20, minWidth: 280, maxWidth: 340, ...pixelShadow }}>
              <PixelText size={9} upper style={{ marginBottom: 12 }}>Repair {template.label}</PixelText>
              {!canAffordRepair ? (
                <View style={{ marginBottom: 20 }}>
                  <BodyText size={13} color={WK.red}>
                    INSUFFICIENT FUNDS — need
                  </BodyText>
                  <Money pence={repairCost} color={WK.red} size={13} />
                </View>
              ) : (
                <>
                  <BodyText size={13} dim style={{ marginBottom: 4 }}>CONDITION {Math.round(condition)}% → 100%</BodyText>
                  <View style={{ flexDirection: 'row', gap: 4, marginBottom: 20 }}>
                    <BodyText size={13} color={WK.orange}>COST:</BodyText>
                    <Money pence={repairCost * 100} color={WK.orange} size={13} />
                  </View>
                </>
              )}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button label="CANCEL" variant="teal" onPress={() => setRepairModalVisible(false)} style={{ flex: 1 }} />
                {canAffordRepair && <Button label="REPAIR" variant="orange" onPress={confirmRepair} style={{ flex: 1 }} />}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Hire Pane ────────────────────────────────────────────────────────────────

type HireItem =
  | { kind: 'coach'; data: MarketCoach }
  | { kind: 'scout'; data: MarketScout };

function formatStaffRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getRoleCap(
  role: string,
  config: ReturnType<typeof useGameConfigStore.getState>['config'],
): number {
  switch (role) {
    case 'manager':              return config.maxManagersPerClub;
    case 'director_of_football': return config.maxDirectorsOfFootballPerClub;
    case 'facility_manager':     return config.maxFacilityManagersPerClub;
    case 'chairman':             return config.maxChairmensPerClub;
    case 'scout':                return config.maxScoutsPerClub;
    default:                     return config.maxCoachesPerClub;
  }
}

type CapBlock = { name: string; role: string; nationality?: string; influence?: number; appearance?: any; morale?: number; age?: number; personality?: any };

function HirePane({
  selectedRole,
  setSelectedRole,
}: {
  selectedRole: string;
  setSelectedRole: (role: string) => void;
}) {
  const coaches      = useMarketStore((s) => s.coaches);
  const marketScouts = useMarketStore((s) => s.marketScouts);
  const hireCoach    = useMarketStore((s) => s.hireCoach);
  const hireScout    = useMarketStore((s) => s.hireScout);
  const refreshPool  = useMarketStore((s) => s.refreshMarketPool);
  const isLoading    = useMarketStore((s) => s.isLoading);

  const { club } = useClubStore();
  const hiredCoaches = useCoachStore((s) => s.coaches);
  const hiredScouts  = useScoutStore((s) => s.scouts);
  const config       = useGameConfigStore((s) => s.config);
  const staffRoles   = config.staffRoles;
  const archetypes   = useArchetypeStore((s) => s.archetypes);

  const weekNumber  = club.weekNumber ?? 1;
  const clubTierKey = (club.reputationTier?.toLowerCase() ?? 'local') as ClubTier;

  const [showRoleFilter, setShowRoleFilter] = useState(false);
  const [selectedTier, setSelectedTier]     = useState<string>('ALL');
  const [signError, setSignError]           = useState<string | null>(null);
  const [tierPopup, setTierPopup]           = useState<{ item: HireItem; quote: string } | null>(null);
  const [capPopup, setCapPopup]             = useState<CapBlock | null>(null);
  const [hirePending, setHirePending]       = useState<HireItem | null>(null);
  const [hireError, setHireError]           = useState<string | null>(null);

  const TIER_REJECTION_QUOTES = [
    "Sorry, I'm not interested in working at this level.",
    "I appreciate the offer, but this club isn't where I see my career going.",
    "I'm flattered, but I need a bigger stage to show what I can do.",
    "My ambitions don't quite align with where you are right now.",
  ];
  function showTierPopup(item: HireItem) {
    const quote = TIER_REJECTION_QUOTES[Math.floor(Math.random() * TIER_REJECTION_QUOTES.length)];
    setTierPopup({ item, quote });
  }

  function getCapBlock(role: string): CapBlock | null {
    const cap = getRoleCap(role, config);
    const coachesOfRole = hiredCoaches.filter((c) => c.role === role);
    const scoutsOfRole  = role === 'scout' ? hiredScouts : [];
    const total = coachesOfRole.length + scoutsOfRole.length;
    if (total < cap) return null;
    if (coachesOfRole.length > 0) {
      const c = coachesOfRole[0];
      return { name: c.name, role: c.role, nationality: c.nationality, influence: c.influence, appearance: c.appearance, morale: c.morale, age: c.age, personality: c.personality };
    }
    const s = scoutsOfRole[0];
    return { name: s.name, role: s.role, nationality: s.nationality };
  }

  const roleOptions = useMemo(() => {
    const roles = ['ALL', ...staffRoles];
    if (!roles.includes('scout')) roles.push('scout');
    return roles;
  }, [staffRoles]);

  const [visibleCount, setVisibleCount] = useState(10);

  // Normalize to 0–100: coaches use influence (1–20) × 5, scouts use successRate directly
  function getAbility(item: HireItem): number {
    return item.kind === 'coach'
      ? (item.data as MarketCoach).influence * 5
      : (item.data as MarketScout).successRate;
  }

  const allItems: HireItem[] = [
    ...coaches.map((c) => ({ kind: 'coach' as const, data: c })),
    ...marketScouts.map((s) => ({ kind: 'scout' as const, data: s })),
  ];

  const filtered = (
    selectedRole === 'ALL'
      ? allItems
      : allItems.filter((item) => item.data.role === selectedRole)
  ).filter((item) =>
    selectedTier === 'ALL' || (item.data.tier ?? 'local') === selectedTier,
  ).sort((a, b) => getAbility(b) - getAbility(a));

  const allVisibleItems = filtered.map((item) => {
    const itemTierKey = (item.data.tier ?? 'local') as ClubTier;
    const tierRestricted = TIER_ORDER[itemTierKey] > TIER_ORDER[clubTierKey];
    const signingFeePounds = Math.round((item.data.salary * 4) / 100);
    const canAfford = (club.balance ?? 0) >= signingFeePounds;
    return { ...item, tierRestricted, canAfford, signingFeePounds };
  });

  const visibleItems = allVisibleItems.slice(0, visibleCount);
  const hasMore = allVisibleItems.length > visibleCount;

  function signCoach(mc: MarketCoach, durationWeeks: number) {
    const block = getCapBlock(mc.role);
    if (block) { setCapPopup(block); return; }
    const feePence = calculateStaffSignOnFee(mc.salary, durationWeeks, config.staffSignOnFeePercentMin, config.staffSignOnFeePercentMax);
    if ((club.balance ?? 0) < feePence) {
      setHireError(`INSUFFICIENT FUNDS — need £${Math.round(feePence / 100).toLocaleString()}`);
      return;
    }
    useFinanceStore.getState().addTransaction({
      amount:      -feePence,
      category:    'staff_sign_on',
      description: `Signed ${mc.firstName} ${mc.lastName} (${durationWeeks / 52} yr)`,
      weekNumber,
    });
    hireCoach(mc.id, weekNumber, durationWeeks);
    setHirePending(null);
    setHireError(null);
  }

  function signScout(ms: MarketScout, durationWeeks: number) {
    const block = getCapBlock(ms.role);
    if (block) { setCapPopup(block); return; }
    const feePence = calculateStaffSignOnFee(ms.salary, durationWeeks, config.staffSignOnFeePercentMin, config.staffSignOnFeePercentMax);
    if ((club.balance ?? 0) < feePence) {
      setHireError(`INSUFFICIENT FUNDS — need £${Math.round(feePence / 100).toLocaleString()}`);
      return;
    }
    useFinanceStore.getState().addTransaction({
      amount:      -feePence,
      category:    'staff_sign_on',
      description: `Signed ${ms.firstName} ${ms.lastName} (${durationWeeks / 52} yr)`,
      weekNumber,
    });
    hireScout(ms.id, weekNumber, durationWeeks);
    setHirePending(null);
    setHireError(null);
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 8,
        borderBottomWidth: 2, borderBottomColor: WK.border,
      }}>
        <BodyText size={11} dim>{allVisibleItems.length} AVAILABLE</BodyText>
        <Pressable
          onPress={() => { hapticTap(); setShowRoleFilter(true); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          {(() => {
            const hasFilter = selectedRole !== 'ALL' || selectedTier !== 'ALL';
            const label = [
              selectedRole !== 'ALL' ? formatStaffRole(selectedRole).toUpperCase() : null,
              selectedTier !== 'ALL' ? selectedTier.toUpperCase() : null,
            ].filter(Boolean).join(' · ') || 'FILTER';
            return (
              <>
                <SlidersHorizontal size={14} color={hasFilter ? WK.yellow : WK.dim} />
                <PixelText size={7} color={hasFilter ? WK.yellow : WK.dim}>{label}</PixelText>
              </>
            );
          })()}
        </Pressable>
      </View>

      <FlatList
        data={visibleItems}
        keyExtractor={(item) => `${item.kind}-${item.data.id}`}
        contentContainerStyle={{ padding: 10, paddingBottom: FAB_CLEARANCE }}
        onRefresh={refreshPool}
        refreshing={isLoading}
        renderItem={({ item }) => {
          const { tierRestricted, canAfford, signingFeePounds } = item;
          const isDisabled = tierRestricted || !canAfford;

          if (item.kind === 'coach') {
            const mc = item.data;
            const coachAppearance = generateAppearance(mc.id, 'COACH', 35);
            return (
              <Pressable
                onPress={() => {
                  if (tierRestricted) { showTierPopup(item); return; }
                  setHireError(null);
                  setHirePending(item);
                }}
                style={[{
                  backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border,
                  padding: 12, marginBottom: 10, ...pixelShadow,
                  opacity: isDisabled ? 0.55 : 1,
                }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Avatar appearance={coachAppearance} role="COACH" size={44} />
                  <View style={{ flex: 1 }}>
                    <BodyText size={14} upper numberOfLines={1}>{`${mc.firstName} ${mc.lastName}`}</BodyText>
                    <PixelText size={8} color={WK.tealLight}>{formatStaffRole(mc.role).toUpperCase()}</PixelText>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                      <FlagText nationality={mc.nationality} size={11} />
                      <BodyText size={11} dim>· </BodyText>
                      <Money pence={mc.salary} dim size={11} />
                      <BodyText size={11} dim>/wk</BodyText>
                    </View>
                    {mc.specialisms && Object.keys(mc.specialisms).length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                        {Object.entries(mc.specialisms).map(([spec, strength]) => (
                          <View key={spec} style={{
                            flexDirection: 'row', alignItems: 'center', gap: 3,
                            paddingHorizontal: 5, paddingVertical: 2,
                            backgroundColor: WK.tealDark,
                            borderWidth: 1, borderColor: WK.tealLight,
                          }}>
                            <PixelText size={6} color={WK.tealLight}>{spec.toUpperCase()}</PixelText>
                            <PixelText size={6} color={WK.yellow}>{strength}</PixelText>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Badge label={`INF ${mc.influence}`} color="yellow" />
                    <View style={{ flexDirection: 'row', gap: 3 }}>
                      <BodyText size={10} dim>Fee:</BodyText>
                      <Money pence={mc.salary * 4} dim size={10} />
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          }

          const ms = item.data;
          const scoutAppearance = generateAppearance(ms.id, 'SCOUT', 35);
          const rangeLabel: Record<string, string> = { local: 'LOCAL', national: 'NATIONAL', international: 'INTL' };
          const rangeColor: Record<string, string> = { local: WK.dim, national: WK.yellow, international: WK.red };
          const range = ms.scoutingRange ?? 'local';
          return (
            <Pressable
              onPress={() => {
                if (tierRestricted) { showTierPopup(item); return; }
                setHireError(null);
                setHirePending(item);
              }}
              style={[{
                backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border,
                padding: 12, marginBottom: 10, ...pixelShadow,
                opacity: isDisabled ? 0.55 : 1,
              }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Avatar appearance={scoutAppearance} role="SCOUT" size={44} />
                <View style={{ flex: 1 }}>
                  <BodyText size={14} upper numberOfLines={1}>{`${ms.firstName} ${ms.lastName}`}</BodyText>
                  <PixelText size={8} color={rangeColor[range]}>{`${rangeLabel[range] ?? ''} SCOUT`}</PixelText>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <FlagText nationality={ms.nationality} size={11} />
                    <BodyText size={11} dim>· </BodyText>
                    <Money pence={ms.salary} dim size={11} />
                    <BodyText size={11} dim>/wk</BodyText>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Badge label={`${ms.successRate}%`} color="green" />
                  <View style={{ flexDirection: 'row', gap: 3 }}>
                    <BodyText size={10} dim>Fee:</BodyText>
                    <Money pence={ms.salary * 4} dim size={10} />
                  </View>
                </View>              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <BodyText size={12} dim style={{ textAlign: 'center', marginTop: 32 }}>NO STAFF AVAILABLE</BodyText>
        }
        ListFooterComponent={
          hasMore ? (
            <Pressable
              onPress={() => { hapticTap(); setVisibleCount((n) => n + 10); }}
              style={{
                marginTop: 4,
                marginBottom: 16,
                paddingVertical: 12,
                alignItems: 'center',
                borderWidth: 2,
                borderColor: WK.border,
                backgroundColor: WK.tealMid,
              }}
            >
              <PixelText size={8} color={WK.yellow}>LOAD MORE</PixelText>
            </Pressable>
          ) : null
        }
      />

      <Modal visible={showRoleFilter} transparent animationType="fade" onRequestClose={() => setShowRoleFilter(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }} onPress={() => setShowRoleFilter(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{ backgroundColor: WK.tealCard, borderTopWidth: 3, borderTopColor: WK.border, padding: 16, paddingBottom: 32 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
                <PixelText size={9} upper>FILTERS</PixelText>
                <Pressable onPress={() => setShowRoleFilter(false)}>
                  <PixelText size={9} color={WK.dim}>✕</PixelText>
                </Pressable>
              </View>

              {/* Role */}
              <BodyText size={11} dim style={{ marginBottom: 8 }}>ROLE</BodyText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {roleOptions.map((role) => (
                  <Pressable
                    key={role}
                    onPress={() => { hapticTap(); setSelectedRole(role); setVisibleCount(10); }}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 8,
                      backgroundColor: selectedRole === role ? WK.yellow : WK.tealMid,
                      borderWidth: 2,
                      borderColor: selectedRole === role ? WK.yellow : WK.border,
                    }}
                  >
                    <PixelText size={7} color={selectedRole === role ? WK.border : WK.text}>
                      {role === 'ALL' ? 'ALL' : formatStaffRole(role).toUpperCase()}
                    </PixelText>
                  </Pressable>
                ))}
              </View>

              {/* Tier */}
              <BodyText size={11} dim style={{ marginBottom: 8 }}>TIER</BodyText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(['ALL', 'local', 'regional', 'national', 'elite'] as const).map((tier) => (
                  <Pressable
                    key={tier}
                    onPress={() => { hapticTap(); setSelectedTier(tier); setVisibleCount(10); }}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 8,
                      backgroundColor: selectedTier === tier ? WK.yellow : WK.tealMid,
                      borderWidth: 2,
                      borderColor: selectedTier === tier ? WK.yellow : WK.border,
                    }}
                  >
                    <PixelText size={7} color={selectedTier === tier ? WK.border : WK.text}>
                      {tier === 'ALL' ? 'ALL' : tier.toUpperCase()}
                    </PixelText>
                  </Pressable>
                ))}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {signError && (
        <PixelDialog visible title="SIGN FAILED" message={signError} onConfirm={() => setSignError(null)} onClose={() => setSignError(null)} />
      )}

      {/* Duration picker modal */}
      <Modal visible={!!hirePending} transparent animationType="fade" onRequestClose={() => { setHirePending(null); setHireError(null); }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'center', alignItems: 'center' }} onPress={() => { setHirePending(null); setHireError(null); }}>
          <Pressable onPress={() => {}} style={{ width: '90%' }}>
            <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.yellow, padding: 16, ...pixelShadow }}>
              <PixelText size={9} upper style={{ textAlign: 'center', marginBottom: 6 }}>Choose Contract Length</PixelText>
              {hirePending && (() => {
                const name = hirePending.kind === 'coach'
                  ? `${hirePending.data.firstName} ${hirePending.data.lastName}`
                  : `${hirePending.data.firstName} ${hirePending.data.lastName}`;
                return <PixelText size={7} color={WK.tealLight} style={{ textAlign: 'center', marginBottom: 14 }}>{name}</PixelText>;
              })()}
              {hireError && (
                <PixelText size={6} color={WK.red} style={{ marginBottom: 10, textAlign: 'center' }}>{hireError}</PixelText>
              )}
              <View style={{ gap: 8 }}>
                {hirePending && DURATION_OPTIONS.map((opt) => {
                  const salary = hirePending.data.salary;
                  const fee = calculateStaffSignOnFee(salary, opt.weeks, config.staffSignOnFeePercentMin, config.staffSignOnFeePercentMax);
                  return (
                    <Button
                      key={opt.weeks}
                      label={`${opt.label}  —  £${Math.round(fee / 100).toLocaleString()} sign-on`}
                      variant="yellow"
                      fullWidth
                      onPress={() => {
                        if (hirePending.kind === 'coach') {
                          signCoach(hirePending.data as MarketCoach, opt.weeks);
                        } else {
                          signScout(hirePending.data as MarketScout, opt.weeks);
                        }
                      }}
                    />
                  );
                })}
                <Button label="CANCEL" variant="teal" fullWidth onPress={() => { setHirePending(null); setHireError(null); }} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      {tierPopup && (() => {
        const { item, quote } = tierPopup;
        const isTierCoach = item.kind === 'coach';
        const tierData    = item.data;
        const tierAppearance = generateAppearance(tierData.id, isTierCoach ? 'COACH' : 'SCOUT', 35);
        return (
          <Modal visible transparent animationType="fade" onRequestClose={() => setTierPopup(null)}>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 24 }} onPress={() => setTierPopup(null)}>
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, padding: 20, ...pixelShadow }}>
                  {/* Staff card */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <Avatar appearance={tierAppearance} role={isTierCoach ? 'COACH' : 'SCOUT'} size={52} />
                    <View style={{ flex: 1 }}>
                      <BodyText size={14} upper numberOfLines={1}>
                        {isTierCoach
                          ? `${(tierData as MarketCoach).firstName} ${(tierData as MarketCoach).lastName}`
                          : `${(tierData as MarketScout).firstName} ${(tierData as MarketScout).lastName}`}
                      </BodyText>
                      <PixelText size={7} color={WK.tealLight} style={{ marginTop: 2 }}>
                        {formatStaffRole(tierData.role).toUpperCase()}
                      </PixelText>
                      <FlagText nationality={tierData.nationality} size={11} style={{ marginTop: 4 }} />
                    </View>
                  </View>
                  {/* Speech bubble */}
                  <View style={{ backgroundColor: WK.tealMid, borderWidth: 2, borderColor: WK.border, borderRadius: 0, padding: 12, marginBottom: 20 }}>
                    <BodyText size={13} style={{ fontStyle: 'italic' }}>"{quote}"</BodyText>
                  </View>
                  <Pressable
                    onPress={() => { hapticTap(); setTierPopup(null); }}
                    style={{ paddingVertical: 10, alignItems: 'center', backgroundColor: WK.tealMid, borderWidth: 2, borderColor: WK.border }}
                  >
                    <PixelText size={8}>DISMISS</PixelText>
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        );
      })()}

      {capPopup && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setCapPopup(null)}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 24 }} onPress={() => setCapPopup(null)}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, padding: 20, ...pixelShadow }}>
                <PixelText size={9} upper style={{ marginBottom: 4 }}>ROLE OCCUPIED</PixelText>
                <BodyText size={12} dim style={{ marginBottom: 16 }}>
                  This role is already filled. Release the current hire before signing a replacement.
                </BodyText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: WK.tealMid, borderWidth: 2, borderColor: WK.border, padding: 12 }}>
                  <Avatar appearance={capPopup.appearance} role="COACH" size={48} morale={capPopup.morale} age={capPopup.age} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <BodyText size={13} upper numberOfLines={1}>{capPopup.name}</BodyText>
                    <PixelText size={7} color={WK.tealLight}>{formatStaffRole(capPopup.role).toUpperCase()}</PixelText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      {capPopup.nationality ? <FlagText nationality={capPopup.nationality} size={11} /> : null}
                      {capPopup.influence !== undefined && <Badge label={`INF ${capPopup.influence}`} color="yellow" />}
                      {capPopup.personality && (() => {
                        const arch = getArchetypeForPlayer({ personality: capPopup.personality } as unknown as Player, archetypes);
                        return arch ? (
                          <View style={{ paddingHorizontal: 5, paddingVertical: 2, borderWidth: 2, borderColor: WK.border, backgroundColor: WK.tealDark }}>
                            <PixelText size={6} color={WK.yellow}>{arch.name.toUpperCase()}</PixelText>
                          </View>
                        ) : null;
                      })()}
                    </View>
                  </View>
                </View>
                <Pressable onPress={() => setCapPopup(null)} style={{ marginTop: 16, paddingVertical: 10, alignItems: 'center', backgroundColor: WK.tealMid, borderWidth: 2, borderColor: WK.border }}>
                  <PixelText size={8}>DISMISS</PixelText>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function FacilitiesScreen() {
  const { templates, levels, conditions } = useFacilityStore();
  const club = useClubStore((s) => s.club);
  const coaches = useCoachStore((s) => s.coaches);
  const facilityManager = coaches.find((c) => c.role === 'facility_manager') ?? null;
  const dof = coaches.find((c) => c.role === 'director_of_football') ?? null;
  const [activeTab, setActiveTab] = useState<FacilitiesTab>('TRAINING');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');

  const params = useLocalSearchParams<{ tab?: string; role?: string }>();
  useEffect(() => {
    if (params.tab === 'HIRE') {
      setActiveTab('HIRE');
      setSelectedRole(params.role ?? 'ALL');
    } else if (params.tab === 'SCOUTING' || params.tab === 'TRAINING' || params.tab === 'MEDICAL') {
      setActiveTab(params.tab as FacilityCategory);
    }
  }, [params.tab, params.role]);

  const isCategory = (t: FacilitiesTab): t is FacilityCategory => t !== 'HIRE';
  const visibleTemplates = isCategory(activeTab)
    ? templates.filter((t) => t.category === activeTab)
    : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }} edges={['bottom']}>
      <PitchBackground />

      <PixelTopTabBar
        tabs={[...ALL_TABS]}
        active={activeTab}
        onChange={(t) => {
          if (t === 'HIRE') {
            setSelectedRole('ALL');
          }
          setActiveTab(t as FacilitiesTab);
        }}
      />

      {/* Header */}
      <View style={{
        backgroundColor: WK.tealMid,
        borderBottomWidth: 4,
        borderBottomColor: WK.border,
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <View>
          <PixelText size={10} upper>Facilities</PixelText>
          {facilityManager && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
              <BodyText size={13}>{nationalityFlag(facilityManager.nationality)}</BodyText>
              <BodyText size={11} color={WK.tealLight}>{facilityManager.name}</BodyText>
              <BodyText size={9} dim>· AUTO-REPAIR</BodyText>
            </View>
          )}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Money pence={club.balance ?? 0} size={14} color={WK.yellow} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <BodyText size={9} dim>UPKEEP/WK</BodyText>
            <Money pence={calculateTotalUpkeep(templates, levels)} size={11} color={WK.orange} />
          </View>
        </View>
      </View>

      {activeTab === 'HIRE' ? (
        <HirePane selectedRole={selectedRole} setSelectedRole={setSelectedRole} />
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 10, marginTop: 10, paddingBottom: FAB_CLEARANCE }}>
          {activeTab === 'SCOUTING' && dof?.dofAutoAssignScouts && (
            <ScoutingConfigCard />
          )}
          {visibleTemplates.map((template) => (
            <FacilityCard
              key={template.slug}
              template={template}
              level={levels[template.slug] ?? 0}
              condition={conditions[template.slug] ?? 100}
              balancePence={club.balance ?? 0}
            />
          ))}

        </ScrollView>
      )}
    </SafeAreaView>
  );
}
