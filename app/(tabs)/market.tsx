import { useState, useCallback, useMemo } from 'react';
import { View, FlatList, RefreshControl, Modal, TouchableOpacity, TextInput, ScrollView, Pressable } from 'react-native';
import { FAB_CLEARANCE } from './_layout';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SlidersHorizontal } from 'lucide-react-native';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { PixelTopTabBar } from '@/components/ui/PixelTopTabBar';
import { PixelText } from '@/components/ui/PixelText';
import { FlagText } from '@/components/ui/FlagText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useMarketStore } from '@/stores/marketStore';
import { useClubStore } from '@/stores/clubStore';
import { useCoachStore } from '@/stores/coachStore';
import { useScoutStore } from '@/stores/scoutStore';
import { marketApi } from '@/api/endpoints/market';
import { generatePersonality } from '@/engine/personality';
import { generateAppearance } from '@/engine/appearance';
import { Avatar } from '@/components/ui/Avatar';
import { MarketCoach, MarketScout, Scout } from '@/types/market';
import { Coach, CoachRole } from '@/types/coach';
import { WK, traitColor, pixelShadow } from '@/constants/theme';
import { penceToPounds, formatPounds } from '@/utils/currency';
import { randomBaseMorale } from '@/utils/morale';
import { useGameConfigStore } from '@/stores/gameConfigStore';
import { TIER_ORDER } from '@/types/club';
import type { ClubTier } from '@/types/club';

type MarketTab = 'COACHES' | 'SCOUTS';

// ─── Stat bar ─────────────────────────────────────────────────────────────────

function StatBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const colorVal = Math.round((value / max) * 20);
  return (
    <View style={{
      height: 5,
      backgroundColor: 'rgba(0,0,0,0.4)',
      borderWidth: 2,
      borderColor: WK.border,
      marginTop: 8,
    }}>
      <View style={{ height: '100%', width: `${pct}%`, backgroundColor: traitColor(colorVal) }} />
    </View>
  );
}

// ─── Market coach card ────────────────────────────────────────────────────────

