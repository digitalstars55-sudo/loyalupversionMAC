import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, FlatList, RefreshControl, StyleSheet,
  Modal, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, Megaphone, CheckCircle2, AlertTriangle, Clock, TestTube2, Trophy,
  Plus, X, Sparkles, Send,
} from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { fmtNum, relativeTime } from '../helpers';
import { fetchCampaigns, generateBroadcastText, sendBroadcast, fetchBranches } from '../api';
import { makeStyles } from '../styles';
import { SkeletonCard } from '../components/Skeleton';
import type { Campaign, CampaignStatus, CampaignVariant, GenderFilter, RFBranch } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// CAMPAIGNS SCREEN — история рассылок
// ════════════════════════════════════════════════════════════════════
type Filter = 'all' | 'sent' | 'failed';

export const CampaignsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  // ── Создание рассылки ─────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createText, setCreateText] = useState('');
  const [createDraft, setCreateDraft] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [branches, setBranches] = useState<RFBranch[]>([]);

  const openCreate = () => {
    haptic('light');
    setCreateText('');
    setCreateDraft('');
    setCreateOpen(true);
    fetchBranches().then(list => setBranches(list.filter(b => b.id !== 0))).catch(() => {});
  };

  const onAiGenerate = async () => {
    haptic('light');
    setAiLoading(true);
    try {
      const t = await generateBroadcastText({ draft: createDraft.trim() || undefined });
      setCreateText(t);
      haptic('success');
    } catch (e: any) {
      haptic('error');
      Alert.alert('Ошибка', e?.message ?? 'Не удалось сгенерировать текст');
    } finally { setAiLoading(false); }
  };

  const onSend = async () => {
    if (!createText.trim()) { Alert.alert('Текст пустой', 'Введите или сгенерируйте текст рассылки.'); return; }
    haptic('medium');
    setSending(true);
    try {
      const branchIds = branches.map(b => b.id);
      const res = await sendBroadcast({ message_text: createText.trim(), mode: 'restaurant', branch_ids: branchIds });
      haptic('success');
      Alert.alert('Рассылка запущена', `Отправлено: ${res.total_sent} получателей.`);
      setCreateOpen(false);
      load();
    } catch (e: any) {
      haptic('error');
      Alert.alert('Ошибка', e?.message ?? 'Не удалось отправить рассылку');
    } finally { setSending(false); }
  };

  const load = async () => {
    try { setItems(await fetchCampaigns()); }
    catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = () => { haptic('light'); setRefreshing(true); load(); };

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter(c => c.status === filter);
  }, [items, filter]);

  const counts = useMemo(() => ({
    all: items.length,
    sent: items.filter(c => c.status === 'sent').length,
    failed: items.filter(c => c.status === 'failed').length,
  }), [items]);

  const totalDelivered = useMemo(
    () => items.reduce((sum, c) => sum + c.total_sent, 0),
    [items]
  );

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={s.backHeader}>
        <Pressable style={s.backBtn} {...ripple()} onPress={onBack}>
          <ChevronLeft size={20} color={C.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={s.screenTitleBlock}>
          <Text style={s.screenTitleSuper}>Маркетинг</Text>
          <Text style={s.screenTitleMain}>Рассылки</Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={{ paddingHorizontal: r.pad, paddingBottom: 130 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
        ListHeaderComponent={
          <View>
            {/* Summary */}
            {!loading && items.length > 0 && (
              <View style={[s.tasksCard, { marginHorizontal: 0, marginBottom: 14 }]}>
                <View style={s.tasksHeadRow}>
                  <Text style={s.tasksTitle}>Всего отправлено</Text>
                  <Text style={s.tasksCount}>за всё время</Text>
                </View>
                <View style={[s.taskRow, { borderTopWidth: 0, paddingTop: 4 }]}>
                  <View style={[s.taskIconWrap, { backgroundColor: C.purpleSoft }]}>
                    <Megaphone size={18} color={C.purpleDeep} strokeWidth={2.2} />
                  </View>
                  <View style={s.taskTextWrap}>
                    <Text style={[s.snapItemVal, { fontSize: 28 }]}>{fmtNum(totalDelivered)}</Text>
                    <Text style={s.taskSub}>{items.length} {plural(items.length, ['рассылка', 'рассылки', 'рассылок'])}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Filter chips */}
            <View style={[s.rvFilters, { marginHorizontal: -r.pad }]}>
              <View style={[s.rvFiltersRow, { paddingHorizontal: r.pad }]}>
                {([
                  { key: 'all',    label: 'Все',       count: counts.all },
                  { key: 'sent',   label: 'Доставлены', count: counts.sent },
                  { key: 'failed', label: 'Ошибки',    count: counts.failed },
                ] as const).map(fc => {
                  const active = filter === fc.key;
                  return (
                    <Pressable
                      key={fc.key}
                      style={[s.filterChip, active && s.filterChipActive]}
                      {...ripple()}
                      onPress={() => { haptic('light'); setFilter(fc.key); }}
                    >
                      <Text style={[s.filterChipText, active && s.filterChipTextActive]}>{fc.label}</Text>
                      <View style={[s.filterChipBadge, active && s.filterChipBadgeActive]}>
                        <Text style={[s.filterChipBadgeText, active && s.filterChipBadgeTextActive]}>{fc.count}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {loading && (
              <View style={{ gap: 10 }}>
                <SkeletonCard /><SkeletonCard /><SkeletonCard />
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={s.emptyState}>
              <Megaphone size={36} color={C.ink4} strokeWidth={1.5} />
              <Text style={s.emptyStateTitle}>Рассылок пока нет</Text>
              <Text style={s.emptyStateSub}>Запустите первую рассылку из аналитики — выберите сегмент и нажмите «Рассылка».</Text>
            </View>
          )
        }
        renderItem={({ item }) => <CampaignCard c={item} s={s} />}
      />

      {/* FAB — создать рассылку */}
      <Pressable style={camp.fab} {...ripple('rgba(255,255,255,0.22)', true)} onPress={openCreate}>
        <Plus size={22} color={C.surface} strokeWidth={2.5} />
        <Text style={camp.fabText}>Новая рассылка</Text>
      </Pressable>

      {/* Модал создания рассылки */}
      <Modal visible={createOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCreateOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }} edges={['top']}>
            {/* Header */}
            <View style={camp.modalHeader}>
              <Text style={camp.modalTitle}>Новая рассылка</Text>
              <Pressable {...ripple()} onPress={() => setCreateOpen(false)} style={camp.modalClose}>
                <X size={20} color={C.ink2} strokeWidth={2.2} />
              </Pressable>
            </View>

            <View style={{ flex: 1, padding: 16, gap: 14 }}>
              {/* Подсказка для AI */}
              <View>
                <Text style={camp.fieldLabel}>Подсказка для AI (необязательно)</Text>
                <TextInput
                  style={camp.input}
                  value={createDraft}
                  onChangeText={setCreateDraft}
                  placeholder="Например: скидка 20% в выходные..."
                  placeholderTextColor={C.ink4}
                  multiline
                  numberOfLines={2}
                  editable={!aiLoading && !sending}
                />
              </View>

              {/* Кнопка AI генерации */}
              <Pressable
                style={[camp.aiBtn, (aiLoading || sending) && { opacity: 0.5 }]}
                {...ripple('rgba(255,255,255,0.22)')}
                onPress={onAiGenerate}
                disabled={aiLoading || sending}
              >
                {aiLoading
                  ? <ActivityIndicator size="small" color={C.surface} />
                  : <Sparkles size={15} color={C.surface} strokeWidth={2.2} />
                }
                <Text style={camp.aiBtnText}>{aiLoading ? 'Генерирую...' : 'Сгенерировать текст AI'}</Text>
              </Pressable>

              {/* Текст рассылки */}
              <View style={{ flex: 1 }}>
                <Text style={camp.fieldLabel}>Текст рассылки</Text>
                <TextInput
                  style={[camp.input, { flex: 1, textAlignVertical: 'top' }]}
                  value={createText}
                  onChangeText={setCreateText}
                  placeholder="Введите текст или используйте AI выше..."
                  placeholderTextColor={C.ink4}
                  multiline
                  editable={!sending}
                />
                <Text style={camp.charCount}>{createText.length} / 4096</Text>
              </View>
            </View>

            {/* Кнопка отправки */}
            <View style={{ padding: 16 }}>
              <Pressable
                style={[s.btn, s.btnPrimary, (sending || !createText.trim()) && { opacity: 0.5 }]}
                {...ripple('rgba(255,255,255,0.22)')}
                onPress={onSend}
                disabled={sending || !createText.trim()}
              >
                {sending
                  ? <ActivityIndicator size="small" color={C.surface} />
                  : <Send size={15} color={C.surface} strokeWidth={2.2} />
                }
                <Text style={s.btnPrimaryText}>{sending ? 'Отправляем...' : 'Отправить всем гостям'}</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
const CampaignCard: React.FC<{ c: Campaign; s: S }> = ({ c, s }) => {
  const reach = c.total_target > 0 ? Math.round((c.total_sent / c.total_target) * 100) : 0;
  const isAb = !!c.variants && c.variants.length === 2;
  return (
    <View style={s.listCard}>
      <View style={[s.listIcon, { backgroundColor: isAb ? '#EEF2FF' : C.purpleSoft }]}>
        {isAb
          ? <TestTube2 size={18} color="#4338CA" strokeWidth={2.2} />
          : <Text style={s.listIconEmoji}>{c.segment_emoji}</Text>
        }
      </View>
      <View style={s.listBody}>
        <View style={s.listHeadRow}>
          <Text style={s.listTitle} numberOfLines={1} ellipsizeMode="tail">{c.segment_name}</Text>
          <Text style={s.listTime}>{relativeTime(c.sent_at)}</Text>
        </View>
        {isAb
          ? <AbVariantsRow variants={c.variants!} />
          : <Text style={s.listSub} numberOfLines={2}>{c.message_text}</Text>
        }
        <View style={s.listMetaRow}>
          <StatusPill status={c.status} s={s} />
          {c.gender_filter && c.gender_filter !== 'all' && <GenderPill g={c.gender_filter} />}
          <View style={s.listMetaPill}>
            <Text style={s.listMetaText}>{fmtNum(c.total_sent)} / {fmtNum(c.total_target)}</Text>
          </View>
          {c.status === 'sent' && !isAb && (
            <View style={s.listMetaPill}>
              <Text style={s.listMetaText}>охват {reach}%</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────
// A/B варианты — превью обоих текстов + результаты
// ─────────────────────────────────────────────
const AbVariantsRow: React.FC<{ variants: CampaignVariant[] }> = ({ variants }) => {
  const [a, b] = variants;
  const winnerLabel: 'A' | 'B' | null =
    a.response_rate != null && b.response_rate != null
      ? (a.response_rate > b.response_rate ? 'A' : a.response_rate < b.response_rate ? 'B' : null)
      : null;

  return (
    <View style={ab.row}>
      <AbBox v={a} tone="indigo" winner={winnerLabel === 'A'} />
      <AbBox v={b} tone="pink" winner={winnerLabel === 'B'} />
    </View>
  );
};

const AbBox: React.FC<{ v: CampaignVariant; tone: 'indigo' | 'pink'; winner: boolean }> = ({ v, tone, winner }) => {
  const colors = tone === 'indigo'
    ? { bg: '#EEF2FF', ink: '#4338CA' }
    : { bg: '#FCE7F3', ink: '#BE185D' };
  return (
    <View style={[ab.box, winner && ab.boxWinner]}>
      <View style={ab.boxHead}>
        <View style={[ab.badge, { backgroundColor: colors.bg }]}>
          <Text style={[ab.badgeText, { color: colors.ink }]}>{v.label} · {v.percent}%</Text>
        </View>
        {winner && (
          <View style={ab.winnerPill}>
            <Trophy size={9} color={C.good} strokeWidth={2.5} />
            <Text style={ab.winnerText}>победитель</Text>
          </View>
        )}
      </View>
      <Text style={ab.boxText} numberOfLines={2}>{v.text}</Text>
      <View style={ab.boxStats}>
        <Text style={ab.boxStatNum}>{fmtNum(v.sent_count)}</Text>
        <Text style={ab.boxStatLbl}>отправлено</Text>
        {v.response_rate != null && (
          <>
            <View style={ab.boxStatSep} />
            <Text style={[ab.boxStatNum, { color: tone === 'indigo' ? '#4338CA' : '#BE185D' }]}>{v.response_rate.toFixed(1)}%</Text>
            <Text style={ab.boxStatLbl}>отклик</Text>
          </>
        )}
      </View>
    </View>
  );
};

const GenderPill: React.FC<{ g: GenderFilter }> = ({ g }) => (
  <View style={[ab.genderPill, { backgroundColor: g === 'female' ? '#FCE7F3' : '#DBEAFE' }]}>
    <Text style={[ab.genderText, { color: g === 'female' ? '#BE185D' : '#1E40AF' }]}>
      {g === 'female' ? '♀ женщины' : '♂ мужчины'}
    </Text>
  </View>
);

const StatusPill: React.FC<{ status: CampaignStatus; s: S }> = ({ status, s }) => {
  if (status === 'sent') return (
    <View style={[s.statusPill, s.statusPillSent]}>
      <CheckCircle2 size={11} color={C.good} strokeWidth={2.4} />
      <Text style={[s.statusPillText, { color: C.good }]}>ДОСТАВЛЕНО</Text>
    </View>
  );
  if (status === 'failed') return (
    <View style={[s.statusPill, s.statusPillFailed]}>
      <AlertTriangle size={11} color={C.warn} strokeWidth={2.4} />
      <Text style={[s.statusPillText, { color: C.warn }]}>ОШИБКА</Text>
    </View>
  );
  if (status === 'scheduled') return (
    <View style={[s.statusPill, s.statusPillSched]}>
      <Clock size={11} color={C.purpleDeep} strokeWidth={2.4} />
      <Text style={[s.statusPillText, { color: C.purpleDeep }]}>ЗАПЛАНИРОВАНО</Text>
    </View>
  );
  return (
    <View style={[s.statusPill, s.statusPillSched]}>
      <Clock size={11} color={C.purpleDeep} strokeWidth={2.4} />
      <Text style={[s.statusPillText, { color: C.purpleDeep }]}>ИДЁТ</Text>
    </View>
  );
};

function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

// ─────────────────────────────────────────────
// A/B стили
// ─────────────────────────────────────────────
const ab = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 6,
  },
  box: {
    flex: 1,
    minWidth: 0,
    borderRadius: 10,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line,
    padding: 8,
    gap: 4,
  },
  boxWinner: {
    borderColor: C.good,
    backgroundColor: '#F0FDF4',
  },
  boxHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.3,
  },
  winnerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
    marginLeft: 'auto',
  },
  winnerText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 0.3,
    color: C.good,
  },
  boxText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: C.ink2,
    lineHeight: 14,
  },
  boxStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  boxStatNum: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: C.ink,
  },
  boxStatLbl: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
    color: C.ink3,
  },
  boxStatSep: {
    width: 1,
    height: 10,
    backgroundColor: C.line,
    marginHorizontal: 4,
  },
  genderPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  genderText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.3,
  },
});

const camp = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: C.purple,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 13,
    gap: 8,
    shadowColor: C.purple,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: C.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  modalTitle: {
    flex: 1,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 17,
    color: C.ink,
  },
  modalClose: {
    padding: 6,
  },
  fieldLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: C.ink3,
    marginBottom: 6,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    color: C.ink,
    minHeight: 48,
  },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.purpleDeep,
    borderRadius: 12,
    paddingVertical: 13,
  },
  aiBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: C.surface,
  },
  charCount: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: C.ink4,
    textAlign: 'right',
    marginTop: 4,
  },
});
