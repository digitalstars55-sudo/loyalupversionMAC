import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, User as UserIcon, MapPin, Cake, Mail, Phone, Store, Camera, Save, Lock,
} from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple, formatPhone } from '../platform';
import { avatarColor, initials } from '../helpers';
import { fetchProfile, updateProfile, fetchBranches } from '../api';
import { makeStyles } from '../styles';
import { Skeleton } from '../components/Skeleton';
import type { Profile, RFBranch } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// PROFILE SCREEN — ФИО, аватар, роль, город, дата рождения, точки
// ════════════════════════════════════════════════════════════════════
export const ProfileScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [branches, setBranches] = useState<RFBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // editable state
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [birthday, setBirthday] = useState('');

  useEffect(() => {
    Promise.all([fetchProfile(), fetchBranches()])
      .then(([p, br]) => {
        setProfile(p);
        setBranches(br);
        setFullName(p.full_name);
        setCity(p.city ?? '');
        setBirthday(isoToDDMMYYYY(p.birthday));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const birthdayLocked = !!profile?.birthday_set_at;
  const dirty = profile && (
    fullName !== profile.full_name ||
    city !== (profile.city ?? '') ||
    (!birthdayLocked && birthday !== isoToDDMMYYYY(profile.birthday))
  );

  const onSave = async () => {
    if (!profile) return;
    haptic('medium');
    setSaving(true);
    try {
      const isoBday = ddmmyyyyToIso(birthday);
      const next = await updateProfile({
        full_name: fullName,
        city,
        // ДР отправляем только если ещё не был зафиксирован и юзер реально его ввёл
        ...(birthdayLocked || !isoBday ? {} : { birthday: isoBday }),
      });
      setProfile(next);
      haptic('success');
      Alert.alert('Сохранено', 'Изменения профиля применены.');
    } catch (e: any) {
      haptic('error');
      Alert.alert('Ошибка', e?.message ?? 'Не удалось сохранить');
    } finally { setSaving(false); }
  };

  const myBranches = profile
    ? branches.filter(b => b.id !== 0 && (
        profile.branch_ids.length === 0 || profile.branch_ids.includes(b.id)
      ))
    : [];

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={s.backHeader}>
        <Pressable style={s.backBtn} {...ripple()} onPress={onBack}>
          <ChevronLeft size={20} color={C.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={s.screenTitleBlock}>
          <Text style={s.screenTitleSuper}>Аккаунт</Text>
          <Text style={s.screenTitleMain}>Профиль</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {loading || !profile ? (
          <View style={[s.profileHero, { paddingVertical: 30 }]}>
            <Skeleton w={96} h={96} radius={48} />
            <View style={{ height: 12 }} />
            <Skeleton w="60%" h={20} />
            <View style={{ height: 8 }} />
            <Skeleton w={140} h={22} radius={50} />
          </View>
        ) : (
          <>
            {/* Hero — аватар + имя + роль */}
            <View style={s.profileHero}>
              <View style={[s.profileAvatarWrap, { backgroundColor: avatarColor(profile.full_name) }]}>
                <Text style={s.profileAvatarText}>{initials(profile.full_name)}</Text>
                <Pressable
                  style={s.profileAvatarEdit}
                  {...ripple('rgba(255,255,255,0.22)', true)}
                  onPress={() => Alert.alert('Аватар', 'Загрузка фото профиля появится в следующем обновлении.')}
                >
                  <Camera size={14} color={C.surface} strokeWidth={2.4} />
                </Pressable>
              </View>
              <Text style={s.profileName} numberOfLines={2}>{profile.full_name}</Text>
              <View style={s.profileRolePill}>
                <Text style={s.profileRolePillText}>{profile.role_label}</Text>
              </View>
            </View>

            {/* Editable fields */}
            <Text style={s.menuSectionTitle}>Личные данные</Text>
            <View style={s.fieldCard}>
              <FieldRow
                icon={<UserIcon size={15} color={C.ink2} strokeWidth={2.2} />}
                label="ФИО" s={s}
              >
                <TextInput
                  style={s.fieldInput}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Иванов Иван Иванович"
                  placeholderTextColor={C.ink4}
                  autoCorrect={false}
                  maxLength={64}
                />
              </FieldRow>
              <FieldRow
                icon={<MapPin size={15} color={C.ink2} strokeWidth={2.2} />}
                label="Город" s={s}
              >
                <TextInput
                  style={s.fieldInput}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Москва"
                  placeholderTextColor={C.ink4}
                  autoCorrect={false}
                  maxLength={40}
                />
              </FieldRow>
              <FieldRow
                icon={profile.birthday_set_at
                  ? <Lock size={15} color={C.ink4} strokeWidth={2.2} />
                  : <Cake size={15} color={C.ink2} strokeWidth={2.2} />
                }
                label="Дата рождения" s={s} last
              >
                {profile.birthday_set_at ? (
                  <Text style={s.fieldValue}>{birthday || '—'}</Text>
                ) : (
                  <TextInput
                    style={s.fieldInput}
                    value={birthday}
                    onChangeText={(v) => setBirthday(maskDate(v))}
                    placeholder="ДД.ММ.ГГГГ"
                    placeholderTextColor={C.ink4}
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                )}
              </FieldRow>
            </View>

            {/* Подсказка про ДР */}
            {profile.birthday_set_at ? (
              <View style={[s.modalHint, { marginHorizontal: r.pad, marginBottom: 12 }]}>
                <View style={s.modalHintHeader}>
                  <Lock size={11} color={C.hintInk} strokeWidth={2.4} />
                  <Text style={s.modalHintTitle}>ДР зафиксирован</Text>
                </View>
                <Text style={s.modalHintText}>
                  Дата рождения установлена {fmtSetAt(profile.birthday_set_at)}. Её можно поставить только один раз — это защита от подбора подарков ко ДР. Если ошиблись — обратитесь к менеджеру ЛоялUP.
                </Text>
              </View>
            ) : (
              <View style={[s.modalHint, { marginHorizontal: r.pad, marginBottom: 12 }]}>
                <Text style={s.modalHintText}>
                  ⚠ Дата рождения устанавливается только один раз. Перепроверьте перед сохранением — изменить потом сможет только менеджер ЛоялUP.
                </Text>
              </View>
            )}

            {/* Read-only: контакты */}
            <Text style={s.menuSectionTitle}>Контакты</Text>
            <View style={s.fieldCard}>
              <FieldRow
                icon={<Mail size={15} color={C.ink2} strokeWidth={2.2} />}
                label="Email" s={s}
              >
                <Text style={s.fieldValue} numberOfLines={1}>{profile.email ?? '—'}</Text>
              </FieldRow>
              <FieldRow
                icon={<Phone size={15} color={C.ink2} strokeWidth={2.2} />}
                label="Телефон" s={s} last
              >
                <Text style={s.fieldValue}>{profile.phone ? formatPhone(profile.phone) : '—'}</Text>
              </FieldRow>
            </View>

            {/* Branches */}
            <Text style={s.menuSectionTitle}>Точки доступа</Text>
            <View style={s.fieldCard}>
              {myBranches.length === 0 ? (
                <View style={[s.fieldRow, s.fieldRowLast, { paddingVertical: 18 }]}>
                  <Text style={s.fieldValueMuted}>Нет привязанных точек</Text>
                </View>
              ) : myBranches.map((b, i) => (
                <View key={b.id} style={[s.fieldRow, i === myBranches.length - 1 && s.fieldRowLast]}>
                  <View style={s.fieldIcon}>
                    <Store size={15} color={C.purpleDeep} strokeWidth={2.2} />
                  </View>
                  <View style={s.fieldText}>
                    <Text style={s.fieldValue} numberOfLines={1} ellipsizeMode="tail">{b.name}</Text>
                    {b.address && (
                      <Text style={s.fieldValueMuted} numberOfLines={1} ellipsizeMode="tail">
                        {b.address}{b.city ? `, ${b.city}` : ''}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* Save */}
            <View style={[s.contactActions, { marginTop: 8 }]}>
              <Pressable
                style={[s.btn, s.btnPrimary, !dirty && { opacity: 0.5 }]}
                {...ripple('rgba(255,255,255,0.22)')}
                onPress={onSave}
                disabled={!dirty || saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color={C.surface} />
                  : <Save size={15} color={C.surface} strokeWidth={2.2} />
                }
                <Text style={s.btnPrimaryText}>
                  {saving ? 'Сохраняем…' : dirty ? 'Сохранить' : 'Без изменений'}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
const FieldRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  last?: boolean;
  s: S;
  children: React.ReactNode;
}> = ({ icon, label, last, s, children }) => (
  <View style={[s.fieldRow, last && s.fieldRowLast]}>
    <View style={s.fieldIcon}>{icon}</View>
    <View style={s.fieldText}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  </View>
);

// ДД.ММ.ГГГГ-маска
function maskDate(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  const parts: string[] = [];
  if (digits.length >= 2) { parts.push(digits.slice(0, 2)); }
  else if (digits.length > 0) { parts.push(digits); return parts.join('.'); }
  if (digits.length >= 4) { parts.push(digits.slice(2, 4)); }
  else if (digits.length > 2) { parts.push(digits.slice(2)); return parts.join('.'); }
  if (digits.length > 4) { parts.push(digits.slice(4, 8)); }
  return parts.join('.');
}

// ISO (1988-04-12) → DD.MM.YYYY (12.04.1988)
function isoToDDMMYYYY(iso: string | undefined): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  return `${m[3]}.${m[2]}.${m[1]}`;
}

// DD.MM.YYYY → ISO; пустую строку или невалидный возвращает ''
function ddmmyyyyToIso(s: string): string {
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return '';
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function fmtSetAt(iso: string): string {
  const d = new Date(iso);
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
