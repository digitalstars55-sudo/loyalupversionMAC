import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, FlatList, RefreshControl, StyleSheet,
  Modal, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Keyboard, TouchableWithoutFeedback,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, Megaphone, CheckCircle2, AlertTriangle, Clock, TestTube2, Trophy,
  Plus, X, Sparkles, Send, Trash2, Edit2,
} from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { fmtNum, relativeTime } from '../helpers';
import { fetchCampaigns, generateBroadcastText, sendBroadcast, fetchBranches, deleteCampaign, fetchSegments, editCampaign } from '../api';
import type { RFSegment } from '../api';
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
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Создание рассылки ─────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createText, setCreateText] = useState('');
  const [createDraft, setCreateDraft] = useState('');
  const [createImageUri, setCreateImageUri] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [branches, setBranches] = useState<RFBranch[]>([]);
  const [segments, setSegments] = useState<RFSegment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(null);
  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>([]);   // пусто = все
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');

  const openCreate = () => {
    haptic('light');
    setCreateText('');
    setCreateDraft('');
    setCreateImageUri(null);
    setSelectedSegmentId(null);
    setSelectedBranchIds([]);
    setGenderFilter('all');
    setCreateOpen(true);
    fetchBranches().then(list => setBranches(list.filter(b => b.id !== 0))).catch(() => {});
    fetchSegments().then(setSegments).catch(() => {});
  };

  const onAiGenerate = async () => {
    haptic('light');
    setAiLoading(true);
    try {
      const t = await generateBroadcastText({ draft: createDraft.trim() || undefined, segment_id: selectedSegmentId ?? undefined });
      setCreateText(t);
      haptic('success');
    } catch (e: any) {
      haptic('error');
      Alert.alert('Ошибка', e?.message ?? 'Не удалось сгенерировать текст');
    } finally { setAiLoading(false); }
  };

  const onPickImage = async () => {
    haptic('light');
    let ImagePicker: any = null;
    try { ImagePicker = require('expo-image-picker'); } catch {}
    if (!ImagePicker) {
      Alert.alert('Недоступно', 'Выбор изображения доступен только в нативной сборке.');
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Доступ запрещён', 'Разрешите доступ к фото в настройках.'); return; }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? 'images',
        allowsEditing: false, quality: 0.85,
      });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset?.uri) return;
      setCreateImageUri(asset.uri);
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'Не удалось выбрать файл');
    }
  };

  const onSend = async () => {
    if (!createText.trim()) { Alert.alert('Текст пустой', 'Введите или сгенерируйте текст рассылки.'); return; }
    haptic('medium');
    setSending(true);
    try {
      const branchIds = selectedBranchIds.length > 0 ? selectedBranchIds : branches.map(b => b.id);
      const res = await sendBroadcast({
        message_text: createText.trim(),
        mode: 'restaurant',
        branch_ids: branchIds,
        image_uri: createImageUri,
        segment_id: selectedSegmentId ?? undefined,
        gender_filter: genderFilter !== 'all' ? genderFilter : undefined,
      });
      haptic('success');
      const seg = selectedSegmentId ? (segments.find(s => s.id === selectedSegmentId)?.name ?? '') : 'Все гости';
      Alert.alert('Рассылка запущена', `Сегмент: ${seg}\nОтправлено: ${res.total_sent} получателей.`);
      setCreateOpen(false);
      load();
    } catch (e: any) {
      haptic('error');
      Alert.alert('Ошибка', e?.message ?? 'Не удалось отправить рассылку');
    } finally { setSending(false); }
  };

  const load = async () => {
    setLoadError(null);
    try { setItems(await fetchCampaigns()); }
    catch (e: any) { setLoadError(e?.message ?? 'Не удалось загрузить рассылки'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = () => { haptic('light'); setRefreshing(true); load(); };

  const onDelete = (c: Campaign) => {
    haptic('medium');
    Alert.alert(
      'Удалить рассылку?',
      `«${c.segment_name}» · ${c.total_sent} получателей · ${relativeTime(c.sent_at)}\n\nЗапись будет удалена из истории без возможности восстановления.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить', style: 'destructive', onPress: async () => {
            try {
              await deleteCampaign(c.id);
              haptic('success');
              setItems(prev => prev.filter(x => x.id !== c.id));
            } catch (e: any) {
              haptic('error');
              Alert.alert('Ошибка', e?.message ?? 'Не удалось удалить рассылку');
            }
          },
        },
      ],
    );
  };

  // ── Редактирование рассылки (24ч окно) ──────────────────────────────
  const [editCampaignItem, setEditCampaignItem] = useState<Campaign | null>(null);
  const [editText, setEditText] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editTimeLeft, setEditTimeLeft] = useState('');

  const onEditOpen = (c: Campaign) => {
    const msElapsed = Date.now() - new Date(c.sent_at).getTime();
    const hoursElapsed = msElapsed / (1000 * 60 * 60);
    if (hoursElapsed >= 24) {
      haptic('warning');
      const h = Math.floor(hoursElapsed);
      Alert.alert(
        '⏱ Время редактирования истекло',
        `Изменять рассылку можно только в первые 24 часа после отправки.\nПрошло: ${h} ч. — сообщения у гостей остаются как есть.`,
      );
      return;
    }
    const hoursLeft = 24 - hoursElapsed;
    const hLeft = Math.floor(hoursLeft);
    const mLeft = Math.floor((hoursLeft - hLeft) * 60);
    haptic('light');
    setEditCampaignItem(c);
    setEditText(c.message_text);
    setEditTimeLeft(`Осталось ${hLeft} ч. ${mLeft} мин.`);
  };

  const onEditSave = async () => {
    if (!editCampaignItem || !editText.trim()) return;
    haptic('medium');
    setEditSaving(true);
    try {
      const result = await editCampaign(editCampaignItem.id, editText.trim());
      haptic('success');
      setItems(prev => prev.map(x => x.id === editCampaignItem.id ? { ...x, message_text: editText.trim() } : x));
      Alert.alert('Обновлено', `Изменено: ${result.updated} сообщений.${result.errors.length ? `\nОшибок: ${result.errors.length}` : ''}`);
      setEditCampaignItem(null);
    } catch (e: any) {
      haptic('error');
      Alert.alert('Ошибка', e?.message ?? 'Не удалось обновить');
    } finally { setEditSaving(false); }
  };

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
                  <Text style={s.tasksTitle}>Статистика рассылок</Text>
                  <Text style={s.tasksCount}>за всё время</Text>
                </View>
                <View style={{ flexDirection: 'row', paddingTop: 8, gap: 16 }}>
                  <View style={{ flex: 1, alignItems: 'center', paddingVertical: 8, backgroundColor: C.purpleSoft, borderRadius: 12 }}>
                    <Text style={[s.snapItemVal, { fontSize: 26 }]}>{fmtNum(totalDelivered)}</Text>
                    <Text style={[s.snapItemSub, { textAlign: 'center', marginTop: 2 }]}>получателей</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'center', paddingVertical: 8, backgroundColor: C.lineSoft, borderRadius: 12 }}>
                    <Text style={[s.snapItemVal, { fontSize: 26 }]}>{fmtNum(items.length)}</Text>
                    <Text style={[s.snapItemSub, { textAlign: 'center', marginTop: 2 }]}>{plural(items.length, ['запуск', 'запуска', 'запусков'])}</Text>
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
          loading ? null : loadError ? (
            <View style={s.emptyState}>
              <AlertTriangle size={36} color={C.warn} strokeWidth={1.5} />
              <Text style={s.emptyStateTitle}>Ошибка загрузки</Text>
              <Text style={s.emptyStateSub}>{loadError}</Text>
            </View>
          ) : (
            <View style={s.emptyState}>
              <Megaphone size={36} color={C.ink4} strokeWidth={1.5} />
              <Text style={s.emptyStateTitle}>Рассылок пока нет</Text>
              <Text style={s.emptyStateSub}>Нажмите «Новая рассылка» чтобы запустить первую. История появится здесь после отправки.</Text>
            </View>
          )
        }
        renderItem={({ item }) => <CampaignCard c={item} s={s} onDelete={() => onDelete(item)} onEdit={() => onEditOpen(item)} />}
      />

      {/* Модал редактирования рассылки (24ч окно) */}
      <Modal visible={!!editCampaignItem} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditCampaignItem(null)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.surface }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <View style={camp.modalHeader}>
              <Pressable {...ripple()} onPress={() => setEditCampaignItem(null)} style={camp.modalClose}>
                <X size={20} color={C.ink2} strokeWidth={2.2} />
              </Pressable>
              <Text style={camp.modalTitle}>Изменить рассылку</Text>
              <View style={{ width: 36 }} />
            </View>
            <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
              <Text style={camp.fieldLabel}>Текст рассылки</Text>
              <TextInput
                style={[camp.input, { flex: 1, textAlignVertical: 'top', minHeight: 120 }]}
                value={editText}
                onChangeText={setEditText}
                multiline
                editable={!editSaving}
              />
              <Text style={camp.charCount}>{editText.length} / 4096</Text>
              <View style={{ height: 8 }} />
              <View style={[camp.toolRow, { backgroundColor: C.warnSoft, borderRadius: 10, padding: 10, marginBottom: 8 }]}>
                <Text style={{ fontSize: 12, color: C.warn, fontFamily: 'Manrope_600SemiBold', flex: 1 }}>
                  ⏱ {editTimeLeft ? `${editTimeLeft} на изменение.` : ''} Изменения применяются только к сообщениям до 24 часов. Текст у получателей обновится автоматически.
                </Text>
              </View>
            </ScrollView>
            <View style={camp.sendRow}>
              <Pressable
                style={[camp.sendBtn, (editSaving || !editText.trim()) && { opacity: 0.45 }]}
                {...ripple('rgba(255,255,255,0.22)')}
                onPress={onEditSave}
                disabled={editSaving || !editText.trim()}
              >
                {editSaving ? <ActivityIndicator size="small" color={C.surface} /> : <Edit2 size={18} color={C.surface} strokeWidth={2.2} />}
                <Text style={camp.sendBtnText}>{editSaving ? 'Сохраняем...' : 'Обновить в VK'}</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* FAB — создать рассылку */}
      <Pressable style={camp.fab} {...ripple('rgba(255,255,255,0.22)', true)} onPress={openCreate}>
        <Plus size={22} color={C.surface} strokeWidth={2.5} />
        <Text style={camp.fabText}>Новая рассылка</Text>
      </Pressable>

      {/* Модал создания рассылки */}
      <Modal visible={createOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCreateOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.surface }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={camp.modalHeader}>
              <Pressable {...ripple()} onPress={() => setCreateOpen(false)} style={camp.modalClose}>
                <X size={20} color={C.ink2} strokeWidth={2.2} />
              </Pressable>
              <Text style={camp.modalTitle}>Новая рассылка</Text>
              <View style={{ width: 36 }} />
            </View>

            <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Сегмент аудитории */}
              <Text style={camp.fieldLabel}>Аудитория</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                <Pressable
                  style={[camp.segChip, selectedSegmentId === null && camp.segChipActive]}
                  {...ripple()} onPress={() => setSelectedSegmentId(null)}
                >
                  <Text style={[camp.segChipText, selectedSegmentId === null && camp.segChipTextActive]}>📣 Все гости</Text>
                </Pressable>
                {segments.map(seg => (
                  <Pressable
                    key={seg.id}
                    style={[camp.segChip, selectedSegmentId === seg.id && camp.segChipActive]}
                    {...ripple()} onPress={() => setSelectedSegmentId(seg.id)}
                  >
                    <Text style={[camp.segChipText, selectedSegmentId === seg.id && camp.segChipTextActive]}>
                      {seg.emoji} {seg.name} {seg.count > 0 ? `(${seg.count})` : ''}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Пол */}
              <Text style={camp.fieldLabel}>Пол</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                {([['all', 'Все'], ['m', 'Мужчины'], ['f', 'Женщины']] as const).map(([val, label]) => (
                  <Pressable
                    key={val}
                    style={[camp.segChip, genderFilter === val && camp.segChipActive]}
                    {...ripple()} onPress={() => setGenderFilter(val)}
                  >
                    <Text style={[camp.segChipText, genderFilter === val && camp.segChipTextActive]}>{label}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Подсказка для AI */}
              <Text style={camp.fieldLabel}>Подсказка для AI (необязательно)</Text>
              <TextInput
                style={[camp.input, { marginBottom: 10 }]}
                value={createDraft}
                onChangeText={setCreateDraft}
                placeholder="Например: скидка 20% в выходные..."
                placeholderTextColor={C.ink4}
                multiline
                numberOfLines={2}
                editable={!aiLoading && !sending}
              />

              {/* Кнопки инструментов */}
              <View style={camp.toolRow}>
                <Pressable
                  style={[camp.toolBtn, { flex: 1 }, (aiLoading || sending) && { opacity: 0.5 }]}
                  {...ripple('rgba(255,255,255,0.22)')}
                  onPress={onAiGenerate}
                  disabled={aiLoading || sending}
                >
                  {aiLoading
                    ? <ActivityIndicator size="small" color={C.surface} />
                    : <Sparkles size={15} color={C.surface} strokeWidth={2.2} />
                  }
                  <Text style={camp.toolBtnText}>{aiLoading ? 'Генерирую...' : 'AI-текст'}</Text>
                </Pressable>

                <Pressable
                  style={[camp.toolBtn, { backgroundColor: createImageUri ? C.good : C.paper, borderWidth: 1, borderColor: createImageUri ? C.good : C.line }, sending && { opacity: 0.5 }]}
                  {...ripple()}
                  onPress={createImageUri ? () => setCreateImageUri(null) : onPickImage}
                  disabled={sending}
                >
                  <Text style={{ fontSize: 16 }}>{createImageUri ? '✓' : '🖼'}</Text>
                  <Text style={[camp.toolBtnText, { color: createImageUri ? C.good : C.ink2 }]}>
                    {createImageUri ? 'Картинка добавлена' : 'Добавить фото'}
                  </Text>
                </Pressable>
              </View>

              {/* Текст рассылки */}
              <Text style={[camp.fieldLabel, { marginTop: 14 }]}>Текст рассылки</Text>
              <TextInput
                style={[camp.input, { flex: 1, textAlignVertical: 'top', marginBottom: 4 }]}
                value={createText}
                onChangeText={setCreateText}
                placeholder="Введите текст или используйте AI выше..."
                placeholderTextColor={C.ink4}
                multiline
                editable={!sending}
              />
              <Text style={camp.charCount}>{createText.length} / 4096</Text>
            </ScrollView>

            {/* Кнопка отправки */}
            <View style={camp.sendRow}>
              <Pressable
                style={[camp.sendBtn, (sending || !createText.trim()) && { opacity: 0.45 }]}
                {...ripple('rgba(255,255,255,0.22)')}
                onPress={onSend}
                disabled={sending || !createText.trim()}
              >
                {sending
                  ? <ActivityIndicator size="small" color={C.surface} />
                  : <Send size={18} color={C.surface} strokeWidth={2.2} />
                }
                <Text style={camp.sendBtnText}>{sending ? 'Отправляем...' : 'Отправить всем гостям'}</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
const CampaignCard: React.FC<{ c: Campaign; s: S; onDelete: () => void; onEdit: () => void }> = ({ c, s, onDelete, onEdit }) => {
  const reach = c.total_target > 0 ? Math.round((c.total_sent / c.total_target) * 100) : 0;
  const isAb = !!c.variants && c.variants.length === 2;
  const canDelete = c.status !== 'sending';
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
      <View style={{ flexDirection: 'column', gap: 2 }}>
        {c.status === 'sent' && (
          <Pressable style={{ padding: 8 }} {...ripple()} onPress={onEdit} hitSlop={8}>
            <Edit2 size={15} color={C.ink3} strokeWidth={2} />
          </Pressable>
        )}
        {canDelete && (
          <Pressable style={{ padding: 8 }} {...ripple()} onPress={onDelete} hitSlop={8}>
            <Trash2 size={15} color={C.ink4} strokeWidth={2} />
          </Pressable>
        )}
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
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
    marginBottom: 16,
  },
  modalTitle: {
    flex: 1,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 17,
    color: C.ink,
    textAlign: 'center',
  },
  modalClose: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: C.paper,
  },
  fieldLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
    color: C.ink3,
    marginBottom: 6,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    color: C.ink,
    minHeight: 48,
  },
  toolRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: C.purpleDeep,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  toolBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: C.surface,
  },
  charCount: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: C.ink4,
    textAlign: 'right',
  },
  sendRow: {
    padding: 16,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.purple,
    borderRadius: 16,
    paddingVertical: 16,
  },
  sendBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    color: C.surface,
    letterSpacing: 0.2,
  },
  segChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paper,
  },
  segChipActive: {
    backgroundColor: C.purpleSoft,
    borderColor: C.purpleLine,
  },
  segChipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: C.ink2,
  },
  segChipTextActive: {
    color: C.purpleDeep,
  },
});
