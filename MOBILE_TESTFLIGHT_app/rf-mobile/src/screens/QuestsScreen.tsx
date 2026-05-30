import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, FlatList, RefreshControl, Alert, TextInput,
  ActivityIndicator, ScrollView, Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, Target, X, Save, Trash2, CheckCircle2 } from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { fmtNum } from '../helpers';
import { fetchQuests, fetchBranches, saveQuest, deleteQuest } from '../api';
import { makeStyles } from '../styles';
import { SkeletonCard } from '../components/Skeleton';
import { Chip } from '../components/Common';
import { SheetModal } from '../components/SheetModal';
import type { Quest, RFBranch } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// QUESTS SCREEN — задания для гостей за баллы
// ════════════════════════════════════════════════════════════════════
export const QuestsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [quests, setQuests] = useState<Quest[]>([]);
  const [branches, setBranches] = useState<RFBranch[]>([]);
  const [branchId, setBranchId] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Quest | 'new' | null>(null);

  const load = async () => {
    try {
      const [q, br] = await Promise.all([fetchQuests(), fetchBranches()]);
      setQuests(q); setBranches(br);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);
  const onRefresh = () => { haptic('light'); setRefreshing(true); load(); };

  const filtered = useMemo(() =>
    branchId === 0 ? quests : quests.filter(q => q.branch_id === branchId),
    [quests, branchId]
  );

  const onSaved = (saved: Quest) => {
    setQuests(prev => {
      const idx = prev.findIndex(x => x.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [saved, ...prev];
    });
    setEditing(null);
  };
  const onDeleted = (id: number) => {
    setQuests(prev => prev.filter(x => x.id !== id));
    setEditing(null);
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={s.backHeader}>
        <Pressable style={s.backBtn} {...ripple()} onPress={onBack}>
          <ChevronLeft size={20} color={C.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={s.screenTitleBlock}>
          <Text style={s.screenTitleSuper}>Контент</Text>
          <Text style={s.screenTitleMain}>Квесты</Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(q) => String(q.id)}
        contentContainerStyle={{ paddingHorizontal: r.pad, paddingBottom: 130 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
        ListHeaderComponent={
          <View>
            {/* Branch filter */}
            <View style={[s.filterBlock, { paddingHorizontal: 0, marginHorizontal: -r.pad + 0 }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.chipsRow, { paddingHorizontal: r.pad }]}>
                <Chip active={branchId === 0} onPress={() => setBranchId(0)} s={s}>Все</Chip>
                {branches.filter(b => b.id !== 0).map(b => (
                  <Chip key={b.id} active={branchId === b.id} onPress={() => setBranchId(b.id)} s={s}>
                    {b.name}
                  </Chip>
                ))}
              </ScrollView>
            </View>
            {loading && <View style={{ gap: 10 }}><SkeletonCard /><SkeletonCard /></View>}
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={s.emptyState}>
              <Target size={36} color={C.ink4} strokeWidth={1.5} />
              <Text style={s.emptyStateTitle}>Квестов нет</Text>
              <Text style={s.emptyStateSub}>Заведите первое задание для гостей — сторис, отзыв в 2GIS, приглашение друга.</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const branchName = branches.find(b => b.id === item.branch_id)?.name;
          return (
            <Pressable
              style={[s.listCard, !item.is_active && { opacity: 0.55 }]}
              {...ripple()}
              onPress={() => { haptic('light'); setEditing(item); }}
            >
              <View style={[s.listIcon, { backgroundColor: item.is_active ? C.limeSoft : C.lineSoft }]}>
                <Target size={20} color={item.is_active ? C.limeDeep : C.ink4} strokeWidth={2.2} />
              </View>
              <View style={s.listBody}>
                <View style={s.listHeadRow}>
                  <Text style={s.listTitle} numberOfLines={1}>{item.name}</Text>
                  {!item.is_active && (
                    <View style={s.statusPill}><Text style={[s.statusPillText, { color: C.ink4 }]}>ВЫКЛ</Text></View>
                  )}
                </View>
                {!!item.description && (
                  <Text style={s.listSub} numberOfLines={2}>{item.description}</Text>
                )}
                <View style={s.listMetaRow}>
                  <Text style={s.catPrice}>+{fmtNum(item.reward)} ★</Text>
                  {branchName && (
                    <View style={s.listMetaPill}>
                      <Text style={s.listMetaText}>{branchName}</Text>
                    </View>
                  )}
                  {item.submits_count != null && item.submits_count > 0 && (
                    <View style={[s.listMetaPill, { backgroundColor: C.goodSoft, borderColor: '#A7F3C2' }]}>
                      <CheckCircle2 size={10} color={C.good} strokeWidth={2.4} />
                      <Text style={[s.listMetaText, { color: C.good }]}>{item.submits_count} вып.</Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      {!loading && (
        <Pressable style={s.fabAdd} {...ripple('rgba(255,255,255,0.22)')} onPress={() => { haptic('medium'); setEditing('new'); }}>
          <Plus size={16} color={C.surface} strokeWidth={2.4} />
          <Text style={s.fabAddText}>Квест</Text>
        </Pressable>
      )}

      <QuestFormModal
        quest={editing}
        branches={branches}
        defaultBranchId={branchId === 0 ? (branches.find(b => b.id !== 0)?.id ?? 1) : branchId}
        onClose={() => setEditing(null)}
        onSaved={onSaved} onDeleted={onDeleted}
        s={s}
      />
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
const QuestFormModal: React.FC<{
  quest: Quest | 'new' | null;
  branches: RFBranch[];
  defaultBranchId: number;
  onClose: () => void;
  onSaved: (q: Quest) => void;
  onDeleted: (id: number) => void;
  s: S;
}> = ({ quest, branches, defaultBranchId, onClose, onSaved, onDeleted, s }) => {
  const isOpen = quest !== null;
  const isNew = quest === 'new';
  const orig = isNew || !quest ? null : quest;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rewardStr, setRewardStr] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [bId, setBId] = useState(defaultBranchId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(orig?.name ?? '');
    setDescription(orig?.description ?? '');
    setRewardStr(orig ? String(orig.reward) : '');
    setIsActive(orig?.is_active ?? true);
    setBId(orig?.branch_id ?? defaultBranchId);
  }, [isOpen, orig?.id, defaultBranchId]);

  if (!isOpen) return null;

  const reward = parseInt(rewardStr.replace(/\D/g, ''), 10) || 0;
  const valid = name.trim().length >= 2 && reward > 0;

  const onSubmit = async () => {
    if (!valid) { Alert.alert('Заполните', 'Название (мин. 2 символа) и награда > 0 обязательны.'); return; }
    haptic('medium');
    setSaving(true);
    try {
      const saved = await saveQuest({
        id: orig?.id,
        branch_id: bId,
        name: name.trim(),
        description: description.trim(),
        reward,
        is_active: isActive,
        ordering: orig?.ordering ?? 0,
      });
      haptic('success');
      onSaved(saved);
    } catch (e: any) {
      haptic('error');
      Alert.alert('Ошибка', e?.message ?? '');
    } finally { setSaving(false); }
  };

  const onDelete = () => {
    if (!orig) return;
    haptic('warning');
    Alert.alert('Удалить квест?', `«${orig.name}» исчезнет. Уже выполненные не аннулируются.`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive', onPress: async () => {
          try { await deleteQuest(orig.id); haptic('success'); onDeleted(orig.id); }
          catch (e: any) { haptic('error'); Alert.alert('Ошибка', e?.message ?? ''); }
        },
      },
    ]);
  };

  return (
    <SheetModal visible={isOpen} onClose={onClose} maxHeightPct={0.92}>
          <View style={s.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.modalSuper}>{isNew ? 'Создать' : 'Редактировать'}</Text>
              <Text style={s.modalTitle}>{isNew ? 'Новый квест' : (orig?.name ?? 'Квест')}</Text>
            </View>
            <Pressable style={s.modalClose} {...ripple()} onPress={onClose}>
              <X size={16} color={C.ink} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 14, paddingBottom: 8 }}>
            <View style={s.formGroup}>
              <Text style={s.formLabel}>Название</Text>
              <View style={s.formInputWrap}>
                <TextInput
                  style={s.formInput}
                  value={name} onChangeText={setName}
                  placeholder="Опубликуй сторис"
                  placeholderTextColor={C.ink4} maxLength={120}
                />
              </View>
            </View>

            <View style={s.formGroup}>
              <Text style={s.formLabel}>Описание</Text>
              <View style={s.formInputWrap}>
                <TextInput
                  style={s.formInputMulti}
                  value={description} onChangeText={setDescription}
                  placeholder="Что нужно сделать гостю и как зачисляется награда"
                  placeholderTextColor={C.ink4} multiline maxLength={500}
                />
              </View>
            </View>

            <View style={s.formGroup}>
              <Text style={s.formLabel}>Награда (баллы)</Text>
              <View style={s.formInputWrap}>
                <TextInput
                  style={s.formInput}
                  value={rewardStr} onChangeText={(t) => setRewardStr(t.replace(/\D/g, '').slice(0, 5))}
                  placeholder="500"
                  placeholderTextColor={C.ink4} keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={s.formGroup}>
              <Text style={s.formLabel}>Точка</Text>
              <View style={[s.menuCard, { paddingHorizontal: 0 }]}>
                {branches.filter(b => b.id !== 0).map((b, i, arr) => (
                  <Pressable
                    key={b.id}
                    style={[s.branchPickRow, i === arr.length - 1 && s.branchPickRowLast]}
                    {...ripple()}
                    onPress={() => { haptic('light'); setBId(b.id); }}
                  >
                    <View style={[s.branchPickCheckbox, bId === b.id && s.branchPickCheckboxOn]}>
                      {bId === b.id && <Text style={{ color: C.surface, fontFamily: 'Manrope_800ExtraBold', fontSize: 13 }}>✓</Text>}
                    </View>
                    <Text style={s.branchPickName}>{b.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={s.formGroup}>
              <View style={s.formToggle}>
                <View style={s.formToggleText}>
                  <Text style={s.formToggleTitle}>Активен</Text>
                  <Text style={s.formToggleSub}>Неактивный квест не виден гостям</Text>
                </View>
                <Switch
                  value={isActive} onValueChange={setIsActive}
                  trackColor={{ false: C.line, true: C.purple }} thumbColor={C.surface}
                />
              </View>
            </View>
          </ScrollView>

          <View style={s.modalFooter}>
            {!isNew && (
              <Pressable style={[s.btn, s.btnDanger]} {...ripple()} onPress={onDelete} disabled={saving}>
                <Trash2 size={14} color={C.warn} strokeWidth={2.2} />
                <Text style={s.btnDangerText}>Удалить</Text>
              </Pressable>
            )}
            <Pressable
              style={[s.btn, s.btnPrimary, !valid && { opacity: 0.5 }]}
              {...ripple('rgba(255,255,255,0.22)')}
              onPress={onSubmit}
              disabled={!valid || saving}
            >
              {saving
                ? <ActivityIndicator size="small" color={C.surface} />
                : <Save size={14} color={C.surface} strokeWidth={2.2} />
              }
              <Text style={s.btnPrimaryText}>Сохранить</Text>
            </Pressable>
          </View>
    </SheetModal>
  );
};
