import { useState, useMemo, useEffect } from 'react';
import {
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PixelText } from '@/components/ui/PixelText';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { WK, pixelShadow } from '@/constants/theme';
import { CLUB_COUNTRIES, ClubCountryCode, CLUB_CODE_TO_NATIONALITY } from '@/utils/nationality';
import { generateAppearance } from '@/engine/appearance';
import type { ManagerProfile } from '@/types/club';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onRegister: (clubName: string, country: ClubCountryCode, managerProfile: ManagerProfile) => Promise<void>;
  enabledCountries: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

type Gender = 'male' | 'female';
type Step = 'manager' | 'country' | 'name';

const RANDOM_FIRST_NAMES_MALE   = ['James', 'Carlos', 'Marco', 'Luca', 'Pierre', 'Stefan', 'David', 'Thomas', 'Andre', 'Roberto', 'Diego', 'Klaus', 'Jan', 'Erik', 'Miguel'];
const RANDOM_FIRST_NAMES_FEMALE = ['Maria', 'Elena', 'Sophie', 'Laura', 'Emma', 'Lucia', 'Anna', 'Clara', 'Isabel', 'Sara', 'Marta', 'Ingrid', 'Bianca', 'Valentina', 'Nadia'];
const RANDOM_LAST_NAMES         = ['Silva', 'Müller', 'Smith', 'García', 'Rossi', 'Santos', 'Weber', 'Costa', 'Lopez', 'Bauer', 'Ferreira', 'Novak', 'Van Dijk', 'Moretti', 'Ramos'];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const SETUP_STEPS = [
  'REGISTERING YOUR CLUB',
  'BUILDING YOUR STADIUM',
  'GENERATING YOUR SQUAD',
  'ORGANISING LEAGUE STRUCTURE',
  'ASSIGNING COACHING STAFF',
  'SCOUTING THE REGION',
  'SETTING UP FACILITIES',
  'PREPARING YOUR FINANCES',
  'FINALISING EVERYTHING',
];

const CURRENT_YEAR = new Date().getFullYear();
const MIN_MANAGER_AGE = 25;
const MAX_MANAGER_AGE = 65;