function MarketCoachCard({ coach }: { coach: MarketCoach }) {
  const weekNumber = useClubStore((s) => s.club.weekNumber ?? 1);
  const balance = useClubStore((s) => s.club.balance ?? 0);
  const reputationTier = useClubStore((s) => s.club.reputationTier);
  const addCoach = useCoachStore((s) => s.addCoach);
  const removeFromMarket = useMarketStore((s) => s.removeFromMarket);
  const [hiring, setHiring] = useState(false);
  const [hireError, setHireError] = useState<string | null>(null);
  const [showTierPopup, setShowTierPopup] = useState(false);

  // salary is in pence; balance is in whole pounds — convert before comparing
  const signingCostPounds = Math.round((coach.salary * 4) / 100);
  const canAfford = balance >= signingCostPounds;

  // Tier restriction: coach tier must not exceed current club tier
  const clubTierKey = (reputationTier?.toLowerCase() ?? 'local') as ClubTier;
  const coachTierKey = (coach.tier ?? 'local') as ClubTier;
  const isTierRestricted = TIER_ORDER[coachTierKey] > TIER_ORDER[clubTierKey];

  async function handleHire() {
    if (isTierRestricted) {
      setShowTierPopup(true);
      return;
    }
    setHiring(true);
    setHireError(null);
    try {
      await marketApi.assignEntity('coach', coach.id);
      const personality = generatePersonality();
      const { defaultMoraleMin, defaultMoraleMax } = useGameConfigStore.getState().config;
      useClubStore.getState().addBalance(-signingCostPounds);
      addCoach({
        id: coach.id,
        name: `${coach.firstName} ${coach.lastName}`,
        role: coach.role,
        salary: coach.salary,
        influence: coach.influence,
        nationality: coach.nationality,
        joinedWeek: weekNumber,
        morale: coach.morale ?? randomBaseMorale(defaultMoraleMin, defaultMoraleMax),
        specialisms: coach.specialisms,
        personality,
        appearance: generateAppearance(coach.id, 'COACH', 35, personality),
        relationships: [],
        tier: coach.tier,
      });
      removeFromMarket('coach', coach.id);
    } catch {
      setHireError('Unable to hire this coach. Please try again.');
    } finally {
      setHiring(false);
    }
  }

  const cardOpacity = isTierRestricted ? 0.55 : canAfford ? 1 : 0.55;

  return (
    <>
      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: isTierRestricted ? WK.tealMid : canAfford ? WK.border : WK.tealMid,
        padding: 12,
        marginBottom: 10,
        opacity: cardOpacity,
        ...pixelShadow,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <Avatar
            appearance={generateAppearance(coach.id, 'COACH', 35)}
            role="COACH"
            size={44}
            morale={70}
          />
          <View style={{ flex: 1 }}>
            <PixelText size={8} upper numberOfLines={1}>
              {coach.firstName} {coach.lastName}
            </PixelText>
            <PixelText size={7} color={WK.tealLight} style={{ marginTop: 2 }}>
              {coach.role.toUpperCase()}
            </PixelText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <FlagText nationality={coach.nationality} size={10} />
              <PixelText size={6} dim numberOfLines={1} style={{ flex: 1 }}>{coach.nationality}</PixelText>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Badge label={`INF ${coach.influence}`} color="yellow" />
            <PixelText size={6} dim>£{Math.round(coach.salary / 100).toLocaleString()}/wk</PixelText>
          </View>
        </View>

        {coach.specialisms && Object.keys(coach.specialisms).length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
            {(Object.entries(coach.specialisms) as [string, number][]).map(([key, val]) => (
              <Badge
                key={key}
                label={key.toUpperCase()}
                color={val >= 70 ? 'green' : val >= 40 ? 'yellow' : 'dim'}
              />
            ))}
          </View>
        )}

        <StatBar value={coach.influence} max={20} />

        {isTierRestricted ? (
          <PixelText size={6} color={WK.tealLight} style={{ marginTop: 6, textAlign: 'center' }}>
            {coachTierKey.toUpperCase()} TIER REQUIRED
          </PixelText>
        ) : !canAfford ? (
          <PixelText size={6} color={WK.red} style={{ marginTop: 6, textAlign: 'center' }}>
            INSUFFICIENT FUNDS
          </PixelText>
        ) : null}

        <View style={{ marginTop: 10 }}>
          <Button
            label={hiring ? 'HIRING...' : 'HIRE'}
            variant="teal"
            fullWidth
            onPress={handleHire}
            disabled={hiring || !canAfford}
          />
          {hireError && (
            <PixelText size={6} color={WK.red} style={{ marginTop: 6, textAlign: 'center' }}>
              {hireError}
            </PixelText>
          )}
        </View>
      </View>

      {/* Tier restriction popup */}
      <Modal
        visible={showTierPopup}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTierPopup(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
          onPress={() => setShowTierPopup(false)}
        >
          <Pressable onPress={() => {}}>
            <View style={{
              backgroundColor: WK.tealCard,
              borderWidth: 3,
              borderColor: WK.border,
              padding: 20,
              maxWidth: 300,
              ...pixelShadow,
            }}>
              <PixelText size={8} upper style={{ marginBottom: 12 }}>Not Interested</PixelText>
              <PixelText size={7} style={{ marginBottom: 16, lineHeight: 16 }}>
                {coach.firstName} {coach.lastName} isn't interested in working at that level.
              </PixelText>
              <Button label="OK" variant="teal" fullWidth onPress={() => setShowTierPopup(false)} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Market scout card ────────────────────────────────────────────────────────

const RANGE_BADGE_COLOR: Record<MarketScout['scoutingRange'], 'dim' | 'yellow' | 'red'> = {
  local:         'dim',
  national:      'yellow',
  international: 'red',
};

function MarketScoutCard({ scout }: { scout: MarketScout }) {
  const weekNumber = useClubStore((s) => s.club.weekNumber ?? 1);
  const balance = useClubStore((s) => s.club.balance ?? 0);
  const reputationTier = useClubStore((s) => s.club.reputationTier);
  const addScout = useScoutStore((s) => s.addScout);
  const removeFromMarket = useMarketStore((s) => s.removeFromMarket);
  const [hiring, setHiring] = useState(false);
  const [hireError, setHireError] = useState<string | null>(null);
  const [showTierPopup, setShowTierPopup] = useState(false);

  // salary is in pence; balance is in whole pounds — convert before comparing
  const signingCostPounds = Math.round((scout.salary * 4) / 100);
  const canAfford = balance >= signingCostPounds;

  // Tier restriction: scout tier must not exceed current club tier
  const clubTierKey = (reputationTier?.toLowerCase() ?? 'local') as ClubTier;
  const scoutTierKey = (scout.tier ?? 'local') as ClubTier;
  const isTierRestricted = TIER_ORDER[scoutTierKey] > TIER_ORDER[clubTierKey];

  async function handleHire() {
    if (isTierRestricted) {
      setShowTierPopup(true);
      return;
    }
    setHiring(true);
    setHireError(null);
    try {
      await marketApi.assignEntity('scout', scout.id);
      const { defaultMoraleMin: scoutMoraleMin, defaultMoraleMax: scoutMoraleMax } = useGameConfigStore.getState().config;
      useClubStore.getState().addBalance(-signingCostPounds);
      addScout({
        id: scout.id,
        name: `${scout.firstName} ${scout.lastName}`,
        salary: scout.salary,
        scoutingRange: scout.scoutingRange,
        successRate: scout.successRate,
        nationality: scout.nationality,
        joinedWeek: weekNumber,
        morale: randomBaseMorale(scoutMoraleMin, scoutMoraleMax),
        appearance: generateAppearance(scout.id, 'SCOUT', 35),
        relationships: [],
        assignedPlayerIds: [],
        tier: scout.tier,
      });
      removeFromMarket('scout', scout.id);
    } catch {
      setHireError('Unable to hire this scout. Please try again.');
    } finally {
      setHiring(false);
    }
  }

  const cardOpacity = isTierRestricted ? 0.55 : canAfford ? 1 : 0.55;

  return (
    <>
      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: isTierRestricted ? WK.tealMid : canAfford ? WK.border : WK.tealMid,
        padding: 12,
        marginBottom: 10,
        opacity: cardOpacity,
        ...pixelShadow,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <Avatar
            appearance={generateAppearance(scout.id, 'SCOUT', 35)}
            role="SCOUT"
            size={44}
            morale={70}
          />
          <View style={{ flex: 1 }}>
            <PixelText size={8} upper numberOfLines={1}>
              {scout.firstName} {scout.lastName}
            </PixelText>
            <View style={{ marginTop: 2 }}>
              <Badge label={`${scout.scoutingRange.toUpperCase()} SCOUT`} color={RANGE_BADGE_COLOR[scout.scoutingRange]} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <FlagText nationality={scout.nationality} size={10} />
              <PixelText size={6} dim numberOfLines={1} style={{ flex: 1 }}>{scout.nationality}</PixelText>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Badge label={`${scout.successRate}%`} color="green" />
            <PixelText size={6} dim>£{Math.round(scout.salary / 100).toLocaleString()}/wk</PixelText>
          </View>
        </View>

        <StatBar value={scout.successRate} max={100} />

        {isTierRestricted ? (
          <PixelText size={6} color={WK.tealLight} style={{ marginTop: 6, textAlign: 'center' }}>
            {scoutTierKey.toUpperCase()} TIER REQUIRED
          </PixelText>
        ) : !canAfford ? (
          <PixelText size={6} color={WK.red} style={{ marginTop: 6, textAlign: 'center' }}>
            INSUFFICIENT FUNDS
          </PixelText>
        ) : null}

        <View style={{ marginTop: 10 }}>
          <Button
            label={hiring ? 'HIRING...' : 'HIRE'}
            variant="teal"
            fullWidth
            onPress={handleHire}
            disabled={hiring || !canAfford}
          />
          {hireError && (
            <PixelText size={6} color={WK.red} style={{ marginTop: 6, textAlign: 'center' }}>
              {hireError}
            </PixelText>
          )}
        </View>
      </View>

      {/* Tier restriction popup */}
      <Modal
        visible={showTierPopup}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTierPopup(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
          onPress={() => setShowTierPopup(false)}
        >
          <Pressable onPress={() => {}}>
            <View style={{
              backgroundColor: WK.tealCard,
              borderWidth: 3,
              borderColor: WK.border,
              padding: 20,
              maxWidth: 300,
              ...pixelShadow,
            }}>
              <PixelText size={8} upper style={{ marginBottom: 12 }}>Not Interested</PixelText>
              <PixelText size={7} style={{ marginBottom: 16, lineHeight: 16 }}>
                {scout.firstName} {scout.lastName} isn't interested in working at that level.
              </PixelText>
              <Button label="OK" variant="teal" fullWidth onPress={() => setShowTierPopup(false)} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Filter sheet helpers ─────────────────────────────────────────────────────

const ALL_COACH_ROLES: CoachRole[] = [
  'Head Coach',
  'Fitness Coach',
  'Youth Coach',
  'GK Coach',
  'Tactical Analyst',
];

const ALL_SCOUTING_RANGES: MarketScout['scoutingRange'][] = ['local', 'national', 'international'];

function FilterInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'numeric',
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'numeric' | 'default';
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <PixelText size={6} dim style={{ marginBottom: 4 }}>{label}</PixelText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? ''}
        placeholderTextColor={WK.tealLight}
        keyboardType={keyboardType}
        style={{
          backgroundColor: WK.greenDark,
          borderWidth: 2,
          borderColor: WK.border,
          color: '#fff',
          fontFamily: 'PressStart2P_400Regular',
          fontSize: 8,
          paddingHorizontal: 8,
          paddingVertical: 6,
        }}
      />
    </View>
  );
}

function FilterPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        borderWidth: 2,
        borderColor: active ? WK.yellow : WK.border,
        backgroundColor: active ? WK.yellow : WK.tealCard,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginRight: 6,
        marginBottom: 6,
      }}
    >
      <PixelText size={6} color={active ? WK.greenDark : WK.tealLight}>
        {label}
      </PixelText>
    </TouchableOpacity>
  );
}

