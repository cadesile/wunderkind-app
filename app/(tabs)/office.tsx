import { useState, useCallback, useMemo } from 'react';
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

const OFFICE_TABS = ['CLUB', 'HIRE'] as const;
type OfficeTab = typeof OFFICE_TABS[number];

// ─── Hire Pane (Unified Market) ───────────────────────────────────────────────

type HireItem =
  | { kind: 'coach'; data: MarketCoach }
  | { kind: 'scout'; data: MarketScout };

function formatStaffRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function HirePane() {
  const coaches      = useMarketStore((s) => s.coaches);
  const marketScouts = useMarketStore((s) => s.marketScouts);
  const hireCoach    = useMarketStore((s) => s.hireCoach);
  const hireScout    = useMarketStore((s) => s.hireScout);
  const refreshPool  = useMarketStore((s) => s.refreshMarketPool);
  const isLoading    = useMarketStore((s) => s.isLoading);

  const { club, addBalance } = useClubStore();
  const staffRoles = useGameConfigStore((s) => s.config.staffRoles);

  const weekNumber  = club.weekNumber ?? 1;
  const clubTierKey = (club.reputationTier?.toLowerCase() ?? 'local') as ClubTier;

  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [showRoleFilter, setShowRoleFilter] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [tierPopup, setTierPopup] = useState<string | null>(null);

  const roleOptions = ['ALL', ...staffRoles];

  const allItems: HireItem[] = [
    ...coaches.map((c) => ({ kind: 'coach' as const, data: c })),
    ...marketScouts.map((s) => ({ kind: 'scout' as const, data: s })),
  ];

  const filtered =
    selectedRole === 'ALL'
      ? allItems
      : allItems.filter((item) => {
          if (item.kind === 'scout') return selectedRole === 'scout';
          return item.data.rawRole === selectedRole;
        });

  const visibleItems = filtered.map((item) => {
    const itemTierKey = (item.data.tier ?? 'local') as ClubTier;
    const tierRestricted = TIER_ORDER[itemTierKey] > TIER_ORDER[clubTierKey];
    const signingFeePounds = Math.round((item.data.salary * 4) / 100);
    const canAfford = (club.balance ?? 0) >= signingFeePounds;
    return { ...item, tierRestricted, canAfford, signingFeePounds };
  });

  function signCoach(mc: MarketCoach) {
    const fee = Math.round((mc.salary * 4) / 100);
    if ((club.balance ?? 0) < fee) {
      setSignError(`INSUFFICIENT FUNDS — need £${fee.toLocaleString()}`);
      return;
    }
    addBalance(-fee);
    hireCoach(mc.id, weekNumber);
  }

  function signScout(ms: MarketScout) {
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
                    <PixelText size={8} color={WK.tealLight}>{formatStaffRole(mc.rawRole).toUpperCase()}</PixelText>
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

function ClubPane() {
  const {
    club, managerProfile,
    setName, setStadiumName, setFormation, setPlayingStyle, setClubColors,
  } = useClubStore();

  const [clubNameDraft, setClubNameDraft] = useState(club.name);
  const [stadiumDraft, setStadiumDraft] = useState(club.stadiumName ?? '');

  function commitClubName() {
    const trimmed = clubNameDraft.trim();
    if (trimmed) setName(trimmed);
    else setClubNameDraft(club.name);
  }

  function commitStadiumName() {
    const trimmed = stadiumDraft.trim();
    setStadiumName(trimmed || null);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: FAB_CLEARANCE }}>

      {/* AMP identity — avatar + name (read-only, set at onboarding) */}
      {managerProfile && (
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 14,
          backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border,
          padding: 12, marginBottom: 16, ...pixelShadow,
        }}>
          <Avatar appearance={managerProfile.appearance} role="COACH" size={52} />
          <View style={{ flex: 1 }}>
            <PixelText size={9} upper>{managerProfile.name}</PixelText>
            <BodyText size={11} dim style={{ marginTop: 2 }}>{managerProfile.nationality}</BodyText>
          </View>
          <Badge label="AMP" color="yellow" />
        </View>
      )}

      {/* Club Name */}
      <View style={{ marginBottom: 16 }}>
        <PixelText size={8} dim style={{ marginBottom: 6 }}>CLUB NAME</PixelText>
        <TextInput
          value={clubNameDraft}
          onChangeText={setClubNameDraft}
          onBlur={commitClubName}
          returnKeyType="done"
          onSubmitEditing={commitClubName}
          style={{
            backgroundColor: WK.tealMid, color: WK.text,
            borderWidth: 2, borderColor: WK.border,
            padding: 10, fontFamily: 'monospace', fontSize: 14,
          }}
        />
      </View>

      {/* Stadium Name */}
      <View style={{ marginBottom: 16 }}>
        <PixelText size={8} dim style={{ marginBottom: 6 }}>STADIUM NAME</PixelText>
        <TextInput
          value={stadiumDraft}
          onChangeText={setStadiumDraft}
          onBlur={commitStadiumName}
          returnKeyType="done"
          onSubmitEditing={commitStadiumName}
          placeholder="e.g. The Factory Ground"
          placeholderTextColor={WK.dim}
          style={{
            backgroundColor: WK.tealMid, color: WK.text,
            borderWidth: 2, borderColor: WK.border,
            padding: 10, fontFamily: 'monospace', fontSize: 14,
          }}
        />
      </View>

      {/* Formation */}
      <View style={{ marginBottom: 16 }}>
        <PixelText size={8} dim style={{ marginBottom: 8 }}>FORMATION</PixelText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
      </View>

      {/* Playing Style */}
      <View style={{ marginBottom: 16 }}>
        <PixelText size={8} dim style={{ marginBottom: 8 }}>PLAYING STYLE</PixelText>
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
      </View>

      {/* Kit Colours */}
      <View style={{ marginBottom: 8 }}>
        <PixelText size={8} dim style={{ marginBottom: 8 }}>PRIMARY COLOUR</PixelText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {KIT_COLORS.map((color) => (
            <Pressable
              key={`p-${color}`}
              onPress={() => { hapticTap(); setClubColors(color, club.secondaryColor); }}
              style={{
                width: 40, height: 40,
                backgroundColor: color,
                borderWidth: club.primaryColor === color ? 3 : 1,
                borderColor: club.primaryColor === color ? WK.yellow : WK.border,
              }}
            />
          ))}
        </View>
      </View>

      <View style={{ marginBottom: 20 }}>
        <PixelText size={8} dim style={{ marginBottom: 8 }}>SECONDARY COLOUR</PixelText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {KIT_COLORS.map((color) => (
            <Pressable
              key={`s-${color}`}
              onPress={() => { hapticTap(); setClubColors(club.primaryColor, color); }}
              style={{
                width: 40, height: 40,
                backgroundColor: color,
                borderWidth: club.secondaryColor === color ? 3 : 1,
                borderColor: club.secondaryColor === color ? WK.yellow : WK.border,
              }}
            />
          ))}
        </View>

        {/* Colour preview strip */}
        <View style={{ flexDirection: 'row', marginTop: 14, gap: 0 }}>
          <View style={{ flex: 1, height: 24, backgroundColor: club.primaryColor, borderWidth: 2, borderColor: WK.border }} />
          <View style={{ flex: 1, height: 24, backgroundColor: club.secondaryColor, borderWidth: 2, borderColor: WK.border, borderLeftWidth: 0 }} />
        </View>
      </View>

    </ScrollView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function OfficeScreen() {
  const [activeTab, setActiveTab] = useState<OfficeTab>('CLUB');
  const club = useClubStore((s) => s.club);

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
        onChange={(t) => setActiveTab(t as OfficeTab)}
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
        <PixelText size={7} color={WK.yellow}>{formatPounds(balance)}</PixelText>
      </View>

      {/* Pane content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'CLUB' && <ClubPane />}
        {activeTab === 'HIRE' && <HirePane />}
      </View>
    </SafeAreaView>
  );
}
