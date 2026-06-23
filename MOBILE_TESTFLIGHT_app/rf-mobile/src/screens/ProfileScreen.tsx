import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, User as UserIcon, MapPin, Cake, Mail, Phone, Store, Camera, Save, Lock,
  Shield, FileText, Trash2, ChevronRight,
} from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple, formatPhone } from '../platform';
import { avatarColor, initials } from '../helpers';
import { fetchProfile, updateProfile, fetchBranches, deleteAccount, PRIVACY_URL, TERMS_URL } from '../api';
import { makeStyles } from '../styles';
import { Skeleton } from '../components/Skeleton';
import type { Profile, RFBranch } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// PROFILE SCREEN — ФИО, аватар, роль, город, дата рождения, точки
// ════════════════════════════════════════════════════════════════════
export const ProfileScreen: React.FC<{ onBack: () => void; onDeleted?: () => void }> = ({ onBack, onDeleted }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [branches, setBranches] = useState<RFBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Удаление аккаунта (App Store 5.1.1(v)) — двухшаговое: раскрыть → подтвердить паролем.
  const [deleteMode, setDeleteMode] = useState(false);
  const [delPwd, setDelPwd] = useState('');
  const [deleting, setDeleting] = useState(false);

  const onConfirmDelete = async () => {
    if (!delPwd.trim()) { Alert.alert('Введите пароль', 'Подтвердите удаление текущим паролем.'); return; }
    haptic('medium'); setDeleting(true);
    try {
      await deleteAccount(delPwd.trim());
      haptic('success');
      Alert.alert('Аккаунт удалён', 'Ваша учётная запись и связанные данные удалены.');
      onDeleted?.();
    } catch (e: any) {
      haptic('error');
      Alert.alert('Не удалось удалить', e?.message ?? 'Попробуйте ещё раз.');
    } finally { setDeleting(false); }
  };

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

            {/* Аккаунт и приватность */}
            <Text style={s.menuSectionTitle}>Аккаунт и приватность</Text>
            <View style={s.fieldCard}>
              <Pressable style={s.fieldRow} {...ripple()} onPress={() => Linking.openURL(PRIVACY_URL)}>
                <View style={s.fieldIcon}><Shield size={15} color={C.ink2} strokeWidth={2.2} /></View>
                <View style={s.fieldText}><Text style={s.fieldValue}>Политика конфиденциальности</Text></View>
                <ChevronRight size={16} color={C.ink4} strokeWidth={2.2} />
              </Pressable>
              <Pressable style={[s.fieldRow, s.fieldRowLast]} {...ripple()} onPress={() => Linking.openURL(TERMS_URL)}>
                <View style={s.fieldIcon}><FileText size={15} color={C.ink2} strokeWidth={2.2} /></View>
                <View style={s.fieldText}><Text style={s.fieldValue}>Пользовательское соглашение</Text></View>
                <ChevronRight size={16} color={C.ink4} strokeWidth={2.2} />
              </Pressable>
            </View>

            {/* Удаление аккаунта */}
            {!deleteMode ? (
              <Pressable
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: r.pad, marginTop: 14, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: C.warn }}
                {...ripple()}
                onPress={() => { haptic('light'); setDeleteMode(true); }}
              >
                <Trash2 size={15} color={C.warn} strokeWidth={2.2} />
                <Text style={{ color: C.warn, fontWeight: '700', fontSize: 14 }}>Удалить аккаунт</Text>
              </Pressable>
            ) : (
              <View style={{ marginHorizontal: r.pad, marginTop: 14, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: C.warn, backgroundColor: C.surface }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: C.ink, marginBottom: 6 }}>Удалить аккаунт безвозвратно?</Text>
                <Text style={{ fontSize: 12.5, color: C.ink3, lineHeight: 18, marginBottom: 12 }}>
                  Будут удалены ваша учётная запись и связанные личные данные (профиль, уведомления). Данные вашего заведения не удаляются. Действие необратимо — подтвердите паролем.
                </Text>
                <TextInput
                  style={{ backgroundColor: C.paper, borderRadius: 10, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: C.ink, marginBottom: 12 }}
                  value={delPwd}
                  onChangeText={setDelPwd}
                  placeholder="Текущий пароль"
                  placeholderTextColor={C.ink4}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: C.line }}
                    {...ripple()}
                    onPress={() => { haptic('light'); setDeleteMode(false); setDelPwd(''); }}
                    disabled={deleting}
                  >
                    <Text style={{ color: C.ink2, fontWeight: '700', fontSize: 14 }}>Отмена</Text>
                  </Pressable>
                  <Pressable
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: deleting ? C.line : C.warn }}
                    {...ripple('rgba(255,255,255,0.25)')}
                    onPress={onConfirmDelete}
                    disabled={deleting}
                  >
                    {deleting ? <ActivityIndicator size="small" color="#fff" /> : <Trash2 size={15} color="#fff" strokeWidth={2.2} />}
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Удалить</Text>
                  </Pressable>
                </View>
              </View>
            )}
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