// ─── Coach filter state & sheet ───────────────────────────────────────────────

interface CoachFilters {
  wageMin: string;
  wageMax: string;
  influenceMin: string;
  influenceMax: string;
  roles: CoachRole[];
}

const DEFAULT_COACH_FILTERS: CoachFilters = {
  wageMin: '',
  wageMax: '',
  influenceMin: '',
  influenceMax: '',
  roles: [],
};

function coachFiltersActive(f: CoachFilters): boolean {
  return (
    f.wageMin !== '' ||
    f.wageMax !== '' ||
    f.influenceMin !== '' ||
    f.influenceMax !== '' ||
    f.roles.length > 0
  );
}

function applyCoachFilters(coaches: MarketCoach[], f: CoachFilters): MarketCoach[] {
  return coaches.filter((c) => {
    const wagePerWeekPounds = Math.round(c.salary / 100);
    if (f.wageMin !== '' && wagePerWeekPounds < Number(f.wageMin)) return false;
    if (f.wageMax !== '' && wagePerWeekPounds > Number(f.wageMax)) return false;
    if (f.influenceMin !== '' && c.influence < Number(f.influenceMin)) return false;
    if (f.influenceMax !== '' && c.influence > Number(f.influenceMax)) return false;
    if (f.roles.length > 0 && !f.roles.includes(c.role)) return false;
    return true;
  });
}

