import React, { useState, useCallback, useMemo } from 'react';
import { View, FlatList, RefreshControl, Modal, TextInput, ScrollView, Pressable } from 'react-native';
import { FAB_CLEARANCE } from './_layout';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SlidersHorizontal } from 'lucide-react-native';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { PixelTopTabBar } from '@/components/ui/PixelTopTabBar';
import { PixelText, BodyText } from '@/components/ui/PixelText';
import { FlagText } from '@/components/ui/FlagText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PixelDialog } from '@/components/ui/PixelDialog';
import { useMarketStore } from '@/stores/marketStore';
import { useClubStore } from '@/stores/clubStore';
import { useCoachStore } from '@/stores/coachStore';
import { useScoutStore } from '@/stores/scoutStore';
import { useGameConfigStore } from '@/stores/gameConfigStore';
import { marketApi } from '@/api/endpoints/market';
import { Avatar } from '@/components/ui/Avatar';
import { MarketCoach, MarketScout } from '@/types/market';
import { WK, pixelShadow } from '@/constants/theme';
import { penceToPounds, formatPounds } from '@/utils/currency';
import { hapticTap } from '@/utils/haptics';
import { TIER_ORDER } from '@/types/club';
import type { ClubTier } from '@/types/club';
import type { StaffRole, Coach } from '@/types/coach';
import { useArchetypeStore } from '@/stores/archetypeStore';
import { getArchetypeForPlayer } from '@/engine/archetypeEngine';
import type { Player } from '@/types/player';

const OFFICE_TABS = ['CLUB', 'HIRE'] as const;
type OfficeTab = typeof OFFICE_TABS[number];

// ─── Hire Pane (Unified Market) ───────────────────────────────────────────────

type HireItem =
  | { kind: 'coach'; data: MarketCoach }
  | { kind: 'scout'; data: MarketScout };

function formatStaffRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Maps a staff role to the GameConfig field that caps it. */
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
    default:                     return config.maxCoachesPerClub; // coach / assistant_coach
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

  const { club, addBalance } = useClubStore();
  const hiredCoaches = useCoachStore((s) => s.coaches);
  const hiredScouts  = useScoutStore((s) => s.scouts);
  const config       = useGameConfigStore((s) => s.config);
  const staffRoles   = config.staffRoles;
  const archetypes   = useArchetypeStore((s) => s.archetypes);

  const weekNumber  = club.weekNumber ?? 1;
  const clubTierKey = (club.reputationTier?.toLowerCase() ?? 'local') as ClubTier;

  const [showRoleFilter, setShowRoleFilter] = useState(false);
  const [signError, setSignError]           = useState<string | null>(null);
  const [tierPopup, setTierPopup]           = useState<string | null>(null);
  const [capPopup, setCapPopup]             = useState<CapBlock | null>(null);

  /** Returns existing hires for a role, or null if under cap. */
  function getCapBlock(role: string): CapBlock | null {
    const cap = getRoleCap(role, config);
    const coachesOfRole = hiredCoaches.filter((c) => c.role === role);
    const scoutsOfRole  = role === 'scout' ? hiredScouts : [];
    const total = coachesOfRole.length + scoutsOfRole.length;
    if (total < cap) return null;
    // Return the first existing hire for display in the popup
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

  const allItems: HireItem[] = [
    ...coaches.map((c) => ({ kind: 'coach' as const, data: c })),
    ...marketScouts.map((s) => ({ kind: 'scout' as const, data: s })),
  ];

  const filtered =
    selectedRole === 'ALL'
      ? allItems
      : allItems.filter((item) => {
          return item.data.role === selectedRole;
        });

  const visibleItems = filtered.map((item) => {
    const itemTierKey = (item.data.tier ?? 'local') as ClubTier;
    const tierRestricted = TIER_ORDER[itemTierKey] > TIER_ORDER[clubTierKey];
    const signingFeePounds = Math.round((item.data.salary * 4) / 100);
    const canAfford = (club.balance ?? 0) >= signingFeePounds;
    return { ...item, tierRestricted, canAfford, signingFeePounds };
  });

  function signCoach(mc: MarketCoach) {
    const block = getCapBlock(mc.role);
    if (block) { setCapPopup(block); return; }
    const fee = Math.round((mc.salary * 4) / 100);
    if ((club.balance ?? 0) < fee) {
      setSignError(`INSUFFICIENT FUNDS — need £${fee.toLocaleString()}`);
      return;
    }
    addBalance(-fee);
    hireCoach(mc.id, weekNumber);
  }

  function signScout(ms: MarketScout) {
    const block = getCapBlock(ms.role);
    if (block) { setCapPopup(block); return; }
    const fee = Math.round((ms.salary * 4) / 100);
    if ((club.balance ?? 0) < fee) {
      setSignError(`INSUFFICIENT FUNDS — need £${fee.toLocaleString()}`);
      return;
    }
    addBalance(-fee);
    hireScout(ms.id, weekNumber);
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Filter toolbar */}
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 8,
        borderBottomWidth: 2, borderBottomColor: WK.border,
      }}>
        <BodyText size={11} dim>{filtered.length} AVAILABLE</BodyText>
        <Pressable
          onPress={() => { hapticTap(); setShowRoleFilter(true); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <SlidersHorizontal size={14} color={selectedRole !== 'ALL' ? WK.yellow : WK.dim} />
          <PixelText size={7} color={selectedRole !== 'ALL' ? WK.yellow : WK.dim}>
            {selectedRole === 'ALL' ? 'FILTER' : formatStaffRole(selectedRole).toUpperCase()}
          </PixelText>
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
            return (
              <Pressable
                onPress={() => {
                  if (tierRestricted) { setTierPopup('Tier Restriction: Upgrade your club to hire this staff member.'); return; }
                  signCoach(mc);
                }}
                style={[{
                  backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border,
                  padding: 12, marginBottom: 10, ...pixelShadow,
                  opacity: isDisabled ? 0.55 : 1,
                }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Avatar appearance={undefined} role="COACH" size={44} />
                  <View style={{ flex: 1 }}>
                    <BodyText size={14} upper numberOfLines={1}>{mc.firstName} {mc.lastName}</BodyText>
                    <PixelText size={8} color={WK.tealLight}>{formatStaffRole(mc.role).toUpperCase()}</PixelText>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                      <FlagText nationality={mc.nationality} size={11} />
                      <BodyText size={11} dim>· £{Math.round(mc.salary / 100).toLocaleString()}/wk</BodyText>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Badge label={`INF ${mc.influence}`} color="yellow" />
                    <BodyText size={10} dim>Fee: £{signingFeePounds.toLocaleString()}</BodyText>
                  </View>
                </View>
              </Pressable>
            );
          }

          // Scout card
          const ms = item.data;
          const rangeLabel: Record<string, string> = { local: 'LOCAL', national: 'NATIONAL', international: 'INTL' };
          const rangeColor: Record<string, string> = { local: WK.dim, national: WK.yellow, international: WK.red };
          const range = ms.scoutingRange ?? 'local';
          return (
            <Pressable
              onPress={() => {
                if (tierRestricted) { setTierPopup('Tier Restriction: Upgrade your club to hire this scout.'); return; }
                signScout(ms);
              }}
              style={[{
                backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border,
                padding: 12, marginBottom: 10, ...pixelShadow,
                opacity: isDisabled ? 0.55 : 1,
              }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Avatar appearance={undefined} role="SCOUT" size={44} />
                <View style={{ flex: 1 }}>
                  <BodyText size={14} upper numberOfLines={1}>{ms.firstName} {ms.lastName}</BodyText>
                  <PixelText size={8} color={rangeColor[range]}>{rangeLabel[range]} SCOUT</PixelText>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <FlagText nationality={ms.nationality} size={11} />
                    <BodyText size={11} dim>· £{Math.round(ms.salary / 100).toLocaleString()}/wk</BodyText>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Badge label={`${ms.successRate}%`} color="green" />
                  <BodyText size={10} dim>Fee: £{signingFeePounds.toLocaleString()}</BodyText>
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <BodyText size={12} dim style={{ textAlign: 'center', marginTop: 32 }}>
            NO STAFF AVAILABLE
          </BodyText>
        }
      />

      {/* Role filter overlay */}
      <Modal visible={showRoleFilter} transparent animationType="fade" onRequestClose={() => setShowRoleFilter(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}
          onPress={() => setShowRoleFilter(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{
              backgroundColor: WK.tealCard, borderTopWidth: 3, borderTopColor: WK.border,
              padding: 16, paddingBottom: 32,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <PixelText size={9} upper>HIRE BY ROLE</PixelText>
                <Pressable onPress={() => setShowRoleFilter(false)}>
                  <PixelText size={9} color={WK.dim}>✕</PixelText>
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {roleOptions.map((role) => (
                  <Pressable
                    key={role}
                    onPress={() => { hapticTap(); setSelectedRole(role); setShowRoleFilter(false); }}
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
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Sign error */}
      {signError && (
        <PixelDialog
          visible
          title="SIGN FAILED"
          message={signError}
          onConfirm={() => setSignError(null)}
          onClose={() => setSignError(null)}
        />
      )}

      {/* Tier restriction popup */}
      {tierPopup && (
        <PixelDialog
          visible
          title="TIER RESTRICTION"
          message={tierPopup}
          onConfirm={() => setTierPopup(null)}
          onClose={() => setTierPopup(null)}
        />
      )}

      {/* Role cap popup — shows current hire when slot is full */}
      {capPopup && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setCapPopup(null)}>
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 24 }}
            onPress={() => setCapPopup(null)}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={{
                backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border,
                padding: 20, ...pixelShadow,
              }}>
                <PixelText size={9} upper style={{ marginBottom: 4 }}>ROLE OCCUPIED</PixelText>
                <BodyText size={12} dim style={{ marginBottom: 16 }}>
                  This role is already filled. Release the current hire before signing a replacement.
                </BodyText>

                {/* Mini-card for current hire */}
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: WK.tealMid, borderWidth: 2, borderColor: WK.border,
                  padding: 12,
                }}>
                  <Avatar
                    appearance={capPopup.appearance}
                    role="COACH"
                    size={48}
                    morale={capPopup.morale}
                    age={capPopup.age}
                  />
                  <View style={{ flex: 1, gap: 4 }}>
                    <BodyText size={13} upper numberOfLines={1}>{capPopup.name}</BodyText>
                    <PixelText size={7} color={WK.tealLight}>
                      {formatStaffRole(capPopup.role).toUpperCase()}
                    </PixelText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      {capPopup.nationality ? <FlagText nationality={capPopup.nationality} size={11} /> : null}
                      {capPopup.influence !== undefined && (
                        <Badge label={`INF ${capPopup.influence}`} color="yellow" />
                      )}
                      {capPopup.personality && (() => {
                        const arch = getArchetypeForPlayer(
                          { personality: capPopup.personality } as unknown as Player,
                          archetypes,
                        );
                        return arch ? (
                          <View style={{
                            paddingHorizontal: 5, paddingVertical: 2,
                            borderWidth: 2, borderColor: WK.border,
                            backgroundColor: WK.tealDark,
                          }}>
                            <PixelText size={6} color={WK.yellow}>{arch.name.toUpperCase()}</PixelText>
                          </View>
                        ) : null;
                      })()}
                    </View>
                  </View>
                </View>

                <Pressable
                  onPress={() => setCapPopup(null)}
                  style={{
                    marginTop: 16, paddingVertical: 10, alignItems: 'center',
                    backgroundColor: WK.tealMid, borderWidth: 2, borderColor: WK.border,
                  }}
                >
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

// ─── Club Pane (AMP Profile Editor) ───────────────────────────────────────────

const FORMATIONS = ['4-4-2', '4-3-3', '3-5-2', '5-4-1', '4-2-3-1'] as const;
const PLAYING_STYLES = ['POSSESSION', 'DIRECT', 'COUNTER', 'HIGH_PRESS'] as const;
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

// Roles capped at 1 per club — shown as individual cards in the CLUB pane.
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
          </View>
        );
      })}
    </SectionCard>
  );
}

function ClubPane({ onNavigateToHire }: { onNavigateToHire: (role: string) => void }) {
  const {
    club, managerProfile,
    setName, setStadiumName, setFormation, setPlayingStyle, setClubColors,
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

      {/* ── IDENTITY ── */}
      <SectionCard label="IDENTITY">
        {managerProfile && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <Avatar appearance={managerProfile.appearance} role="COACH" size={52} />
              <View style={{ flex: 1 }}>
                <PixelText size={9} upper>{managerProfile.name}</PixelText>
                <BodyText size={11} dim style={{ marginTop: 2 }}>{managerProfile.nationality}</BodyText>
              </View>
              <Badge label="AMP" color="yellow" />
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

      {/* ── KEY STAFF ── */}
      <KeyStaffSection coaches={coaches} onNavigateToHire={onNavigateToHire} />

      {/* ── TACTICS ── */}
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

      {/* ── KIT COLOURS ── */}
      <SectionCard label="KIT COLOURS">
        {/* Segmented slot toggle */}
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

        {/* Shared swatch grid */}
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

        {/* Preview strip */}
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1, height: 48, backgroundColor: club.primaryColor, borderWidth: 2, borderColor: WK.border }} />
          <View style={{ flex: 1, height: 48, backgroundColor: club.secondaryColor, borderWidth: 2, borderColor: WK.border, borderLeftWidth: 0 }} />
        </View>
      </SectionCard>


    </ScrollView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function OfficeScreen() {
  const [activeTab, setActiveTab] = useState<OfficeTab>('CLUB');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const club = useClubStore((s) => s.club);

  function navigateToHire(role: string) {
    setSelectedRole(role);
    setActiveTab('HIRE');
  }

  // balance is stored in pence — convert to whole pounds for display
  const balance = penceToPounds(
    typeof club.balance === 'number' && !isNaN(club.balance)
      ? club.balance
      : club.totalCareerEarnings * 100,
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }} edges={['bottom']}>
      <PitchBackground />

      {/* Tab navigation */}
      <PixelTopTabBar
        tabs={[...OFFICE_TABS]}
        active={activeTab}
        onChange={(t) => {
          if (t !== 'HIRE') setSelectedRole('ALL');
          setActiveTab(t as OfficeTab);
        }}
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
        <PixelText size={10} upper>Office</PixelText>
        {activeTab === 'HIRE'
          ? <PixelText size={7} color={WK.yellow}>{formatPounds(balance)}</PixelText>
          : <Badge label={(club.reputationTier ?? 'LOCAL').toUpperCase()} color="yellow" />
        }
      </View>

      {/* Pane content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'CLUB' && <ClubPane onNavigateToHire={navigateToHire} />}
        {activeTab === 'HIRE' && <HirePane selectedRole={selectedRole} setSelectedRole={setSelectedRole} />}
      </View>
    </SafeAreaView>
  );
}
