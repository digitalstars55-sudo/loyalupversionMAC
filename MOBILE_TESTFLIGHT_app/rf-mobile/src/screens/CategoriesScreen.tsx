import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, FlatList, RefreshControl, Alert, TextInput,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, FolderTree, X, Save, Trash2 } from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { fetchCategories, fetchBranches, saveCategory, deleteCategory } from '../api';
import { makeStyles } from '../styles';
import { Skeleton } from '../components/Skeleton';
import { Chip } from '../components/Common';
import { SheetModal } from '../components/SheetModal';
import type { ProductCategory, RFBranch } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// CATEGORIES SCREEN — список категорий + CRUD
// ════════════════════════════════════════════════════════════════════
export const CategoriesScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [branches, setBranches] = useState<RFBranch[]>([]);
  const [branchId, setBranchId] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<ProductCategory | 'new' | null>(null);

  const load = async () => {
    try {
      const [cat, br] = await Promise.all([fetchCategories(), fetchBranches()]);
      setCategories(cat); setBranches(br);
      if (br.length > 1 && !branches.length) setBranchId(br.find(b => b.id !== 0)?.id ?? 1);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  const onRefresh = () => { haptic('light'); setRefreshing(true); load(); };

  const filtered = useMemo(() =>
    categories.filter(c => c.branch_id === branchId).sort((a, b) => a.ordering - b.ordering),
    [categories, branchId]
  );

  const onSaved = (saved: ProductCategory) => {
    setCategories(prev => {
      const idx = prev.findIndex(x => x.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [...prev, saved];
    });
    setEditing(null);
  };
  const onDeleted = (id: number) => {
    setCategories(prev => prev.filter(x => x.id !== id));
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
          <Text style={s.screenTitleMain}>Категории</Text>
        </View>
      </View>

      {/* Branch selector */}
      <View style={s.filterBlock}>
        <Text style={s.filterLabel}>Точка</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
          {branches.filter(b => b.id !== 0).map(b => (
            <Chip key={b.id} active={branchId === b.id} onPress={() => { haptic('light'); setBranchId(b.id); }} s={s}>
              {b.name}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={{ paddingHorizontal: r.pad, paddingBottom: 130 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
        ListHeaderComponent={
          loading ? (
            <View style={{ gap: 10 }}>
              {[1, 2, 3].map(i => <Skeleton key={i} w="100%" h={56} radius={14} />)}
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={s.emptyState}>
              <FolderTree size={36} color={C.ink4} strokeWidth={1.5} />
              <Text style={s.emptyStateTitle}>Категорий нет</Text>
              <Text style={s.emptyStateSub}>Создайте первую категорию для этой точки — например «Напитки» или «Десерты».</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable style={s.listCard} {...ripple()} onPress={() => { haptic('light'); setEditing(item); }}>
            <View style={[s.listIcon, { backgroundColor: C.purpleSoft }]}>
              <FolderTree size={20} color={C.purpleDeep} strokeWidth={2.2} />
            </View>
            <View style={s.listBody}>
              <Text style={s.listTitle}>{item.name}</Text>
              <View style={s.listMetaRow}>
                <View style={s.listMetaPill}>
                  <Text style={s.listMetaText}>позиция {item.ordering}</Text>
                </View>
                {item.products_count != null && (
                  <View style={s.listMetaPill}>
                    <Text style={s.listMetaText}>{item.products_count} подарков</Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        )}
      />

      {/* FAB */}
      {!loading && (
        <Pressable
          style={s.fabAdd}
          {...ripple('rgba(255,255,255,0.22)')}
          onPress={() => { haptic('medium'); setEditing('new'); }}
        >
          <Plus size={16} color={C.surface} strokeWidth={2.4} />
          <Text style={s.fabAddText}>Категорию</Text>
        </Pressable>
      )}

      <CategoryFormModal
        category={editing}
        branchId={branchId}
        onClose={() => setEditing(null)}
        onSaved={onSaved}
        onDeleted={onDeleted}
        s={s}
      />
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
const CategoryFormModal: React.FC<{
  category: ProductCategory | 'new' | null;
  branchId: number;
  onClose: () => void;
  onSaved: (c: ProductCategory) => void;
  onDeleted: (id: number) => void;
  s: S;
}> = ({ category, branchId, onClose, onSaved, onDeleted, s }) => {
  const isOpen = category !== null;
  const isNew = category === 'new';
  const orig = isNew || !category ? null : category;

  const [name, setName] = useState('');
  const [orderingStr, setOrderingStr] = useState('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(orig?.name ?? '');
    setOrderingStr(String(orig?.ordering ?? 0));
  }, [isOpen, orig?.id]);

  if (!isOpen) return null;

  const valid = name.trim().length >= 2;

  const onSubmit = async () => {
    if (!valid) { Alert.alert('Заполните', 'Название минимум 2 символа.'); return; }
    haptic('medium');
    setSaving(true);
    try {
      const saved = await saveCategory({
        id: orig?.id,
        branch_id: orig?.branch_id ?? branchId,
        name: name.trim(),
        ordering: parseInt(orderingStr, 10) || 0,
      });
      haptic('success');
      onSaved(saved);
    } catch (e: any) {
      haptic('error');
      Alert.alert('Ошибка', e?.message ?? 'Не удалось сохранить');
    } finally { setSaving(false); }
  };

  const onDelete = () => {
    if (!orig) return;
    haptic('warning');
    Alert.alert('Удалить категорию?', `«${orig.name}» исчезнет. Подарки в ней останутся, но без категории.`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive', onPress: async () => {
          try { await deleteCategory(orig.id); haptic('success'); onDeleted(orig.id); }
          catch (e: any) { haptic('error'); Alert.alert('Ошибка', e?.message ?? ''); }
        },
      },
    ]);
  };

  return (
    <SheetModal visible={isOpen} onClose={onClose}>
          <View style={s.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.modalSuper}>{isNew ? 'Создать' : 'Редактировать'}</Text>
              <Text style={s.modalTitle}>{isNew ? 'Новая категория' : (orig?.name ?? 'Категория')}</Text>
            </View>
            <Pressable style={s.modalClose} {...ripple()} onPress={onClose}>
              <X size={16} color={C.ink} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={{ paddingTop: 14 }}>
            <View style={s.formGroup}>
              <Text style={s.formLabel}>Название</Text>
              <View style={s.formInputWrap}>
                <TextInput
                  style={s.formInput}
                  value={name} onChangeText={setName}
                  placeholder="Напитки"
                  placeholderTextColor={C.ink4} maxLength={64}
                  autoFocus
                />
              </View>
            </View>
            <View style={s.formGroup}>
              <Text style={s.formLabel}>Позиция в списке</Text>
              <View style={s.formInputWrap}>
                <TextInput
                  style={s.formInput}
                  value={orderingStr} onChangeText={(t) => setOrderingStr(t.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={C.ink4}
                />
              </View>
              <Text style={[s.modalHintText, { paddingHorizontal: 4, marginTop: 6, fontSize: 12 }]}>
                Категория с позицией 0 показывается первой в каталоге, с позицией 99 — последней. Между категориями ставьте шаг 10 (10, 20, 30…) — будет легко вставить новую между ними.
              </Text>
            </View>
          </View>

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