function CoachFilterSheet({
  visible,
  filters,
  onApply,
  onClose,
}: {
  visible: boolean;
  filters: CoachFilters;
  onApply: (f: CoachFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<CoachFilters>(filters);

  // Sync draft when sheet opens
  const handleOpen = useCallback(() => setDraft(filters), [filters]);

  function toggleRole(role: CoachRole) {
    setDraft((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onShow={handleOpen}
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}
        onPress={onClose}
      >
        <Pressable onPress={() => {}}>
          <View style={{
            backgroundColor: WK.tealCard,
            borderTopWidth: 3,
            borderLeftWidth: 3,
            borderRightWidth: 3,
            borderColor: WK.border,
            padding: 16,
            paddingBottom: 32,
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <PixelText size={9} upper>Filter Coaches</PixelText>
              <TouchableOpacity onPress={onClose}>
                <PixelText size={7} color={WK.tealLight}>✕</PixelText>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Wage range */}
              <PixelText size={7} color={WK.yellow} style={{ marginBottom: 8 }}>WEEKLY WAGE (£)</PixelText>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <FilterInput label="MIN" value={draft.wageMin} onChangeText={(v) => setDraft({ ...draft, wageMin: v })} placeholder="0" />
                </View>
                <View style={{ flex: 1 }}>
                  <FilterInput label="MAX" value={draft.wageMax} onChangeText={(v) => setDraft({ ...draft, wageMax: v })} placeholder="Any" />
                </View>
              </View>

              {/* Influence range */}
              <PixelText size={7} color={WK.yellow} style={{ marginBottom: 8, marginTop: 4 }}>INFLUENCE (1–20)</PixelText>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <FilterInput label="MIN" value={draft.influenceMin} onChangeText={(v) => setDraft({ ...draft, influenceMin: v })} placeholder="1" />
                </View>
                <View style={{ flex: 1 }}>
                  <FilterInput label="MAX" value={draft.influenceMax} onChangeText={(v) => setDraft({ ...draft, influenceMax: v })} placeholder="20" />
                </View>
              </View>

              {/* Role pills */}
              <PixelText size={7} color={WK.yellow} style={{ marginBottom: 8, marginTop: 4 }}>ROLE</PixelText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                {ALL_COACH_ROLES.map((role) => (
                  <FilterPill
                    key={role}
                    label={role.toUpperCase()}
                    active={draft.roles.includes(role)}
                    onPress={() => toggleRole(role)}
                  />
                ))}
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="RESET"
                  variant="orange"
                  fullWidth
                  onPress={() => { setDraft(DEFAULT_COACH_FILTERS); onApply(DEFAULT_COACH_FILTERS); }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="APPLY"
                  variant="teal"
                  fullWidth
                  onPress={() => { onApply(draft); onClose(); }}
                />
              </View>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Scout filter state & sheet ───────────────────────────────────────────────

interface ScoutFilters {
  wageMin: string;
  wageMax: string;
  successRateMin: string;
  successRateMax: string;
  ranges: MarketScout['scoutingRange'][];
  nationality: string;
}

const DEFAULT_SCOUT_FILTERS: ScoutFilters = {
  wageMin: '',
  wageMax: '',
  successRateMin: '',
  successRateMax: '',
  ranges: [],
  nationality: '',
};

function scoutFiltersActive(f: ScoutFilters): boolean {
  return (
    f.wageMin !== '' ||
    f.wageMax !== '' ||
    f.successRateMin !== '' ||
    f.successRateMax !== '' ||
    f.ranges.length > 0 ||
    f.nationality.trim() !== ''
  );
}

function applyScoutFilters(scouts: MarketScout[], f: ScoutFilters): MarketScout[] {
  const nat = f.nationality.trim().toLowerCase();
  return scouts.filter((s) => {
    const wagePerWeekPounds = Math.round(s.salary / 100);
    if (f.wageMin !== '' && wagePerWeekPounds < Number(f.wageMin)) return false;
    if (f.wageMax !== '' && wagePerWeekPounds > Number(f.wageMax)) return false;
    if (f.successRateMin !== '' && s.successRate < Number(f.successRateMin)) return false;
    if (f.successRateMax !== '' && s.successRate > Number(f.successRateMax)) return false;
    if (f.ranges.length > 0 && !f.ranges.includes(s.scoutingRange)) return false;
    if (nat !== '' && !s.nationality.toLowerCase().includes(nat)) return false;
    return true;
  });
}

function ScoutFilterSheet({
  visible,
  filters,
  onApply,
  onClose,
}: {
  visible: boolean;
  filters: ScoutFilters;
  onApply: (f: ScoutFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ScoutFilters>(filters);

  const handleOpen = useCallback(() => setDraft(filters), [filters]);

  function toggleRange(range: MarketScout['scoutingRange']) {
    setDraft((prev) => ({
      ...prev,
      ranges: prev.ranges.includes(range)
        ? prev.ranges.filter((r) => r !== range)
        : [...prev.ranges, range],
    }));
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onShow={handleOpen}
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}
        onPress={onClose}
      >
        <Pressable onPress={() => {}}>
          <View style={{
            backgroundColor: WK.tealCard,
            borderTopWidth: 3,
            borderLeftWidth: 3,
            borderRightWidth: 3,
            borderColor: WK.border,
            padding: 16,
            paddingBottom: 32,
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <PixelText size={9} upper>Filter Scouts</PixelText>
              <TouchableOpacity onPress={onClose}>
                <PixelText size={7} color={WK.tealLight}>✕</PixelText>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Wage range */}
              <PixelText size={7} color={WK.yellow} style={{ marginBottom: 8 }}>WEEKLY WAGE (£)</PixelText>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <FilterInput label="MIN" value={draft.wageMin} onChangeText={(v) => setDraft({ ...draft, wageMin: v })} placeholder="0" />
                </View>
                <View style={{ flex: 1 }}>
                  <FilterInput label="MAX" value={draft.wageMax} onChangeText={(v) => setDraft({ ...draft, wageMax: v })} placeholder="Any" />
                </View>
              </View>

              {/* Scouting range pills */}
              <PixelText size={7} color={WK.yellow} style={{ marginBottom: 8, marginTop: 4 }}>SCOUTING RANGE</PixelText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                {ALL_SCOUTING_RANGES.map((range) => (
                  <FilterPill
                    key={range}
                    label={range.toUpperCase()}
                    active={draft.ranges.includes(range)}
                    onPress={() => toggleRange(range)}
                  />
                ))}
              </View>

              {/* Nationality */}
              <PixelText size={7} color={WK.yellow} style={{ marginBottom: 8, marginTop: 4 }}>NATIONALITY</PixelText>
              <FilterInput
                label=""
                value={draft.nationality}
                onChangeText={(v) => setDraft({ ...draft, nationality: v })}
                placeholder="e.g. English"
                keyboardType="default"
              />

              {/* Success rate range */}
              <PixelText size={7} color={WK.yellow} style={{ marginBottom: 8, marginTop: 4 }}>SUCCESS RATE (%)</PixelText>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <FilterInput label="MIN" value={draft.successRateMin} onChangeText={(v) => setDraft({ ...draft, successRateMin: v })} placeholder="0" />
                </View>
                <View style={{ flex: 1 }}>
                  <FilterInput label="MAX" value={draft.successRateMax} onChangeText={(v) => setDraft({ ...draft, successRateMax: v })} placeholder="100" />
                </View>
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="RESET"
                  variant="orange"
                  fullWidth
                  onPress={() => { setDraft(DEFAULT_SCOUT_FILTERS); onApply(DEFAULT_SCOUT_FILTERS); }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="APPLY"
                  variant="teal"
                  fullWidth
                  onPress={() => { onApply(draft); onClose(); }}
                />
              </View>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Empty / loading state ────────────────────────────────────────────────────

function EmptyPane({ label, isLoading }: { label: string; isLoading: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <PixelText size={8} dim>{label}</PixelText>
      <PixelText size={6} dim>
        {isLoading ? 'FETCHING MARKET DATA...' : 'PULL DOWN TO REFRESH'}
      </PixelText>
    </View>
  );
}

// ─── Panes ────────────────────────────────────────────────────────────────────

function CoachesPane({ onRefresh, refreshing }: { onRefresh: () => void; refreshing: boolean }) {
  const { coaches, isLoading } = useMarketStore();
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<CoachFilters>(DEFAULT_COACH_FILTERS);

  const filtered = useMemo(() => applyCoachFilters(coaches, filters), [coaches, filters]);
  const isActive = coachFiltersActive(filters);

  return (
    <View style={{ flex: 1 }}>
      {/* Filter toolbar */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderBottomWidth: 2,
        borderBottomColor: WK.border,
      }}>
        {isActive && (
          <PixelText size={6} color={WK.yellow} style={{ marginRight: 8 }}>
            {filtered.length}/{coaches.length}
          </PixelText>
        )}
        <TouchableOpacity
          onPress={() => setFilterOpen(true)}
          style={{ padding: 6 }}
        >
          <SlidersHorizontal size={16} color={isActive ? WK.yellow : WK.tealLight} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {filtered.length === 0 ? (
        <EmptyPane label={isActive ? 'NO MATCHES' : 'NO COACHES AVAILABLE'} isLoading={isLoading} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <MarketCoachCard coach={item} />}
          contentContainerStyle={{ padding: 10, paddingBottom: FAB_CLEARANCE }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={WK.yellow} />
          }
        />
      )}

      <CoachFilterSheet
        visible={filterOpen}
        filters={filters}
        onApply={setFilters}
        onClose={() => setFilterOpen(false)}
      />
    </View>
  );
}

function ScoutsPane({ onRefresh, refreshing }: { onRefresh: () => void; refreshing: boolean }) {
  const { marketScouts, isLoading } = useMarketStore();
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<ScoutFilters>(DEFAULT_SCOUT_FILTERS);

  const filtered = useMemo(() => applyScoutFilters(marketScouts, filters), [marketScouts, filters]);
  const isActive = scoutFiltersActive(filters);

  return (
    <View style={{ flex: 1 }}>
      {/* Filter toolbar */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderBottomWidth: 2,
        borderBottomColor: WK.border,
      }}>
        {isActive && (
          <PixelText size={6} color={WK.yellow} style={{ marginRight: 8 }}>
            {filtered.length}/{marketScouts.length}
          </PixelText>
        )}
        <TouchableOpacity
          onPress={() => setFilterOpen(true)}
          style={{ padding: 6 }}
        >
          <SlidersHorizontal size={16} color={isActive ? WK.yellow : WK.tealLight} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {filtered.length === 0 ? (
        <EmptyPane label={isActive ? 'NO MATCHES' : 'NO SCOUTS AVAILABLE'} isLoading={isLoading} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <MarketScoutCard scout={item} />}
          contentContainerStyle={{ padding: 10, paddingBottom: FAB_CLEARANCE }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={WK.yellow} />
          }
        />
      )}

      <ScoutFilterSheet
        visible={filterOpen}
        filters={filters}
        onApply={setFilters}
        onClose={() => setFilterOpen(false)}
      />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MarketScreen() {
  const [activeTab, setActiveTab] = useState<MarketTab>('COACHES');
  const [refreshing, setRefreshing] = useState(false);
  const { setMarketData } = useMarketStore();
  const club = useClubStore((s) => s.club);

  // balance is stored in pence — convert to whole pounds for display
  const balance = penceToPounds(
    typeof club.balance === 'number' && !isNaN(club.balance)
      ? club.balance
      : club.totalCareerEarnings * 100,
  );

  // Pull-to-refresh always fetches fresh data, bypassing the store's 5-min cache
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await marketApi.getMarketData();
      setMarketData(data);
    } catch {
      // Silent — stale data remains displayed
    } finally {
      setRefreshing(false);
    }
  }, [setMarketData]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }} edges={['bottom']}>
      <PitchBackground />

      {/* Tab navigation */}
      <PixelTopTabBar
        tabs={['COACHES', 'SCOUTS']}
        active={activeTab}
        onChange={(t) => setActiveTab(t as MarketTab)}
      />

      {/* Title section */}
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
        <PixelText size={10} upper>Market</PixelText>
        <PixelText size={7} color={WK.yellow}>{formatPounds(balance)}</PixelText>
      </View>

      {/* Entity count strip */}
      {/* <View style={{ flexDirection: 'row', marginHorizontal: 10, marginTop: 10, gap: 10 }}>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <PixelText size={6} dim>PLAYERS</PixelText>
          <PixelText size={14} color={WK.tealLight} style={{ marginTop: 4 }}>{players.length}</PixelText>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <PixelText size={6} dim>COACHES</PixelText>
          <PixelText size={14} color={WK.yellow} style={{ marginTop: 4 }}>{coaches.length}</PixelText>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <PixelText size={6} dim>SCOUTS</PixelText>
          <PixelText size={14} color={WK.orange} style={{ marginTop: 4 }}>{marketScouts.length}</PixelText>
        </Card>
      </View> */}

      {/* Pane content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'COACHES' && (
          <CoachesPane onRefresh={handleRefresh} refreshing={refreshing} />
        )}
        {activeTab === 'SCOUTS' && (
          <ScoutsPane onRefresh={handleRefresh} refreshing={refreshing} />
        )}
      </View>
    </SafeAreaView>
  );
}
