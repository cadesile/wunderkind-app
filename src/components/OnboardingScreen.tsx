import { useState, useMemo } from 'react';
import {
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
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
import { ACADEMY_COUNTRIES, AcademyCountryCode, ACADEMY_CODE_TO_NATIONALITY } from '@/utils/nationality';
import { generateAppearance } from '@/engine/appearance';
import type { ManagerProfile } from '@/types/academy';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onRegister: (academyName: string, country: AcademyCountryCode, managerProfile: ManagerProfile) => Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

type Gender = 'male' | 'female';
type Step = 'manager' | 'country' | 'name';

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

function StepIndicator({ current }: { current: Step }) {
  const steps: Step[] = ['manager', 'country', 'name'];
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

export function OnboardingScreen({ onRegister }: Props) {
  const [step, setStep] = useState<Step>('manager');

  // Manager profile state
  const [managerName, setManagerName]               = useState('');
  const [dobDay, setDobDay]                         = useState<number | null>(null);
  const [dobMonth, setDobMonth]                     = useState<number | null>(null);
  const [dobYear, setDobYear]                       = useState<number | null>(null);
  const [gender, setGender]                         = useState<Gender | null>(null);
  const [managerNationality, setManagerNationality] = useState<AcademyCountryCode | null>(null);

  // Academy state
  const [selectedCountry, setSelectedCountry] = useState<AcademyCountryCode | null>(null);
  const [academyName, setAcademyName]         = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const dob = buildDob(dobDay, dobMonth, dobYear);

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

  const canSubmit = academyName.trim().length > 0 && selectedCountry !== null && !loading;

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
        nationality: ACADEMY_CODE_TO_NATIONALITY[managerNationality],
        appearance:  avatarAppearance,
      };
      await onRegister(academyName.trim(), selectedCountry, profile);
    } catch (err) {
      setError('Could not create academy. Please check your connection and try again.');
      console.error('[Onboarding] registerAcademy failed:', err);
    } finally {
      setLoading(false);
    }
  }

  const selectedCountryMeta = ACADEMY_COUNTRIES.find((c) => c.code === selectedCountry);

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

          <StepIndicator current={step} />

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
                  {ACADEMY_COUNTRIES.map((country) => {
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
                label="NEXT → ACADEMY LOCATION"
                variant="yellow"
                fullWidth
                onPress={() => setStep('country')}
                disabled={!managerValid}
              />
            </>
          )}

          {/* ── Step 2: Academy Location ── */}
          {step === 'country' && (
            <>
              <Pressable onPress={() => setStep('manager')} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
                  <PixelText size={6} color={WK.tealLight}>← BACK</PixelText>
                  <PixelText size={7} dim>MANAGER: {managerName.trim().toUpperCase()}</PixelText>
                </View>
              </Pressable>

              <PixelText size={7} dim style={{ marginBottom: 12, textAlign: 'center' }}>
                WHERE IS YOUR ACADEMY BASED?
              </PixelText>

              <View style={{ gap: 8, marginBottom: 20 }}>
                {ACADEMY_COUNTRIES.map((country) => {
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
                label="NEXT → ACADEMY NAME"
                variant="yellow"
                fullWidth
                onPress={() => setStep('name')}
                disabled={selectedCountry === null}
              />
            </>
          )}

          {/* ── Step 3: Academy Name ── */}
          {step === 'name' && (
            <>
              {selectedCountryMeta && (
                <Pressable onPress={() => setStep('country')} style={{ marginBottom: 16 }}>
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
                    {ACADEMY_CODE_TO_NATIONALITY[managerNationality!]} • {gender?.toUpperCase()} • {dobYear}
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
                <PixelText size={7} dim style={{ marginBottom: 10 }}>ACADEMY NAME</PixelText>
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
                  value={academyName}
                  onChangeText={setAcademyName}
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
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 3,
                  borderColor: WK.yellow,
                  backgroundColor: 'rgba(245,200,66,0.15)',
                }}>
                  <ActivityIndicator color={WK.yellow} />
                </View>
              ) : (
                <Button
                  label="▶ CREATE MY ACADEMY"
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
                YOU'LL RECEIVE 10 YOUTH PLAYERS + FULL ACADEMY SETUP
              </PixelText>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
