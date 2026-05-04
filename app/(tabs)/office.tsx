import React, { useState } from 'react';
import { View, Modal, TextInput, ScrollView, Pressable, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Trophy, ChevronRight, ArrowLeftRight } from 'lucide-react-native';
import { FAB_CLEARANCE } from './_layout';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { PixelTopTabBar } from '@/components/ui/PixelTopTabBar';
import { PixelText, BodyText } from '@/components/ui/PixelText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FlagText } from '@/components/ui/FlagText';
import { Avatar } from '@/components/ui/Avatar';
import { useClubStore } from '@/stores/clubStore';
import { useCoachStore } from '@/stores/coachStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useManagerRecordStore } from '@/stores/managerRecordStore';
import { useFacilityStore, facilityUpgradeCost, calculateFacilityUpkeep } from '@/stores/facilityStore';
import { calculateTotalUpkeep } from '@/utils/facilityUpkeep';
import { useAttendanceStore } from '@/stores/attendanceStore';
import { calculateStadiumCapacity } from '@/utils/stadiumCapacity';
import { repairFacilityCost } from '@/types/facility';
import type { FacilityTemplate } from '@/types/facility';
import { useArchetypeStore } from '@/stores/archetypeStore';
import { getArchetypeForPlayer } from '@/engine/archetypeEngine';
import type { Player } from '@/types/player';
import { WK, pixelShadow } from '@/constants/theme';
import { PixelFootballBadge } from '@/components/ui/ClubBadge/PixelFootballBadge';
import { StadiumView } from '@/components/stadium/StadiumView';
import type { StadiumFacility } from '@/components/stadium/StadiumView';
import type { BaseShape } from '@/components/ui/ClubBadge/types';
import { penceToPounds, formatPounds } from '@/utils/currency';
import { hapticTap } from '@/utils/haptics';
import type { StaffRole, Coach } from '@/types/coach';
import FansScreen from '../office/fans';

const OFFICE_TABS = ['CLUB', 'FANS', 'STADIUM', 'ATTENDANCE'] as const;
type OfficeTab = typeof OFFICE_TABS[number];

// ─── Facility helpers (shared with STADIUM pane) ──────────────────────────────

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

function conditionColor(pct: number): string {
  if (pct >= 60) return WK.tealLight;
  if (pct >= 30) return WK.orange;
  return WK.red;
}

// ─── Facility card ────────────────────────────────────────────────────────────