const DAY_OPTIONS   = Array.from({ length: 31 }, (_, i) => i + 1);
const MONTH_OPTIONS = [
  { value: 1,  label: 'January' },
  { value: 2,  label: 'February' },
  { value: 3,  label: 'March' },
  { value: 4,  label: 'April' },
  { value: 5,  label: 'May' },
  { value: 6,  label: 'June' },
  { value: 7,  label: 'July' },
  { value: 8,  label: 'August' },
  { value: 9,  label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];
const YEAR_OPTIONS = Array.from(
  { length: MAX_MANAGER_AGE - MIN_MANAGER_AGE + 1 },
  (_, i) => CURRENT_YEAR - MIN_MANAGER_AGE - i,
);

// ─── PixelPicker ─────────────────────────────────────────────────────────────

interface PickerOption<T> { value: T; label: string }

interface PixelPickerProps<T> {
  label: string;
  options: PickerOption<T>[];
  value: T | null;
  onChange: (v: T) => void;
  placeholder?: string;
}

function PixelPicker<T extends string | number>({
  label, options, value, onChange, placeholder = 'SELECT...',
}: PixelPickerProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={{ flex: 1 }}>
      <PixelText size={5} dim style={{ marginBottom: 4 }}>{label}</PixelText>
      <Pressable onPress={() => setOpen(true)}>
        <View style={{
          backgroundColor: WK.tealDark,
          borderWidth: 2,
          borderColor: value !== null ? WK.tealLight : WK.border,
          paddingHorizontal: 10,
          paddingVertical: 10,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <PixelText size={6} color={selected ? WK.text : WK.dim}>
            {selected ? selected.label.toUpperCase() : placeholder}
          </PixelText>
          <PixelText size={6} color={WK.yellow}>▼</PixelText>
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: 24 }}
          onPress={() => setOpen(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{
              backgroundColor: WK.tealCard,
              borderWidth: 3,
              borderColor: WK.border,
              maxHeight: 360,
              ...pixelShadow,
            }}>
              <View style={{
                borderBottomWidth: 2,
                borderBottomColor: WK.border,
                padding: 12,
              }}>
                <PixelText size={7} upper>{label}</PixelText>
              </View>
              <FlatList
                data={options}
                keyExtractor={(item) => String(item.value)}
                renderItem={({ item }) => {
                  const isSelected = item.value === value;
                  return (
                    <Pressable onPress={() => { onChange(item.value); setOpen(false); }}>
                      <View style={{
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        backgroundColor: isSelected ? WK.yellow : 'transparent',
                        borderBottomWidth: 1,
                        borderBottomColor: WK.border,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <PixelText size={7} color={isSelected ? WK.border : WK.text} upper>
                          {item.label}
                        </PixelText>
                        {isSelected && <PixelText size={7} color={WK.border}>✓</PixelText>}
                      </View>
                    </Pressable>
                  );
                }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDob(day: number | null, month: number | null, year: number | null): string {
  const d = day ?? 1;
  const m = month ?? 1;
  const y = year ?? (CURRENT_YEAR - 35);
  return `${y}-${String(m).padStart(2, '0')}-${String(Math.min(d, 28)).padStart(2, '0')}`;
}

function computeAge(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return age;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepIndicator({ current, showCountryStep }: { current: Step; showCountryStep: boolean }) {
  const steps: Step[] = showCountryStep ? ['manager', 'country', 'name'] : ['manager', 'name'];
  const idx = steps.indexOf(current);
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
      {steps.map((_, i) => (
        <View
          key={i}
          style={{
            width: i === idx ? 24 : 8,
            height: 4,
            backgroundColor: i <= idx ? WK.yellow : WK.border,
          }}
        />
      ))}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function OnboardingScreen({ onRegister, enabledCountries }: Props) {
  const [step, setStep] = useState<Step>('manager');

  // Manager profile state
  const [managerName, setManagerName]               = useState('');
  const [dobDay, setDobDay]                         = useState<number | null>(null);
  const [dobMonth, setDobMonth]                     = useState<number | null>(null);
  const [dobYear, setDobYear]                       = useState<number | null>(null);
  const [gender, setGender]                         = useState<Gender | null>(null);
  const [managerNationality, setManagerNationality] = useState<ClubCountryCode | null>(null);

  // Club state
  const [selectedCountry, setSelectedCountry] = useState<ClubCountryCode | null>(null);
  const [clubName, setClubName]         = useState('');

  const availableCountries = CLUB_COUNTRIES.filter((c) => enabledCountries.includes(c.code));

  // Auto-select and skip the country picker when only one country is enabled.
  useEffect(() => {
    if (availableCountries.length === 1 && selectedCountry === null) {
      setSelectedCountry(availableCountries[0].code);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [setupStepIdx, setSetupStepIdx] = useState(0);
  const [dots, setDots]               = useState(1);

  useEffect(() => {
    if (!loading) { setSetupStepIdx(0); setDots(1); return; }
    const stepTimer = setInterval(() => setSetupStepIdx((i) => (i + 1) % SETUP_STEPS.length), 2200);
    const dotTimer  = setInterval(() => setDots((d) => (d % 3) + 1), 450);
    return () => { clearInterval(stepTimer); clearInterval(dotTimer); };
  }, [loading]);

  const dob = buildDob(dobDay, dobMonth, dobYear);

  function randomiseManager() {
    const g = pick(['male', 'female'] as Gender[]);
    const first = pick(g === 'male' ? RANDOM_FIRST_NAMES_MALE : RANDOM_FIRST_NAMES_FEMALE);
    const last  = pick(RANDOM_LAST_NAMES);
    setManagerName(`${first} ${last}`);
    setGender(g);
    setManagerNationality(pick(CLUB_COUNTRIES).code);
    setDobDay(pick(DAY_OPTIONS));
    setDobMonth(pick(MONTH_OPTIONS).value);
    setDobYear(pick(YEAR_OPTIONS));
  }

  function randomiseCountry() {
    setSelectedCountry(pick(availableCountries).code);
  }

  // Live avatar preview — deterministic from manager name
  const avatarAppearance = useMemo(() => {
    const seed = managerName.trim() || 'preview-manager';
    const age  = dobYear ? computeAge(dob) : 35;
    const base = generateAppearance(seed, 'COACH', age);
    return gender === 'female' ? { ...base, facialHair: 'none' as const } : base;
  }, [managerName, dob, dobYear, gender]);

  const managerValid =
    managerName.trim().length >= 2 &&
    gender !== null &&
    managerNationality !== null &&
    dobDay !== null &&
    dobMonth !== null &&
    dobYear !== null;

  const canSubmit = clubName.trim().length > 0 && selectedCountry !== null && !loading;

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!canSubmit || !selectedCountry || !gender || !managerNationality) return;
    setLoading(true);
    setError(null);
    try {
      const profile: ManagerProfile = {
        name:        managerName.trim(),
        dateOfBirth: dob,
        gender,
        nationality: CLUB_CODE_TO_NATIONALITY[managerNationality],
        appearance:  avatarAppearance,
      };
      await onRegister(clubName.trim(), selectedCountry, profile);
    } catch (err) {
      setError('COULD NOT CONNECT TO SERVER.\nCHECK YOUR CONNECTION AND TRY AGAIN.');
      console.error('[Onboarding] registerClub failed:', err);
    } finally {
      setLoading(false);
    }
  }

  const selectedCountryMeta = CLUB_COUNTRIES.find((c) => c.code === selectedCountry);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingVertical: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={{ marginBottom: 20, alignItems: 'center' }}>
            <PixelText size={14} upper style={{ textAlign: 'center', marginBottom: 8 }}>WUNDERKIND</PixelText>
            <PixelText size={8} upper style={{ textAlign: 'center', marginBottom: 6 }}>FACTORY</PixelText>
            <View style={{ height: 3, width: 80, backgroundColor: WK.yellow, marginTop: 8 }} />
          </View>

          <StepIndicator current={step} showCountryStep={availableCountries.length > 1} />

          {/* ── Step 1: Manager Profile ── */}
          {step === 'manager' && (
            <>
              <PixelText size={7} dim style={{ marginBottom: 16, textAlign: 'center' }}>
                WHO IS YOUR MANAGER?
              </PixelText>

              {/* Avatar preview */}
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Avatar appearance={avatarAppearance} role="COACH" size={80} morale={70} />
                <PixelText size={5} dim style={{ marginTop: 6 }}>YOUR MANAGER</PixelText>
                <Pressable onPress={randomiseManager} style={{ marginTop: 10 }}>
                  <View style={{
                    borderWidth: 2,
                    borderColor: WK.tealLight,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    backgroundColor: WK.tealDark,
                  }}>
                    <PixelText size={6} color={WK.tealLight}>⚄ RANDOM</PixelText>
                  </View>
                </Pressable>
              </View>

              {/* Name */}
              <View style={{
                backgroundColor: WK.tealCard,
                borderWidth: 3,
                borderColor: WK.border,
                padding: 14,
                marginBottom: 12,
                ...pixelShadow,
              }}>
                <PixelText size={6} dim style={{ marginBottom: 8 }}>MANAGER NAME</PixelText>
                <TextInput
                  style={{
                    backgroundColor: WK.tealDark,
                    borderWidth: 2,
                    borderColor: WK.tealLight,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    color: WK.text,
                    fontFamily: WK.font,
                    fontSize: 8,
                  }}
                  placeholder="E.G. ALEX MORGAN"
                  placeholderTextColor={WK.dim}
                  value={managerName}
                  onChangeText={setManagerName}
                  maxLength={40}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>

              {/* Date of birth — three dropdowns */}
              <View style={{
                backgroundColor: WK.tealCard,
                borderWidth: 3,
                borderColor: WK.border,
                padding: 14,
                marginBottom: 12,
                ...pixelShadow,
              }}>
                <PixelText size={6} dim style={{ marginBottom: 10 }}>DATE OF BIRTH</PixelText>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <PixelPicker
                    label="DAY"
                    options={DAY_OPTIONS.map((d) => ({ value: d, label: String(d) }))}
                    value={dobDay}
                    onChange={setDobDay}
                    placeholder="DD"
                  />
                  <PixelPicker
                    label="MONTH"
                    options={MONTH_OPTIONS}
                    value={dobMonth}
                    onChange={setDobMonth}
                    placeholder="MON"
                  />
                  <PixelPicker
                    label="YEAR"
                    options={YEAR_OPTIONS.map((y) => ({ value: y, label: String(y) }))}
                    value={dobYear}
                    onChange={setDobYear}
                    placeholder="YYYY"
                  />
                </View>
              </View>

              {/* Gender */}
              <View style={{
                backgroundColor: WK.tealCard,
                borderWidth: 3,
                borderColor: WK.border,
                padding: 14,
                marginBottom: 12,
                ...pixelShadow,
              }}>
                <PixelText size={6} dim style={{ marginBottom: 8 }}>GENDER</PixelText>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['male', 'female'] as Gender[]).map((g) => {
                    const isSelected = gender === g;
                    return (
                      <Pressable key={g} onPress={() => setGender(g)} style={{ flex: 1 }}>
                        <View style={{
                          paddingVertical: 12,
                          backgroundColor: isSelected ? WK.yellow : WK.tealDark,
                          borderWidth: 2,
                          borderColor: isSelected ? WK.yellow : WK.tealLight,
                          alignItems: 'center',
                        }}>
                          <PixelText size={7} color={isSelected ? WK.border : WK.dim} upper>{g}</PixelText>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Nationality */}
              <View style={{
                backgroundColor: WK.tealCard,
                borderWidth: 3,
                borderColor: WK.border,
                padding: 14,
                marginBottom: 20,
                ...pixelShadow,
              }}>
                <PixelText size={6} dim style={{ marginBottom: 8 }}>NATIONALITY</PixelText>
                <View style={{ gap: 6 }}>
                  {CLUB_COUNTRIES.map((country) => {
                    const isSelected = managerNationality === country.code;
                    return (
                      <Pressable key={country.code} onPress={() => setManagerNationality(country.code)}>
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          paddingVertical: 8,
                          paddingHorizontal: 10,
                          backgroundColor: isSelected ? WK.yellow : WK.tealDark,
                          borderWidth: 2,
                          borderColor: isSelected ? WK.yellow : WK.tealLight,
                        }}>
                          <PixelText size={14}>{country.flag}</PixelText>
                          <PixelText size={7} color={isSelected ? WK.border : WK.text} upper>
                            {country.label}
                          </PixelText>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Button
                label={availableCountries.length === 1 ? 'NEXT → CLUB NAME' : 'NEXT → CLUB LOCATION'}
                variant="yellow"
                fullWidth
                onPress={() => setStep(availableCountries.length === 1 ? 'name' : 'country')}
                disabled={!managerValid}
              />
            </>
          )}

          {/* ── Step 2: Club Location ── */}
          {step === 'country' && (
            <>
              <Pressable onPress={() => setStep('manager')} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
                  <PixelText size={6} color={WK.tealLight}>← BACK</PixelText>
                  <PixelText size={7} dim>MANAGER: {managerName.trim().toUpperCase()}</PixelText>
                </View>
              </Pressable>

              <PixelText size={7} dim style={{ marginBottom: 12, textAlign: 'center' }}>
                WHERE IS YOUR CLUB BASED?
              </PixelText>

              <View style={{ gap: 8, marginBottom: 20 }}>
                <Pressable onPress={randomiseCountry}>
                  <View style={{
                    borderWidth: 2,
                    borderColor: WK.tealLight,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    backgroundColor: WK.tealDark,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}>
                    <PixelText size={6} color={WK.tealLight}>⚄ RANDOM LOCATION</PixelText>
                  </View>
                </Pressable>
                {availableCountries.map((country) => {
                  const isSelected = selectedCountry === country.code;
                  return (
                    <Pressable key={country.code} onPress={() => setSelectedCountry(country.code)}>
                      <View style={{
                        backgroundColor: WK.tealCard,
                        borderWidth: 3,
                        borderColor: isSelected ? WK.yellow : WK.border,
                        padding: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        ...(isSelected ? pixelShadow : {}),
                      }}>
                        <PixelText size={18}>{country.flag}</PixelText>
                        <PixelText size={8} upper color={isSelected ? WK.yellow : WK.text}>
                          {country.label}
                        </PixelText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <Button
                label="NEXT → CLUB NAME"
                variant="yellow"
                fullWidth
                onPress={() => setStep('name')}
                disabled={selectedCountry === null}
              />
            </>
          )}

          {/* ── Step 3: Club Name ── */}
          {step === 'name' && (
            <>
              {selectedCountryMeta && (
                <Pressable onPress={() => setStep(availableCountries.length === 1 ? 'manager' : 'country')} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
                    <PixelText size={6} color={WK.tealLight}>← CHANGE</PixelText>
                    <PixelText size={8}>{selectedCountryMeta.flag}</PixelText>
                    <PixelText size={7} color={WK.yellow}>{selectedCountryMeta.label.toUpperCase()}</PixelText>
                  </View>
                </Pressable>
              )}

              {/* Manager summary */}
              <View style={{
                backgroundColor: WK.tealCard,
                borderWidth: 3,
                borderColor: WK.border,
                padding: 14,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                ...pixelShadow,
              }}>
                <Avatar appearance={avatarAppearance} role="COACH" size={52} morale={70} />
                <View style={{ flex: 1 }}>
                  <PixelText size={7} upper>{managerName}</PixelText>
                  <PixelText size={5} dim style={{ marginTop: 4 }}>
                    {CLUB_CODE_TO_NATIONALITY[managerNationality!]} • {gender?.toUpperCase()} • {dobYear}
                  </PixelText>
                </View>
              </View>

              <View style={{
                backgroundColor: WK.tealCard,
                borderWidth: 3,
                borderColor: WK.border,
                padding: 16,
                marginBottom: 12,
                ...pixelShadow,
              }}>
                <PixelText size={7} dim style={{ marginBottom: 10 }}>CLUB NAME</PixelText>
                <TextInput
                  style={{
                    backgroundColor: WK.tealDark,
                    borderWidth: 2,
                    borderColor: loading ? WK.dim : WK.tealLight,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: WK.text,
                    fontFamily: WK.font,
                    fontSize: 8,
                    marginBottom: 4,
                  }}
                  placeholder="E.G. NORTH STAR FC"
                  placeholderTextColor={WK.dim}
                  value={clubName}
                  onChangeText={(text) => { setClubName(text); setError(null); }}
                  maxLength={40}
                  editable={!loading}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoFocus
                />
              </View>

              {loading ? (
                <View style={{
                  borderWidth: 3,
                  borderColor: WK.yellow,
                  backgroundColor: 'rgba(245,200,66,0.08)',
                  padding: 16,
                }}>
                  <PixelText size={5} color={WK.yellow} style={{ textAlign: 'center', marginBottom: 12 }}>
                    SETTING UP YOUR CLUB
                  </PixelText>
                  <PixelText size={6} style={{ textAlign: 'center', marginBottom: 14, minHeight: 20 }}>
                    {SETUP_STEPS[setupStepIdx]}{'.'.repeat(dots)}
                  </PixelText>
                  {/* Pixel progress bar */}
                  <View style={{ height: 6, backgroundColor: WK.border, borderWidth: 1, borderColor: WK.tealLight }}>
                    <View style={{
                      height: '100%',
                      width: `${Math.round(((setupStepIdx + 1) / SETUP_STEPS.length) * 100)}%`,
                      backgroundColor: WK.yellow,
                    }} />
                  </View>
                </View>
              ) : (
                <Button
                  label="▶ CREATE MY CLUB"
                  variant="yellow"
                  fullWidth
                  onPress={handleSubmit}
                  disabled={!canSubmit}
                />
              )}

              {error && (
                <PixelText size={6} color={WK.red} style={{ textAlign: 'center', marginTop: 12 }}>
                  {error}
                </PixelText>
              )}

              <PixelText size={6} dim style={{ textAlign: 'center', marginTop: 16 }}>
                YOUR JOURNEY TO FOOTBALLING GREATNESS BEGINS HERE
              </PixelText>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
