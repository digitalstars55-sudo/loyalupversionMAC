import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, FlatList, RefreshControl, Switch, Modal, ScrollView,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Share,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, ChevronRight, Plus, X, Crown, Shield, Eye, UserCheck, UserX, Save,
  FileText, Lock, Trash2,
} from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple, formatPhone, maskRuPhoneInput, ruPhoneToE164 } from '../platform';
import { avatarColor, initials, relativeTime } from '../helpers';
import { fetchStaff, updateStaff, inviteStaff, deleteStaff, fetchBranches, linkExistingStaff } from '../api';
import { DEFAULT_PERMS_BY_ROLE } from '../mocks';
import { makeStyles } from '../styles';
import { SkeletonCard } from '../components/Skeleton';
import { SheetModal } from '../components/SheetModal';
import type { Staff, StaffPermissions, StaffRole, RFBranch } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// STAFF SCREEN — список сотрудников + управление правами
// Видно только владельцу (manage_staff = true). Здесь предполагаем что
// текущий пользователь = владелец.
// ════════════════════════════════════════════════════════════════════
export const StaffScreen: React.FC<{ onBack: () => void; onOpenAuditLog?: () => void }> = ({ onBack, onOpenAuditLog }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [list, setList] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<RFBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  // RBAC: какие роли текущий юзер вправе назначать (с бэка). Пусто = не может управлять.
  const [manageableRoles, setManageableRoles] = useState<('manager' | 'viewer')[]>([]);

  const canManageStaffMember = (st: Staff) => manageableRoles.includes(st.role as 'manager' | 'viewer');

  const load = async () => {
    try {
      const [staffRes, br] = await Promise.all([fetchStaff(), fetchBranches()]);
      setList(staffRes.staff); setBranches(br); setManageableRoles(staffRes.manageableRoles);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = () => { haptic('light'); setRefreshing(true); load(); };

  const onToggleActive = (st: Staff) => async (val: boolean) => {
    haptic('medium');
    setList(prev => prev.map(p => p.id === st.id ? { ...p, active: val } : p));
    try { await updateStaff({ id: st.id, active: val }); }
    catch (e: any) {
      // откат
      setList(prev => prev.map(p => p.id === st.id ? { ...p, active: !val } : p));
      Alert.alert('Ошибка', e?.message ?? 'Не удалось изменить статус');
    }
  };

  const onSavePerms = async (next: Staff) => {
    setList(prev => prev.map(p => p.id === next.id ? next : p));
    try {
      await updateStaff({
        id: next.id,
        role: next.role,
        permissions: next.permissions,
        branch_ids: next.branch_ids,
      });
      haptic('success');
    } catch (e: any) {
      haptic('error');
      Alert.alert('Ошибка', e?.message ?? 'Не удалось сохранить');
    }
  };

  const onInvite = async (data: {
    full_name: string; email?: string; phone?: string;
    role: 'manager' | 'viewer'; branch_ids: number[];
  }) => {
    try {
      // По умолчанию новый сотрудник видит ВСЕ точки (потом доступ можно сузить в
      // карточке сотрудника). Пустой список бэкенд трактует как «нет доступа», поэтому
      // здесь явно проставляем все точки сети.
      const allBranchIds = branches.filter(b => b.id !== 0).map(b => b.id);
      const payload = {
        ...data,
        branch_ids: (data.branch_ids && data.branch_ids.length) ? data.branch_ids : allBranchIds,
      };
      const created = await inviteStaff(payload);
      setList(prev => [...prev, created]);
      haptic('success');
      setInviteOpen(false);
      const login = created.login;
      const pwd = created.temp_password;
      if (login && pwd) {
        const creds =
          `Доступ в приложение ЛоялUP\n\nЛогин: ${login}\nПароль: ${pwd}\n\n` +
          `Войдите в приложение и смените пароль в настройках профиля.`;
        Alert.alert(
          'Сотрудник создан ✅',
          `Передайте эти данные сотруднику (показываем только сейчас):\n\n` +
          `Логин:  ${login}\nПароль:  ${pwd}`,
          [
            { text: 'Поделиться', onPress: () => { Share.share({ message: creds }).catch(() => {}); } },
            { text: 'Записал(а)', style: 'cancel' },
          ],
        );
      } else {
        Alert.alert('Готово', `Сотрудник ${data.full_name} создан.`);
      }
    } catch (e: any) {
      haptic('error');
      Alert.alert('Ошибка', e?.message ?? 'Не удалось пригласить');
    }
  };

  // Связать СУЩЕСТВУЮЩЕГО юзера с этой сетью — без нового логина/пароля.
  // Сценарий: сотрудник уже работает у меня в другой сети.
  const onLinkExisting = async (data: {
    username: string; role: 'manager' | 'viewer'; branch_ids: number[];
  }) => {
    try {
      const allBranchIds = branches.filter(b => b.id !== 0).map(b => b.id);
      const payload = {
        ...data,
        branch_ids: (data.branch_ids && data.branch_ids.length) ? data.branch_ids : allBranchIds,
      };
      const linked = await linkExistingStaff(payload);
      setList(prev => [...prev, linked]);
      haptic('success');
      setInviteOpen(false);
      Alert.alert(
        'Добавлен в сеть ✅',
        `${linked.full_name || data.username} теперь имеет доступ к этой сети. ` +
        `Логин и пароль не меняются — он входит как раньше, просто увидит дополнительный тенант в переключателе сетей.`,
      );
    } catch (e: any) {
      haptic('error');
      Alert.alert('Не удалось добавить', e?.message ?? 'Проверь логин (с учётом регистра).');
    }
  };

  const onDeleteStaff = (st: Staff) => {
    Alert.alert(
      'Удалить сотрудника?',
      `${st.full_name} потеряет доступ к этой сети. Действие можно повторить приглашением.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить', style: 'destructive',
          onPress: async () => {
            const prev = list;
            setList(p => p.filter(x => x.id !== st.id));
            setEditing(null);
            try { await deleteStaff(st.id); haptic('success'); }
            catch (e: any) {
              setList(prev); // откат
              haptic('error');
              Alert.alert('Ошибка', e?.message ?? 'Не удалось удалить');
            }
          },
        },
      ],
    );
  };

  const activeCount = list.filter(p => p.active).length;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={s.backHeader}>
        <Pressable style={s.backBtn} {...ripple()} onPress={onBack}>
          <ChevronLeft size={20} color={C.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={s.screenTitleBlock}>
          <Text style={s.screenTitleSuper}>Команда</Text>
          <Text style={s.screenTitleMain}>Сотрудники</Text>
        </View>
        {onOpenAuditLog && (
          <Pressable
            style={s.backBtn}
            {...ripple()}
            onPress={() => { haptic('light'); onOpenAuditLog(); }}
            accessibilityLabel="Журнал действий"
          >
            <FileText size={18} color={C.ink} strokeWidth={2.2} />
          </Pressable>
        )}
        {manageableRoles.length > 0 && (
          <Pressable
            style={[s.backBtn, { backgroundColor: C.purple, borderColor: C.purple }]}
            {...ripple('rgba(255,255,255,0.22)')}
            onPress={() => { haptic('light'); setInviteOpen(true); }}
            accessibilityLabel="Пригласить сотрудника"
          >
            <Plus size={18} color={C.surface} strokeWidth={2.4} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={list}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ paddingHorizontal: r.pad, paddingBottom: 130 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
        ListHeaderComponent={
          <View>
            <View style={[s.modalHint, { marginHorizontal: 0, marginBottom: 12 }]}>
              <Text style={s.modalHintText}>
                Активны: <Text style={{ fontFamily: 'Manrope_700Bold', color: C.ink }}>{activeCount} из {list.length}</Text>. Отключённые сотрудники не имеют доступа к приложению — для возврата просто включите тогл.
              </Text>
            </View>
            {loading && (
              <View style={{ gap: 10 }}>
                <SkeletonCard /><SkeletonCard /><SkeletonCard />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const canManage = canManageStaffMember(item);
          return (
            <StaffCard
              st={item}
              s={s}
              canManage={canManage}
              onPress={() => { if (!canManage) return; haptic('light'); setEditing(item); }}
              onToggleActive={onToggleActive(item)}
            />
          );
        }}
      />

      {/* Permissions edit modal */}
      <PermsModal
        staff={editing}
        branches={branches}
        s={s}
        manageableRoles={manageableRoles}
        onClose={() => setEditing(null)}
        onSave={(next) => { onSavePerms(next); setEditing(null); }}
        onDelete={onDeleteStaff}
      />

      {/* Invite modal */}
      <InviteModal
        visible={inviteOpen}
        branches={branches}
        s={s}
        manageableRoles={manageableRoles}
        onClose={() => setInviteOpen(false)}
        onInvite={onInvite}
        onLinkExisting={onLinkExisting}
      />
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
const StaffCard: React.FC<{
  st: Staff; s: S;
  canManage: boolean;
  onPress: () => void;
  onToggleActive: (v: boolean) => void;
}> = ({ st, s, canManage, onPress, onToggleActive }) => (
  <Pressable
    style={[s.staffCard, !st.active && s.staffCardInactive]}
    {...(canManage ? ripple() : {})}
    onPress={onPress}
  >
    <View style={[s.staffAvatar, { backgroundColor: avatarColor(st.full_name) }]}>
      <Text style={s.staffAvatarText}>{initials(st.full_name)}</Text>
    </View>
    <View style={s.staffBody}>
      <Text style={s.staffName} numberOfLines={1} ellipsizeMode="tail">{st.full_name}</Text>
      <View style={s.staffMeta}>
        <RolePill role={st.role} label={st.role_label} s={s} />
        {st.active ? (
          <View style={[s.staffMeta, { gap: 4 }]}>
            <View style={s.staffActiveDot} />
            <Text style={[s.listMetaText, { color: C.good }]}>
              {st.last_active_at ? relativeTime(st.last_active_at) : 'активен'}
            </Text>
          </View>
        ) : (
          <Text style={s.staffStatusOff}>отключён</Text>
        )}
      </View>
    </View>
    {st.role === 'owner' ? (
      <Crown size={18} color={C.limeDeep} strokeWidth={2.2} />
    ) : canManage ? (
      <Switch
        value={st.active}
        onValueChange={onToggleActive}
        trackColor={{ false: C.line, true: C.good }}
        thumbColor={C.surface}
        ios_backgroundColor={C.line}
      />
    ) : (
      <Lock size={16} color={C.ink3} strokeWidth={2.2} />
    )}
  </Pressable>
);

const RolePill: React.FC<{ role: StaffRole; label: string; s: S }> = ({ role, label, s }) => {
  const styleMap = {
    owner:   s.staffRolePillOwner,
    manager: s.staffRolePillManager,
    viewer:  s.staffRolePillViewer,
  };
  const colorMap = {
    owner:   C.ink,
    manager: C.purpleDeep,
    viewer:  C.ink2,
  };
  const Icon = role === 'owner' ? Crown : role === 'manager' ? Shield : Eye;
  return (
    <View style={[s.staffRolePill, styleMap[role]]}>
      <Icon size={10} color={colorMap[role]} strokeWidth={2.4} />
      <Text style={[s.staffRolePillText, { color: colorMap[role] }]}>{label}</Text>
    </View>
  );
};

// ────────────── Permissions modal ──────────────
const PermsModal: React.FC<{
  staff: Staff | null;
  branches: RFBranch[];
  s: S;
  manageableRoles: ('manager' | 'viewer')[];
  onClose: () => void;
  onSave: (next: Staff) => void;
  onDelete: (st: Staff) => void;
}> = ({ staff, branches, s, manageableRoles, onClose, onSave, onDelete }) => {
  const [role, setRole] = useState<StaffRole>('manager');
  const [perms, setPerms] = useState<StaffPermissions>(DEFAULT_PERMS_BY_ROLE.manager);
  const [branchIds, setBranchIds] = useState<number[]>([]);

  useEffect(() => {
    if (!staff) return;
    setRole(staff.role);
    setPerms(staff.permissions);
    setBranchIds(staff.branch_ids);
  }, [staff?.id]);

  if (!staff) return null;

  const isOwner = staff.role === 'owner';
  const onChangeRole = (next: StaffRole) => {
    if (next === 'owner') return; // нельзя назначить владельца через UI
    haptic('light');
    setRole(next);
    setPerms(DEFAULT_PERMS_BY_ROLE[next]);
  };
  const togglePerm = (key: keyof StaffPermissions) => () => {
    haptic('light');
    setPerms(p => ({ ...p, [key]: !p[key] }));
  };
  const toggleBranch = (id: number) => () => {
    haptic('light');
    setBranchIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <SheetModal visible={!!staff} onClose={onClose} maxHeightPct={0.92}>
          <View style={s.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.modalSuper}>Сотрудник</Text>
              <Text style={s.modalTitle} numberOfLines={1}>{staff.full_name}</Text>
            </View>
            <Pressable style={s.modalClose} {...ripple()} onPress={onClose}>
              <X size={16} color={C.ink} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24 }}>
            {/* Role picker */}
            <Text style={[s.menuSectionTitle, { paddingHorizontal: 0 }]}>Роль</Text>
            {isOwner ? (
              <View style={[s.modalHint, { marginHorizontal: 0 }]}>
                <Text style={s.modalHintText}>
                  Это владелец. Его роль и права изменить нельзя — у него полный доступ ко всему.
                </Text>
              </View>
            ) : (
              <View style={[s.pillsRow, { paddingHorizontal: 0 }]}>
                {(manageableRoles.length ? manageableRoles : (['manager', 'viewer'] as const)).map(role_ => {
                  const active = role === role_;
                  const label = role_ === 'manager' ? 'Управляющий' : 'Только просмотр';
                  return (
                    <Pressable
                      key={role_}
                      style={[s.pill, active && s.pillActive]}
                      {...ripple('rgba(255,255,255,0.18)')}
                      onPress={() => onChangeRole(role_)}
                    >
                      <Text style={[s.pillText, active && s.pillTextActive]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Permissions */}
            {!isOwner && (
              <>
                <Text style={[s.menuSectionTitle, { paddingHorizontal: 0, marginTop: 12 }]}>Доступ к разделам</Text>
                <View style={[s.menuCard, { marginHorizontal: 0 }]}>
                  <PermRow s={s} title="Главная и аналитика"   sub="RF, KPI, миграции"        on={perms.see_analytics}   onChange={togglePerm('see_analytics')} />
                  <PermRow s={s} title="Отзывы"                 sub="Видит ленту отзывов"     on={perms.see_reviews}     onChange={togglePerm('see_reviews')} />
                  <PermRow s={s} title="Отвечать на отзывы"     sub="Отправлять и закрывать"  on={perms.reply_reviews}   onChange={togglePerm('reply_reviews')} />
                  <PermRow s={s} title="Рассылки"               sub="История и охват"          on={perms.see_broadcasts}  onChange={togglePerm('see_broadcasts')} />
                  <PermRow s={s} title="Запускать рассылки"     sub="Создавать новые"          on={perms.send_broadcasts} onChange={togglePerm('send_broadcasts')} />
                  <PermRow s={s} title="Гости"                  sub="База клиентов"            on={perms.see_guests}      onChange={togglePerm('see_guests')} />
                  <PermRow s={s} title="Точки"                  sub="Список филиалов"          on={perms.see_branches}    onChange={togglePerm('see_branches')} />
                  <PermRow s={s} title="Настройка порогов RF"   sub="Изменять R/F границы"     on={perms.edit_thresholds} onChange={togglePerm('edit_thresholds')} />
                  <PermRow s={s} title="Подарки и категории"    sub="Создавать/редактировать каталог" on={perms.manage_catalog}    onChange={togglePerm('manage_catalog')} />
                  <PermRow s={s} title="Квесты"                  sub="Создавать задания для гостей" on={perms.manage_quests}     onChange={togglePerm('manage_quests')} />
                  <PermRow s={s} title="Акции"                   sub="Баннеры на главной"           on={perms.manage_promotions} onChange={togglePerm('manage_promotions')} />
                  <PermRow s={s} title="Изменять баланс гостей" sub="Ручное начисление/списание баллов" on={perms.adjust_coins}      onChange={togglePerm('adjust_coins')} last />
                </View>
              </>
            )}

            {/* Branches — раздел показывается всегда (даже если в сети 1 точка),
                чтобы было явно видно к каким точкам сотрудник имеет доступ.
                Раньше скрывалось при branches.length<=1 → пользователь думал
                что настройки доступа к точкам нет вообще. */}
            {!isOwner && branches.filter(b => b.id !== 0).length > 0 && (
              <>
                <Text style={[s.menuSectionTitle, { paddingHorizontal: 0, marginTop: 16 }]}>
                  ⚙ Доступ к точкам
                </Text>
                <View style={[s.menuCard, { marginHorizontal: 0 }]}>
                  {branches.filter(b => b.id !== 0).map((b, i, arr) => (
                    <PermRow
                      key={b.id} s={s}
                      title={b.name}
                      sub={b.address}
                      on={branchIds.includes(b.id)}
                      onChange={toggleBranch(b.id)}
                      last={i === arr.length - 1}
                    />
                  ))}
                </View>
                <Text style={[s.modalHintText, { paddingHorizontal: 8, marginTop: 8 }]}>
                  Отмечены точки, к которым у сотрудника есть доступ
                  (отзывы/аналитика/пуши). Сними галку — точка станет недоступна.
                  Должна быть отмечена хотя бы одна точка.
                </Text>
              </>
            )}

            {!isOwner && (
              <Pressable
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  marginTop: 22, paddingVertical: 13, borderRadius: 14,
                  backgroundColor: '#FDECEC', borderWidth: 1, borderColor: '#F3C7C7',
                }}
                {...ripple('rgba(220,38,38,0.12)')}
                onPress={() => onDelete(staff)}
              >
                <Trash2 size={15} color="#dc2626" strokeWidth={2.2} />
                <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 14, color: '#dc2626', marginLeft: 7 }}>
                  Удалить сотрудника
                </Text>
              </Pressable>
            )}
          </ScrollView>

          {!isOwner && (
            <View style={s.modalFooter}>
              <Pressable
                style={[s.btn, s.btnSecondary]}
                {...ripple()}
                onPress={onClose}
              >
                <Text style={s.btnSecondaryText}>Отмена</Text>
              </Pressable>
              <Pressable
                style={[s.btn, s.btnPrimary]}
                {...ripple('rgba(255,255,255,0.22)')}
                onPress={() => {
                  if (branches.filter(b => b.id !== 0).length > 0 && branchIds.length === 0) {
                    Alert.alert('Нет доступа к точкам',
                      'Отметьте хотя бы одну точку — иначе сотрудник не увидит данные ни по одной точке.');
                    return;
                  }
                  onSave({ ...staff, role, permissions: perms, branch_ids: branchIds });
                }}
              >
                <Save size={14} color={C.surface} strokeWidth={2.2} />
                <Text style={s.btnPrimaryText}>Сохранить</Text>
              </Pressable>
            </View>
          )}
    </SheetModal>
  );
};

const PermRow: React.FC<{
  s: S; title: string; sub?: string;
  on: boolean; onChange: () => void; last?: boolean;
}> = ({ s, title, sub, on, onChange, last }) => (
  <View style={[s.permRow, last && s.permRowLast]}>
    <View style={s.permLabel}>
      <Text style={s.permTitle}>{title}</Text>
      {sub && <Text style={s.permSub}>{sub}</Text>}
    </View>
    <Switch
      value={on}
      onValueChange={onChange}
      trackColor={{ false: C.line, true: C.purple }}
      thumbColor={C.surface}
      ios_backgroundColor={C.line}
    />
  </View>
);

// ────────────── Invite modal ──────────────
type InviteMode = 'new' | 'existing';

const InviteModal: React.FC<{
  visible: boolean;
  branches: RFBranch[];
  s: S;
  manageableRoles: ('manager' | 'viewer')[];
  onClose: () => void;
  onInvite: (p: {
    full_name: string; email?: string; phone?: string;
    role: 'manager' | 'viewer'; branch_ids: number[];
  }) => void;
  // Связать существующего юзера (по точному username) с этой сетью.
  // Сценарий: сотрудник работает в другой моей сети — добавляю сюда без
  // создания нового логина и пароля.
  onLinkExisting: (p: {
    username: string; role: 'manager' | 'viewer'; branch_ids: number[];
  }) => Promise<void>;
}> = ({ visible, branches, s, manageableRoles, onClose, onInvite, onLinkExisting }) => {
  const roleOptions = manageableRoles.length ? manageableRoles : (['manager', 'viewer'] as ('manager' | 'viewer')[]);
  const [mode, setMode] = useState<InviteMode>('new');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'manager' | 'viewer'>(roleOptions[0]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setMode('new');
      setName(''); setEmail(''); setPhone(''); setUsername('');
      setRole(roleOptions[0]);
    }
  }, [visible]);

  const validNew = name.trim().length >= 3 && (email.includes('@') || ruPhoneToE164(phone) !== '');
  const validExisting = username.trim().length >= 2;
  const valid = mode === 'new' ? validNew : validExisting;

  const submit = async () => {
    if (!valid) return;
    haptic('medium');
    setSubmitting(true);
    try {
      if (mode === 'new') {
        await onInvite({
          full_name: name.trim(),
          email: email.trim() || undefined,
          phone: ruPhoneToE164(phone) || undefined,
          role,
          branch_ids: [],
        });
      } else {
        await onLinkExisting({
          username: username.trim(),
          role,
          branch_ids: [],
        });
      }
    } finally { setSubmitting(false); }
  };

  return (
    <SheetModal visible={visible} onClose={onClose} maxHeightPct={0.92}>
          <View style={s.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.modalSuper}>Команда</Text>
              <Text style={s.modalTitle}>Пригласить сотрудника</Text>
            </View>
            <Pressable style={s.modalClose} {...ripple()} onPress={onClose}>
              <X size={16} color={C.ink} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 }}>
            {/* Переключатель режима: новый сотрудник vs связать существующего */}
            <View style={[s.pillsRow, { paddingHorizontal: 0, marginBottom: 12 }]}>
              {(['new', 'existing'] as InviteMode[]).map(m => {
                const active = mode === m;
                const label = m === 'new' ? '➕ Новый' : '🔗 Уже есть аккаунт';
                return (
                  <Pressable
                    key={m}
                    style={[s.pill, active && s.pillActive, { flex: 1 }]}
                    {...ripple('rgba(255,255,255,0.18)')}
                    onPress={() => { haptic('light'); setMode(m); }}
                  >
                    <Text style={[s.pillText, active && s.pillTextActive, { textAlign: 'center' }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {mode === 'existing' && (
              <Text style={[s.modalHintText, { marginBottom: 10 }]}>
                Если сотрудник уже работает у тебя в другой сети — просто введи
                его логин и добавим эту сеть в его аккаунт. Логин и пароль не меняются.
              </Text>
            )}

            {mode === 'existing' ? (
              <>
                <Text style={[s.menuSectionTitle, { paddingHorizontal: 0 }]}>Логин (username) сотрудника</Text>
                <View style={[s.fieldCard, { marginHorizontal: 0 }]}>
                  <View style={[s.fieldRow, s.fieldRowLast]}>
                    <View style={s.fieldText}>
                      <TextInput
                        style={s.fieldInput}
                        value={username} onChangeText={setUsername}
                        placeholder="olga.ivanova"
                        placeholderTextColor={C.ink4}
                        autoCapitalize="none"
                        autoCorrect={false}
                        maxLength={150}
                      />
                    </View>
                  </View>
                </View>
                <Text style={[s.modalHintText, { marginTop: 6 }]}>
                  Точный логин (как ему выдавался при первом приглашении).
                  Регистр важен.
                </Text>
              </>
            ) : (
              <>
                <Text style={[s.menuSectionTitle, { paddingHorizontal: 0 }]}>ФИО</Text>
                <View style={[s.fieldCard, { marginHorizontal: 0 }]}>
                  <View style={[s.fieldRow, s.fieldRowLast]}>
                    <View style={s.fieldText}>
                      <TextInput
                        style={s.fieldInput}
                        value={name} onChangeText={setName}
                        placeholder="Иванова Ольга Викторовна"
                        placeholderTextColor={C.ink4}
                        maxLength={64}
                      />
                    </View>
                  </View>
                </View>

                <Text style={[s.menuSectionTitle, { paddingHorizontal: 0, marginTop: 4 }]}>Email или телефон</Text>
                <View style={[s.fieldCard, { marginHorizontal: 0 }]}>
                  <View style={s.fieldRow}>
                    <View style={s.fieldText}>
                      <TextInput
                        style={s.fieldInput}
                        value={email} onChangeText={setEmail}
                        placeholder="email@example.ru"
                        placeholderTextColor={C.ink4}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  </View>
                  <View style={[s.fieldRow, s.fieldRowLast]}>
                    <View style={s.fieldText}>
                      <TextInput
                        style={s.fieldInput}
                        value={phone} onChangeText={(t) => setPhone(maskRuPhoneInput(t))}
                        placeholder="+7 (999) 123-45-67"
                        placeholderTextColor={C.ink4}
                        keyboardType="phone-pad"
                        maxLength={18}
                      />
                    </View>
                  </View>
                </View>
              </>
            )}

            <Text style={[s.menuSectionTitle, { paddingHorizontal: 0, marginTop: 4 }]}>Роль</Text>
            <View style={[s.pillsRow, { paddingHorizontal: 0 }]}>
              {roleOptions.map(r_ => {
                const active = role === r_;
                const label = r_ === 'manager' ? 'Управляющий' : 'Только просмотр';
                return (
                  <Pressable
                    key={r_}
                    style={[s.pill, active && s.pillActive]}
                    {...ripple('rgba(255,255,255,0.18)')}
                    onPress={() => { haptic('light'); setRole(r_); }}
                  >
                    <Text style={[s.pillText, active && s.pillTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[s.modalHintText, { marginTop: 6 }]}>
              {role === 'manager'
                ? 'Управляющий: видит и отвечает на отзывы, запускает рассылки, смотрит аналитику. Тонкие настройки прав можно поправить после приглашения.'
                : 'Только просмотр: видит отзывы и точки. Отвечать и менять данные не может.'}
            </Text>
          </ScrollView>

          <View style={s.modalFooter}>
            <Pressable style={[s.btn, s.btnSecondary]} {...ripple()} onPress={onClose}>
              <Text style={s.btnSecondaryText}>Отмена</Text>
            </Pressable>
            <Pressable
              style={[s.btn, s.btnPrimary, !valid && { opacity: 0.5 }]}
              {...ripple('rgba(255,255,255,0.22)')}
              onPress={submit}
              disabled={!valid || submitting}
            >
              {submitting
                ? <ActivityIndicator size="small" color={C.surface} />
                : <UserCheck size={14} color={C.surface} strokeWidth={2.2} />
              }
              <Text style={s.btnPrimaryText}>
                {submitting ? 'Отправляем…' : (mode === 'new' ? 'Пригласить' : 'Добавить в сеть')}
              </Text>
            </Pressable>
          </View>
    </SheetModal>
  );
};