function FacilityCard({
  template,
  level,
  condition,
  balance,
}: {
  template: FacilityTemplate;
  level: number;
  condition: number;
  balance: number;
}) {
  const { upgradeLevel, repairFacility } = useFacilityStore();
  const { addBalance, club } = useClubStore();
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [repairModalVisible, setRepairModalVisible] = useState(false);

  const upgradeCost     = facilityUpgradeCost(template, level);
  const maintenance     = calculateFacilityUpkeep(template, level);
  const nextMaintenance = calculateFacilityUpkeep(template, level + 1);
  const repairCost      = repairFacilityCost(level, condition, template.baseCost);

  const canAffordUpgrade = balance >= upgradeCost;
  const canAffordRepair  = balance >= repairCost;
  const atMax       = level >= template.maxLevel;
  const levelPct    = (level / template.maxLevel) * 100;
  const needsRepair = level > 0 && condition < 100;

  function confirmUpgrade() {
    setUpgradeModalVisible(false);
    upgradeLevel(template.slug);
    addBalance(-upgradeCost * 100);
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
        MAINT: {maintenance === 0 ? 'FREE' : `£${(maintenance / 100).toFixed(2)}/wk`}
        {!atMax ? `  ·  LV${level + 1}: £${(nextMaintenance / 100).toFixed(2)}/wk` : ''}
      </BodyText>

      <View style={{ gap: 8 }}>
        {needsRepair && (
          <Button
            label={`REPAIR  £${repairCost.toLocaleString()}`}
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
            label={`UPGRADE → LV${level + 1}  £${upgradeCost.toLocaleString()}`}
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
                <BodyText size={13} color={WK.orange} style={{ marginBottom: 20 }}>
                  INSUFFICIENT FUNDS — need £{upgradeCost.toLocaleString()}
                </BodyText>
              ) : (
                <>
                  <BodyText size={13} dim style={{ marginBottom: 4 }}>LEVEL {level} → {level + 1}</BodyText>
                  <BodyText size={13} color={WK.yellow} style={{ marginBottom: 20 }}>COST: £{upgradeCost.toLocaleString()}</BodyText>
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
                <BodyText size={13} color={WK.red} style={{ marginBottom: 20 }}>
                  INSUFFICIENT FUNDS — need £{repairCost.toLocaleString()}
                </BodyText>
              ) : (
                <>
                  <BodyText size={13} dim style={{ marginBottom: 4 }}>CONDITION {Math.round(condition)}% → 100%</BodyText>
                  <BodyText size={13} color={WK.orange} style={{ marginBottom: 20 }}>COST: £{repairCost.toLocaleString()}</BodyText>
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

// ─── Attendance summary card ──────────────────────────────────────────────────

function AttendanceSummaryCard() {
  const records      = useAttendanceStore((s) => s.records);
  const stadiumName  = useClubStore((s) => s.club.stadiumName ?? null);
  const templates    = useFacilityStore((s) => s.templates);
  const levels       = useFacilityStore((s) => s.levels);

  const capacity = calculateStadiumCapacity(templates, levels);

  const last5 = records.slice(0, 5);
  const avgAttendance = last5.length > 0
    ? Math.round(last5.reduce((sum, r) => sum + r.attendance, 0) / last5.length)
    : null;
  const avgFillPct = capacity > 0 && avgAttendance !== null
    ? Math.round((avgAttendance / capacity) * 100)
    : null;

  return (
    <View style={[{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.border,
      marginBottom: 14,
      overflow: 'hidden',
    }, pixelShadow]}>
      {/* Header */}
      <View style={{
        backgroundColor: WK.tealDark,
        borderBottomWidth: 2,
        borderBottomColor: WK.border,
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <PixelText size={8} color={WK.yellow}>STADIUM OVERVIEW</PixelText>
        {last5.length > 0 && (
          <PixelText size={6} color={WK.dim}>AVG LAST {last5.length}</PixelText>
        )}
      </View>

      <View style={{ padding: 12, gap: 10 }}>
        {/* Stadium name + capacity */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <BodyText size={12} style={{ color: WK.dim }}>STADIUM</BodyText>
          <BodyText size={13} style={{ color: WK.text }} numberOfLines={1}>
            {stadiumName ?? 'Unnamed Stadium'}
          </BodyText>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <BodyText size={12} style={{ color: WK.dim }}>CAPACITY</BodyText>
          <BodyText size={13} style={{ color: WK.tealLight }}>
            {capacity > 0 ? capacity.toLocaleString() : '—'}
          </BodyText>
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: WK.border }} />

        {/* Average attendance */}
        {avgAttendance === null ? (
          <BodyText size={12} style={{ color: WK.dim, textAlign: 'center' }}>
            No home games yet
          </BodyText>
        ) : (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <BodyText size={12} style={{ color: WK.dim }}>AVG ATTENDANCE</BodyText>
              <BodyText size={13} style={{ color: WK.yellow }}>
                {avgAttendance.toLocaleString()}
                {capacity > 0 ? ` / ${capacity.toLocaleString()}` : ''}
              </BodyText>
            </View>
            {avgFillPct !== null && (
              <View>
                <View style={{ height: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: WK.border }}>
                  <View style={{ height: '100%', width: `${Math.min(100, avgFillPct)}%`, backgroundColor: WK.yellow }} />
                </View>
                <BodyText size={10} style={{ color: WK.dim, textAlign: 'right', marginTop: 3 }}>
                  {avgFillPct}% capacity
                </BodyText>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

// ─── Attendance log ───────────────────────────────────────────────────────────

function AttendanceLog() {
  const records = useAttendanceStore((s) => s.records);

  if (records.length === 0) {
    return (
      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: WK.border,
        padding: 14,
        marginBottom: 14,
        alignItems: 'center',
        ...pixelShadow,
      }}>
        <PixelText size={8} dim>NO HOME GAMES YET</PixelText>
        <BodyText size={12} dim style={{ marginTop: 6, textAlign: 'center' }}>
          Attendance figures will appear here after your first home match.
        </BodyText>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
        <PixelText size={8} color={WK.yellow}>ATTENDANCE LOG</PixelText>
        <BodyText size={11} dim>({records.length} games)</BodyText>
      </View>

      {records.map((r) => {
        const outcomeColor =
          r.homeGoals > r.awayGoals ? WK.green :
          r.homeGoals < r.awayGoals ? WK.red : WK.yellow;
        const fillPct = r.stadiumCapacity > 0
          ? Math.round((r.attendance / r.stadiumCapacity) * 100)
          : r.attendancePct;

        return (
          <View
            key={r.id}
            style={{
              backgroundColor: WK.tealCard,
              borderWidth: 2,
              borderColor: WK.border,
              padding: 10,
              marginBottom: 6,
              ...pixelShadow,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <BodyText size={12} style={{ flex: 1 }} numberOfLines={1}>
                {r.homeClubName} vs {r.awayClubName}
              </BodyText>
              <View style={{
                borderWidth: 2,
                borderColor: outcomeColor,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}>
                <PixelText size={9} color={outcomeColor}>
                  {r.homeGoals}–{r.awayGoals}
                </PixelText>
              </View>
            </View>

            <View style={{ marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                <BodyText size={11} dim>ATTENDANCE</BodyText>
                <BodyText size={11} color={WK.tealLight}>
                  {r.attendance > 0 ? r.attendance.toLocaleString() : '—'}
                  {r.stadiumCapacity > 0 ? ` / ${r.stadiumCapacity.toLocaleString()}` : ''}
                </BodyText>
              </View>
              <View style={{ height: 5, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: WK.border }}>
                <View style={{ height: '100%', width: `${fillPct}%`, backgroundColor: WK.tealLight }} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <BodyText size={10} dim>WK {r.week} · {r.reputationTier.toUpperCase()} · {r.attendancePct}% FILL</BodyText>
              {r.fanEffects.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {r.fanEffects.map((fe, i) => (
                    <View key={i} style={{
                      backgroundColor: fe.bonus >= 0 ? WK.green + '33' : WK.red + '33',
                      borderWidth: 1,
                      borderColor: fe.bonus >= 0 ? WK.green : WK.red,
                      paddingHorizontal: 4,
                      paddingVertical: 1,
                    }}>
                      <BodyText size={10} color={fe.bonus >= 0 ? WK.green : WK.red}>
                        {fe.bonus >= 0 ? '+' : ''}{fe.bonus}%
                      </BodyText>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Stadium overview card ────────────────────────────────────────────────────

function StadiumOverviewCard({
  stadiumName,
  templates,
  levels,
}: {
  stadiumName: string | null;
  templates: FacilityTemplate[];
  levels: Record<string, number>;
}) {
  const capacity = calculateStadiumCapacity(templates, levels);

  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.yellow,
      padding: 14,
      marginBottom: 14,
      ...pixelShadow,
    }}>
      <PixelText size={9} color={WK.yellow} upper style={{ marginBottom: 8 }}>
        STADIUM NAME: {stadiumName ?? 'UNNAMED STADIUM'}
      </PixelText>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <BodyText size={12} dim>EST. CAPACITY</BodyText>
        <PixelText size={14} variant="vt323" color={capacity > 0 ? WK.green : WK.dim}>
          {capacity > 0 ? capacity.toLocaleString() : '—'}
        </PixelText>
      </View>

      {capacity === 0 && (
        <BodyText size={12} dim style={{ marginTop: 8 }}>
          Build and upgrade facilities to increase stadium capacity.
        </BodyText>
      )}
    </View>
  );
}

// ─── Club Pane (AMP Profile Editor) ───────────────────────────────────────────

const FORMATIONS = ['4-4-2', '4-3-3', '3-5-2', '5-4-1', '4-2-3-1'] as const;
const PLAYING_STYLES = ['POSSESSION', 'DIRECT', 'COUNTER', 'HIGH_PRESS'] as const;
const BADGE_SHAPES: { value: BaseShape; label: string }[] = [
  { value: 'shield', label: 'SHIELD' },
  { value: 'circle', label: 'CIRCLE' },
  { value: 'crest',  label: 'CREST'  },
];
const KIT_COLORS = [
  '#E53935', '#1565C0', '#2E7D32', '#F9A825',
  '#6A1B9A', '#00838F', '#BF360C', '#0D47A1',
  '#880E4F', '#37474F', '#F5F5F5', '#212121',
];

function SectionCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <PixelText size={7} dim style={{ marginBottom: 6 }}>{label}</PixelText>
      <View style={{
        backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border,
        padding: 14, ...pixelShadow,
      }}>
        {children}
      </View>
    </View>
  );
}

function StaffToggle({
  label, description, value, onToggle,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={() => { hapticTap(); onToggle(); }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 10,
        backgroundColor: value ? WK.tealDark : 'rgba(0,0,0,0.2)',
        borderWidth: 2,
        borderColor: value ? WK.yellow : WK.border,
      }}
    >
      <View style={{ flex: 1, marginRight: 8 }}>
        <PixelText size={7} color={value ? WK.yellow : WK.dim}>{label}</PixelText>
        <BodyText size={10} dim style={{ marginTop: 2 }}>{description}</BodyText>
      </View>
      <View style={{
        width: 36, height: 20,
        backgroundColor: value ? WK.yellow : WK.tealMid,
        borderWidth: 2, borderColor: WK.border,
        padding: 2,
        alignItems: value ? 'flex-end' : 'flex-start',
      }}>
        <View style={{ width: 12, height: '100%', backgroundColor: value ? WK.border : WK.dim }} />
      </View>
    </Pressable>
  );
}

const SINGLETON_ROLES: { role: StaffRole; label: string }[] = [
  { role: 'manager',              label: 'MANAGER' },
  { role: 'director_of_football', label: 'DIRECTOR OF FOOTBALL' },
  { role: 'facility_manager',     label: 'FACILITY MANAGER' },
  { role: 'chairman',             label: 'CHAIRMAN' },
];

function KeyStaffSection({
  coaches,
  onNavigateToHire,
}: {
  coaches: Coach[];
  onNavigateToHire: (role: string) => void;
}) {
  const archetypes = useArchetypeStore((s) => s.archetypes);
  const managerRecords = useManagerRecordStore((s) => s.records);

  return (
    <SectionCard label="KEY STAFF">
      {SINGLETON_ROLES.map(({ role, label }, idx) => {
        const hired = coaches.find((c) => c.role === role);

        if (!hired) {
          return (
            <View
              key={role}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 10,
                borderTopWidth: idx === 0 ? 0 : 2,
                borderTopColor: WK.border,
              }}
            >
              <PixelText size={7} dim>{label}</PixelText>
              <Pressable
                onPress={() => { hapticTap(); onNavigateToHire(role); }}
                style={{
                  paddingHorizontal: 10, paddingVertical: 6,
                  backgroundColor: WK.tealMid, borderWidth: 2, borderColor: WK.yellow,
                }}
              >
                <PixelText size={7} color={WK.yellow}>HIRE →</PixelText>
              </Pressable>
            </View>
          );
        }

        const { updateCoach } = useCoachStore.getState();
        const archetype = getArchetypeForPlayer(hired as unknown as Player, archetypes);

        return (
          <View
            key={role}
            style={{
              paddingVertical: 12,
              borderTopWidth: idx === 0 ? 0 : 2,
              borderTopColor: WK.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar
                appearance={hired.appearance}
                role="COACH"
                size={52}
                morale={hired.morale}
                age={hired.age}
              />
              <View style={{ flex: 1, gap: 3 }}>
                <BodyText size={14} upper numberOfLines={1}>{hired.name}</BodyText>
                <PixelText size={7} color={WK.tealLight}>{label}</PixelText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <FlagText nationality={hired.nationality ?? ''} size={11} />
                  <Badge label={`INF ${hired.influence}`} color="yellow" />
                  {archetype && (
                    <View style={{
                      paddingHorizontal: 5, paddingVertical: 2,
                      borderWidth: 2, borderColor: WK.border,
                      backgroundColor: WK.tealMid,
                    }}>
                      <PixelText size={6} color={WK.yellow}>{archetype.name.toUpperCase()}</PixelText>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {role === 'manager' && (() => {
              const rec = managerRecords[hired.id];
              const total = rec ? rec.wins + rec.draws + rec.losses : 0;
              const winRate = total > 0 ? Math.round((rec!.wins / total) * 100) : null;
              const winRateColor = winRate === null ? WK.dim : winRate >= 50 ? '#4CAF50' : winRate >= 33 ? WK.yellow : WK.red;
              return (
                <View style={{ marginTop: 10 }}>
                  {/* Win rate row */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    borderWidth: 2,
                    borderColor: WK.border,
                    marginBottom: 8,
                  }}>
                    <View style={{ gap: 2 }}>
                      <PixelText size={7} color={WK.dim}>WIN RATE</PixelText>
                      {total > 0 && (
                        <BodyText size={10} dim>{rec!.wins}W · {rec!.draws}D · {rec!.losses}L</BodyText>
                      )}
                    </View>
                    <PixelText size={14} variant="vt323" color={winRateColor}>
                      {winRate !== null ? `${winRate}%` : '—'}
                    </PixelText>
                  </View>

                  <StaffToggle
                    label="AUTO-MANAGE PLAYER EVENTS"
                    description="Handles player & guardian requests based on personality."
                    value={!!hired.autoManageEvents}
                    onToggle={() => updateCoach(hired.id, { autoManageEvents: !hired.autoManageEvents })}
                  />
                </View>
              );
            })()}

            {role === 'facility_manager' && (
              <View style={{ marginTop: 12 }}>
                <StaffToggle
                  label="AUTO-REPAIR FACILITIES"
                  description="Repairs degraded facilities each week if balance allows."
                  value={!!hired.facilityManagerAutoRepair}
                  onToggle={() => updateCoach(hired.id, { facilityManagerAutoRepair: !hired.facilityManagerAutoRepair })}
                />
              </View>
            )}

            {role === 'director_of_football' && (
              <View style={{ marginTop: 12, gap: 6 }}>
                <StaffToggle
                  label="AUTO-RENEW CONTRACTS"
                  description="Extends contracts for players willing to stay (loyalty ≥ 10)."
                  value={!!hired.dofAutoRenewContracts}
                  onToggle={() => updateCoach(hired.id, { dofAutoRenewContracts: !hired.dofAutoRenewContracts })}
                />
                <StaffToggle
                  label="AUTO-ASSIGN SCOUTS"
                  description="Assigns available scouts to unscreened market players."
                  value={!!hired.dofAutoAssignScouts}
                  onToggle={() => updateCoach(hired.id, { dofAutoAssignScouts: !hired.dofAutoAssignScouts })}
                />
                <StaffToggle
                  label="AUTO-SIGN PLAYERS"
                  description="Signs revealed players when the manager's assessment is positive."
                  value={!!hired.dofAutoSignPlayers}
                  onToggle={() => updateCoach(hired.id, { dofAutoSignPlayers: !hired.dofAutoSignPlayers })}
                />
                <StaffToggle
                  label="AUTO-SELL PLAYERS"
                  description="Accepts or rejects transfer bids based on the manager's opinion."
                  value={!!hired.dofAutoSellPlayers}
                  onToggle={() => updateCoach(hired.id, { dofAutoSellPlayers: !hired.dofAutoSellPlayers })}
                />
              </View>
            )}
          </View>
        );
      })}
    </SectionCard>
  );
}

function ClubPane({ onNavigateToHire }: { onNavigateToHire: (role: string) => void }) {
  const router = useRouter();
  const {
    club, managerProfile,
    setName, setStadiumName, setFormation, setPlayingStyle, setClubColors, setBadgeShape,
  } = useClubStore();
  const coaches = useCoachStore((s) => s.coaches);

  const [clubNameDraft, setClubNameDraft] = useState(club.name);
  const [stadiumDraft, setStadiumDraft] = useState(club.stadiumName ?? '');
  const [kitSlot, setKitSlot] = useState<'primary' | 'secondary'>('primary');

  function commitClubName() {
    const trimmed = clubNameDraft.trim();
    if (trimmed) setName(trimmed);
    else setClubNameDraft(club.name);
  }

  function commitStadiumName() {
    const trimmed = stadiumDraft.trim();
    setStadiumName(trimmed || null);
  }

  function handleSwatchPress(color: string) {
    hapticTap();
    if (kitSlot === 'primary') setClubColors(color, club.secondaryColor);
    else setClubColors(club.primaryColor, color);
  }

  const inputStyle = {
    backgroundColor: WK.tealMid, color: WK.text,
    borderWidth: 2, borderColor: WK.border,
    padding: 10, fontFamily: 'monospace', fontSize: 14,
  } as const;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: FAB_CLEARANCE }}>

      <SectionCard label="IDENTITY">
        {managerProfile && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <Avatar appearance={managerProfile.appearance} role="COACH" size={52} />
              <View style={{ flex: 1 }}>
                <PixelText size={9} upper>{managerProfile.name}</PixelText>
                <BodyText size={11} dim style={{ marginTop: 2 }}>{managerProfile.nationality}</BodyText>
              </View>
            </View>
            <View style={{ height: 2, backgroundColor: WK.border, marginBottom: 14 }} />
          </>
        )}
        <PixelText size={7} dim style={{ marginBottom: 6 }}>CLUB NAME</PixelText>
        <TextInput
          value={clubNameDraft}
          onChangeText={setClubNameDraft}
          onBlur={commitClubName}
          returnKeyType="done"
          onSubmitEditing={commitClubName}
          style={{ ...inputStyle, marginBottom: 12 }}
        />
        <PixelText size={7} dim style={{ marginBottom: 6 }}>STADIUM</PixelText>
        <TextInput
          value={stadiumDraft}
          onChangeText={setStadiumDraft}
          onBlur={commitStadiumName}
          returnKeyType="done"
          onSubmitEditing={commitStadiumName}
          placeholder="e.g. The Factory Ground"
          placeholderTextColor={WK.dim}
          style={inputStyle}
        />
      </SectionCard>

      <KeyStaffSection coaches={coaches} onNavigateToHire={onNavigateToHire} />

      <TouchableOpacity
        onPress={() => router.push('/transfers')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
          paddingHorizontal: 14,
          paddingVertical: 12,
          ...pixelShadow,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ArrowLeftRight size={12} color={WK.tealLight} />
          <PixelText size={8} color={WK.tealLight}>TRANSFER HISTORY</PixelText>
        </View>
        <ChevronRight size={14} color={WK.dim} />
      </TouchableOpacity>

      <SectionCard label="TACTICS">
        <PixelText size={7} dim style={{ marginBottom: 8 }}>FORMATION</PixelText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {FORMATIONS.map((f) => (
            <Pressable
              key={f}
              onPress={() => { hapticTap(); setFormation(f); }}
              style={{
                paddingHorizontal: 16, paddingVertical: 10,
                backgroundColor: club.formation === f ? WK.yellow : WK.tealMid,
                borderWidth: 2,
                borderColor: club.formation === f ? WK.yellow : WK.border,
                ...pixelShadow,
              }}
            >
              <PixelText size={9} color={club.formation === f ? WK.border : WK.text}>{f}</PixelText>
            </Pressable>
          ))}
        </View>
        <PixelText size={7} dim style={{ marginBottom: 8 }}>PLAYING STYLE</PixelText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {PLAYING_STYLES.map((s) => (
            <Pressable
              key={s}
              onPress={() => { hapticTap(); setPlayingStyle(s); }}
              style={{
                paddingHorizontal: 16, paddingVertical: 10,
                backgroundColor: club.playingStyle === s ? WK.yellow : WK.tealMid,
                borderWidth: 2,
                borderColor: club.playingStyle === s ? WK.yellow : WK.border,
                ...pixelShadow,
              }}
            >
              <PixelText size={8} color={club.playingStyle === s ? WK.border : WK.text}>
                {s.replace('_', ' ')}
              </PixelText>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      <SectionCard label="KIT COLOURS">
        <View style={{ flexDirection: 'row', marginBottom: 14 }}>
          {(['primary', 'secondary'] as const).map((slot, i) => (
            <Pressable
              key={slot}
              onPress={() => { hapticTap(); setKitSlot(slot); }}
              style={{
                flex: 1, paddingVertical: 9, alignItems: 'center',
                backgroundColor: kitSlot === slot ? WK.yellow : WK.tealMid,
                borderWidth: 2, borderColor: WK.border,
                borderRightWidth: i === 0 ? 1 : 2,
              }}
            >
              <PixelText size={7} color={kitSlot === slot ? WK.border : WK.text}>
                {slot === 'primary' ? 'PRIMARY' : 'SECONDARY'}
              </PixelText>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {KIT_COLORS.map((color) => {
            const isSelected = kitSlot === 'primary'
              ? club.primaryColor === color
              : club.secondaryColor === color;
            return (
              <Pressable
                key={color}
                onPress={() => handleSwatchPress(color)}
                style={{
                  width: 44, height: 44,
                  backgroundColor: color,
                  borderWidth: isSelected ? 3 : 1,
                  borderColor: isSelected ? WK.yellow : WK.border,
                }}
              />
            );
          })}
        </View>

        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1, height: 48, backgroundColor: club.primaryColor, borderWidth: 2, borderColor: WK.border }} />
          <View style={{ flex: 1, height: 48, backgroundColor: club.secondaryColor, borderWidth: 2, borderColor: WK.border, borderLeftWidth: 0 }} />
        </View>
      </SectionCard>

      <SectionCard label="CLUB BADGE">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 16 }}>
          <PixelFootballBadge
            baseShape={club.badgeShape ?? 'shield'}
            primaryColor={club.primaryColor}
            secondaryColor={club.secondaryColor}
            size={64}
          />
          <View style={{ flex: 1, gap: 6 }}>
            <PixelText size={7} dim>BADGE SHAPE</PixelText>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {BADGE_SHAPES.map(({ value, label }) => {
                const active = (club.badgeShape ?? 'shield') === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => { hapticTap(); setBadgeShape(value); }}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      alignItems: 'center',
                      backgroundColor: active ? WK.yellow : WK.tealMid,
                      borderWidth: 2,
                      borderColor: active ? WK.yellow : WK.border,
                    }}
                  >
                    <PixelText size={6} color={active ? WK.border : WK.text}>{label}</PixelText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </SectionCard>

    </ScrollView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

const STAND_SLUGS = ['north_stand', 'south_stand', 'east_stand', 'west_stand'] as const;

export default function OfficeScreen() {
  const [activeTab, setActiveTab] = useState<OfficeTab>('CLUB');
  const club = useClubStore((s) => s.club);
  const { templates, levels, conditions } = useFacilityStore();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  const balance = penceToPounds(
    typeof club.balance === 'number' && !isNaN(club.balance)
      ? club.balance
      : club.totalCareerEarnings * 100,
  );

  const stadiumTemplates = templates.filter((t) => t.category === 'STADIUM');

  // Build StadiumFacility list for the four stands
  const stadiumFacilities: StadiumFacility[] = STAND_SLUGS.map((slug) => {
    const tpl = templates.find((t) => t.slug === slug);
    return {
      slug,
      level:    levels[slug] ?? 0,
      maxLevel: tpl?.maxLevel ?? 5,
    };
  });

  // Stadium view fills the scrollview width (minus horizontal padding × 2)
  const stadiumViewSize = screenWidth - 20;

  function navigateToHire(role: string) {
    router.navigate({ pathname: '/(tabs)/facilities', params: { tab: 'HIRE', role } });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }} edges={['bottom']}>
      <PitchBackground />

      <PixelTopTabBar
        tabs={[...OFFICE_TABS]}
        active={activeTab}
        onChange={(t) => setActiveTab(t as OfficeTab)}
      />

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
        <PixelText size={10} upper>Office</PixelText>
        {activeTab === 'STADIUM'
          ? <PixelText size={7} color={WK.yellow}>{formatPounds(balance)}</PixelText>
          : <Badge label={(club.reputationTier ?? 'LOCAL').toUpperCase()} color="yellow" />
        }
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'CLUB' && <ClubPane onNavigateToHire={navigateToHire} />}
        {activeTab === 'FANS' && <FansScreen />}
        {activeTab === 'STADIUM' && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 10, marginTop: 10, paddingBottom: FAB_CLEARANCE }}>
            <StadiumOverviewCard
              stadiumName={club.stadiumName ?? null}
              templates={templates}
              levels={levels}
            />

            <StadiumView
              facilities={stadiumFacilities}
              stadiumName={club.stadiumName ?? 'UNNAMED STADIUM'}
              primaryColour={club.primaryColor}
              size={stadiumViewSize}
            />

            <TouchableOpacity
              onPress={() => router.push('/museum')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: WK.tealCard,
                borderWidth: 3,
                borderColor: WK.border,
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 8,
                ...pixelShadow,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Trophy size={12} color={WK.yellow} />
                <PixelText size={8} color={WK.yellow}>VIEW MUSEUM</PixelText>
              </View>
              <ChevronRight size={14} color={WK.dim} />
            </TouchableOpacity>

            {stadiumTemplates.map((template) => (
              <FacilityCard
                key={template.slug}
                template={template}
                level={levels[template.slug] ?? 0}
                condition={conditions[template.slug] ?? 100}
                balance={balance}
              />
            ))}
            {stadiumTemplates.length > 0 && (
              <View style={{
                backgroundColor: WK.tealCard,
                borderWidth: 3,
                borderColor: WK.yellow,
                padding: 12,
                marginTop: 4,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                ...pixelShadow,
              }}>
                <BodyText size={13} dim>TOTAL WEEKLY UPKEEP</BodyText>
                <PixelText size={12} color={WK.orange}>
                  £{(calculateTotalUpkeep(stadiumTemplates, levels) / 100).toFixed(2)}
                </PixelText>
              </View>
            )}
          </ScrollView>
        )}
        {activeTab === 'ATTENDANCE' && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 10, marginTop: 10, paddingBottom: FAB_CLEARANCE }}>
            <AttendanceSummaryCard />
            <AttendanceLog />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
