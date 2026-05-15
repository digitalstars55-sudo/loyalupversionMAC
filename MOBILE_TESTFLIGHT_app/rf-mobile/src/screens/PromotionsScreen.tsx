import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, FlatList, RefreshControl, Alert, TextInput, Modal,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, Megaphone, X, Save, Trash2 } from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { fetchPromotions, fetchBranches, savePromotion, deletePromotion } from '../api';
import { makeStyles } from '../styles';
import { SkeletonCard } from '../components/Skeleton';
import { ImagePickerField } from '../components/ImagePickerField';
import type { Promotion, RFBranch } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// PROMOTIONS SCREEN — акции/баннеры в приложении гостя
// ════════════════════════════════════════════════════════════════════
export const PromotionsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [promos, setPromos] = useState<Promotion[]>([]);
  const [branches, setBranches] = useState<RFBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Promotion | 'new' | null>(null);

  const load = async () => {
    try {
      const [p, br] = await Promise.all([fetchPromotions(), fetchBranches()]);
      setPromos(p); setBranches(br);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);
  const onRefresh = () => { haptic('light'); setRefreshing(true); load(); };

  const onSaved = (saved: Promotion) => {
    setPromos(prev => {
      const idx = prev.findIndex(x => x.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [saved, ...prev];
    });
    setEditing(null);
  };
  const onDeleted = (id: number) => {
    setPromos(prev => prev.filter(x => x.id !== id));
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
          <Text style={s.screenTitleMain}>Акции</Text>
        </View>
      </View>

      <FlatList
        data={promos}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ paddingHorizontal: r.pad, paddingBottom: 130 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
        ListHeaderComponent={loading ? (<View style={{ gap: 10 }}><SkeletonCard /><SkeletonCard /></View>) : null}
        ListEmptyComponent={
          loading ? null : (
            <View style={s.emptyState}>
              <Megaphone size={36} color={C.ink4} strokeWidth={1.5} />
              <Text style={s.emptyStateTitle}>Акций нет</Text>
              <Text style={s.emptyStateSub}>Создайте первый баннер — он появится в приложении гостя на главной.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={[s.listCard, { padding: 0, overflow: 'hidden', flexDirection: 'column', alignItems: 'stretch' }]}
            {...ripple()}
            onPress={() => { haptic('light'); setEditing(item); }}
          >
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={{ width: '100%', aspectRatio: 2, backgroundColor: C.lineSoft }} resizeMode="cover" />
            ) : (
              <View style={{ width: '100%', aspectRatio: 2, backgroundColor: C.purpleSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Megaphone size={40} color={C.purpleDeep} strokeWidth={1.8} />
              </View>
            )}
            <View style={{ padding: 14 }}>
              <Text style={s.listTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={s.listSub} numberOfLines={2}>{item.discount}</Text>
              <View style={s.listMetaRow}>
                <View style={s.listMetaPill}>
                  <Text style={s.listMetaText}>{item.dates}</Text>
                </View>
                {item.branch_name && (
                  <View style={[s.listMetaPill, { backgroundColor: C.purpleSoft, borderColor: C.purpleLine }]}>
                    <Text style={[s.listMetaText, { color: C.purpleDeep }]}>{item.branch_name}</Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        )}
      />

      {!loading && (
        <Pressable style={s.fabAdd} {...ripple('rgba(255,255,255,0.22)')} onPress={() => { haptic('medium'); setEditing('new'); }}>
          <Plus size={16} color={C.surface} strokeWidth={2.4} />
          <Text style={s.fabAddText}>Акцию</Text>
        </Pressable>
      )}

      <PromoFormModal
        promo={editing}
        branches={branches}
        defaultBranchId={branches.find(b => b.id !== 0)?.id ?? 1}
        onClose={() => setEditing(null)}
        onSaved={onSaved} onDeleted={onDeleted}
        s={s}
      />
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
const PromoFormModal: React.FC<{
  promo: Promotion | 'new' | null;
  branches: RFBranch[];
  defaultBranchId: number;
  onClose: () => void;
  onSaved: (p: Promotion) => void;
  onDeleted: (id: number) => void;
  s: S;
}> = ({ promo, branches, defaultBranchId, onClose, onSaved, onDeleted, s }) => {
  const isOpen = promo !== null;
  const isNew = promo === 'new';
  const orig = isNew || !promo ? null : promo;

  const [title, setTitle] = useState('');
  const [discount, setDiscount] = useState('');
  const [dates, setDates] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [bId, setBId] = useState(defaultBranchId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(orig?.title ?? '');
    setDiscount(orig?.discount ?? '');
    setDates(orig?.dates ?? '');
    setImageUri(orig?.image_url ?? null);
    setBId(orig?.branch_id ?? defaultBranchId);
  }, [isOpen, orig?.id, defaultBranchId]);

  if (!isOpen) return null;

  const valid = title.trim().length >= 2 && discount.trim().length >= 5 && dates.trim().length >= 2;

  const onSubmit = async () => {
    if (!valid) {
      Alert.alert('Заполните', 'Название, описание (≥5 симв.) и период обязательны.');
      return;
    }
    haptic('medium');
    setSaving(true);
    try {
      const isLocal = imageUri && (imageUri.startsWith('data:') || imageUri.startsWith('file:') || imageUri.startsWith('content:'));
      const saved = await savePromotion({
        id: orig?.id,
        branch_id: bId,
        title: title.trim(), discount: discount.trim(), dates: dates.trim(),
        image_local_uri: isLocal ? imageUri : null,
        image_url: !isLocal ? imageUri : null,
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
    Alert.alert('Удалить акцию?', `«${orig.title}» исчезнет с главной у гостей.`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive', onPress: async () => {
          try { await deletePromotion(orig.id); haptic('success'); onDeleted(orig.id); }
          catch (e: any) { haptic('error'); Alert.alert('Ошибка', e?.message ?? ''); }
        },
      },
    ]);
  };

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalRoot}>
        <Pressable style={s.modalBackdrop} onPress={onClose} />
        <View style={[s.modalSheet, { maxHeight: '92%' }]}>
          <View style={s.modalHandle} />
          <View style={s.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.modalSuper}>{isNew ? 'Создать' : 'Редактировать'}</Text>
              <Text style={s.modalTitle}>{isNew ? 'Новая акция' : (orig?.title ?? 'Акция')}</Text>
            </View>
            <Pressable style={s.modalClose} {...ripple()} onPress={onClose}>
              <X size={16} color={C.ink} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingTop: 14, paddingBottom: 8 }}>
            <ImagePickerField
              s={s} uri={imageUri}
              onChange={setImageUri}
              aspect={[2, 1]}
              hint="Баннер 2:1 — горизонтальный"
            />

            <View style={s.formGroup}>
              <Text style={s.formLabel}>Заголовок</Text>
              <View style={s.formInputWrap}>
                <TextInput
                  style={s.formInput}
                  value={title} onChangeText={setTitle}
                  placeholder="Завтрак за 199 ₽"
                  placeholderTextColor={C.ink4} maxLength={100}
                />
              </View>
            </View>

            <View style={s.formGroup}>
              <Text style={s.formLabel}>Условия акции</Text>
              <View style={s.formInputWrap}>
                <TextInput
                  style={s.formInputMulti}
                  value={discount} onChangeText={setDiscount}
                  placeholder="Например: −20% на весь чек до 19:00"
                  placeholderTextColor={C.ink4} multiline maxLength={500}
                />
              </View>
            </View>

            <View style={s.formGroup}>
              <Text style={s.formLabel}>Период действия</Text>
              <View style={s.formInputWrap}>
                <TextInput
                  style={s.formInput}
                  value={dates} onChangeText={setDates}
                  placeholder="01.06 – 30.06"
                  placeholderTextColor={C.ink4} maxLength={64}
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
