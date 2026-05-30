import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, FlatList, RefreshControl, Image, Alert, TextInput,
  ScrollView, Switch, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, Plus, Gift, Cake, Crown, X, Save, Trash2, Edit3,
} from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { fmtNum } from '../helpers';
import { fetchProducts, fetchBranches, fetchCategories, saveProduct, deleteProduct } from '../api';
import { makeStyles } from '../styles';
import { SkeletonCard } from '../components/Skeleton';
import { ImagePickerField } from '../components/ImagePickerField';
import { SheetModal } from '../components/SheetModal';
import type { Product, ProductBranchAssignment, RFBranch, ProductCategory } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// CATALOG SCREEN — список подарков + create/edit с фото и привязкой к точкам
// ════════════════════════════════════════════════════════════════════
export const CatalogScreen: React.FC<{
  onBack: () => void;
  onOpenCategories: () => void;
}> = ({ onBack, onOpenCategories }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<RFBranch[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);

  const load = async () => {
    try {
      const [pr, br, cat] = await Promise.all([fetchProducts(), fetchBranches(), fetchCategories()]);
      setProducts(pr); setBranches(br); setCategories(cat);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);
  const onRefresh = () => { haptic('light'); setRefreshing(true); load(); };

  const onSaved = (saved: Product) => {
    setProducts(prev => {
      const idx = prev.findIndex(x => x.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [saved, ...prev];
    });
    setEditing(null);
  };

  const onDeleted = (id: number) => {
    setProducts(prev => prev.filter(x => x.id !== id));
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
          <Text style={s.screenTitleMain}>Подарки</Text>
        </View>
        <Pressable
          style={[s.backBtn, { backgroundColor: C.purpleSoft, borderColor: C.purpleLine }]}
          {...ripple()}
          onPress={onOpenCategories}
          accessibilityLabel="Категории"
        >
          <Text style={{ fontFamily: 'Manrope_800ExtraBold', fontSize: 11, color: C.purpleDeep }}>Кат.</Text>
        </Pressable>
      </View>

      <FlatList
        data={products}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ paddingBottom: 130, gap: 8 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
        ListHeaderComponent={
          loading ? (
            <View style={{ gap: 10, paddingHorizontal: r.pad }}>
              <SkeletonCard /><SkeletonCard /><SkeletonCard />
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={s.emptyState}>
              <Gift size={36} color={C.ink4} strokeWidth={1.5} />
              <Text style={s.emptyStateTitle}>Подарков пока нет</Text>
              <Text style={s.emptyStateSub}>Заведите первый подарок — он появится в каталоге приложения для гостей.</Text>
              <Pressable
                style={[s.btn, s.btnPrimary, { paddingHorizontal: 18, marginTop: 6 }]}
                {...ripple('rgba(255,255,255,0.22)')}
                onPress={() => { haptic('medium'); setEditing('new'); }}
              >
                <Plus size={14} color={C.surface} strokeWidth={2.4} />
                <Text style={s.btnPrimaryText}>Создать подарок</Text>
              </Pressable>
            </View>
          )
        }
        renderItem={({ item }) => (
          <ProductCard
            p={item} branches={branches}
            onPress={() => { haptic('light'); setEditing(item); }}
            s={s}
          />
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
          <Text style={s.fabAddText}>Подарок</Text>
        </Pressable>
      )}

      <ProductFormModal
        product={editing}
        branches={branches}
        categories={categories}
        onClose={() => setEditing(null)}
        onSaved={onSaved}
        onDeleted={onDeleted}
        s={s}
      />
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
const ProductCard: React.FC<{
  p: Product; branches: RFBranch[]; onPress: () => void; s: S;
}> = ({ p, branches, onPress, s }) => {
  const activeBranchNames = p.assignments
    .filter(a => a.is_active)
    .map(a => branches.find(b => b.id === a.branch_id)?.name)
    .filter(Boolean) as string[];

  return (
    <Pressable style={s.catCard} {...ripple()} onPress={onPress}>
      {p.image_url
        ? <Image source={{ uri: p.image_url }} style={s.catImg} resizeMode="cover" />
        : (
          <View style={s.catImgPlaceholder}>
            <Gift size={26} color={C.purpleDeep} strokeWidth={2} />
          </View>
        )
      }
      <View style={s.catBody}>
        <Text style={s.catName} numberOfLines={2}>{p.name}</Text>
        <View style={s.catMeta}>
          <Text style={s.catPrice}>{p.price === 0 ? 'Бесплатно' : `${fmtNum(p.price)} ★`}</Text>
          {p.is_super_prize && (
            <View style={s.catFlag}>
              <Crown size={10} color={C.ink} strokeWidth={2.4} />
              <Text style={s.catFlagText}>СУПЕРПРИЗ</Text>
            </View>
          )}
          {p.is_birthday_prize && (
            <View style={[s.catFlag, { backgroundColor: C.purpleSoft }]}>
              <Cake size={10} color={C.purpleDeep} strokeWidth={2.4} />
              <Text style={[s.catFlagText, { color: C.purpleDeep }]}>ДР</Text>
            </View>
          )}
        </View>
        <Text style={s.catBranches} numberOfLines={1}>
          {activeBranchNames.length === 0
            ? 'Нет активных точек'
            : activeBranchNames.length === branches.filter(b => b.id !== 0).length
              ? 'На всех точках'
              : `${activeBranchNames.length} ${plural(activeBranchNames.length, ['точка', 'точки', 'точек'])} · ${activeBranchNames.slice(0, 2).join(', ')}${activeBranchNames.length > 2 ? '…' : ''}`
          }
        </Text>
      </View>
    </Pressable>
  );
};

// ════════════════════════════════════════════════════════════════════
// FORM MODAL — создать/редактировать подарок
// ════════════════════════════════════════════════════════════════════
const ProductFormModal: React.FC<{
  product: Product | 'new' | null;
  branches: RFBranch[];
  categories: ProductCategory[];
  onClose: () => void;
  onSaved: (p: Product) => void;
  onDeleted: (id: number) => void;
  s: S;
}> = ({ product, branches, categories, onClose, onSaved, onDeleted, s }) => {
  const isOpen = product !== null;
  const isNew = product === 'new';
  const orig = isNew || !product ? null : product;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSuper, setIsSuper] = useState(false);
  const [isBirthday, setIsBirthday] = useState(false);
  const [assignments, setAssignments] = useState<ProductBranchAssignment[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (isNew) {
      setName(''); setDescription(''); setPriceStr(''); setImageUri(null);
      setIsSuper(false); setIsBirthday(false); setAssignments([]);
    } else if (orig) {
      setName(orig.name); setDescription(orig.description);
      setPriceStr(String(orig.price));
      setImageUri(orig.image_url ?? null);
      setIsSuper(orig.is_super_prize); setIsBirthday(orig.is_birthday_prize);
      setAssignments(orig.assignments);
    }
  }, [isOpen, isNew, orig?.id]);

  if (!isOpen) return null;

  const price = parseInt(priceStr.replace(/\D/g, ''), 10) || 0;
  const valid = name.trim().length >= 2 && (price >= 0);

  const toggleBranch = (branchId: number) => () => {
    haptic('light');
    setAssignments(prev => {
      const found = prev.find(a => a.branch_id === branchId);
      if (found) return prev.filter(a => a.branch_id !== branchId);
      return [...prev, { branch_id: branchId, category_id: null, ordering: 0, is_active: true }];
    });
  };

  const onSubmit = async () => {
    if (!valid) {
      Alert.alert('Заполните поля', 'Название (мин. 2 символа) и цена обязательны.');
      return;
    }
    haptic('medium');
    setSaving(true);
    try {
      const isLocal = imageUri && (imageUri.startsWith('data:') || imageUri.startsWith('file:') || imageUri.startsWith('content:'));
      const saved = await saveProduct({
        id: orig?.id,
        name: name.trim(), description: description.trim(),
        price,
        image_local_uri: isLocal ? imageUri : null,
        image_url: !isLocal ? imageUri : null,
        is_super_prize: isSuper, is_birthday_prize: isBirthday,
        assignments,
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
    Alert.alert(
      'Удалить подарок?',
      `«${orig.name}» исчезнет из каталога приложения. Действие необратимо.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить', style: 'destructive', onPress: async () => {
            try {
              await deleteProduct(orig.id);
              haptic('success');
              onDeleted(orig.id);
            } catch (e: any) {
              haptic('error');
              Alert.alert('Ошибка', e?.message ?? 'Не удалось удалить');
            }
          },
        },
      ],
    );
  };

  return (
    <SheetModal visible={isOpen} onClose={onClose} maxHeightPct={0.92}>
          <View style={s.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.modalSuper}>{isNew ? 'Создать' : 'Редактировать'}</Text>
              <Text style={s.modalTitle}>{isNew ? 'Новый подарок' : (orig?.name ?? 'Подарок')}</Text>
            </View>
            <Pressable style={s.modalClose} {...ripple()} onPress={onClose}>
              <X size={16} color={C.ink} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 14, paddingBottom: 8 }}>
            {/* Image */}
            <ImagePickerField
              s={s} uri={imageUri}
              onChange={setImageUri}
              aspect={[1, 1]}
              hint="Квадратное фото — лучше всего"
            />

            {/* Name */}
            <View style={s.formGroup}>
              <Text style={s.formLabel}>Название</Text>
              <View style={s.formInputWrap}>
                <TextInput
                  style={s.formInput}
                  value={name} onChangeText={setName}
                  placeholder="Капучино в подарок"
                  placeholderTextColor={C.ink4}
                  maxLength={120}
                />
              </View>
            </View>

            {/* Description */}
            <View style={s.formGroup}>
              <Text style={s.formLabel}>Описание</Text>
              <View style={s.formInputWrap}>
                <TextInput
                  style={s.formInputMulti}
                  value={description} onChangeText={setDescription}
                  placeholder="Краткое описание для гостя — что входит, размер, ограничения"
                  placeholderTextColor={C.ink4}
                  multiline
                  maxLength={500}
                />
              </View>
            </View>

            {/* Price */}
            <View style={s.formGroup}>
              <Text style={s.formLabel}>Цена в баллах</Text>
              <View style={s.formInputWrap}>
                <TextInput
                  style={s.formInput}
                  value={priceStr} onChangeText={(t) => setPriceStr(t.replace(/[^\d]/g, '').slice(0, 6))}
                  placeholder="0 — бесплатно"
                  placeholderTextColor={C.ink4}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Flags */}
            <View style={[s.formGroup, { gap: 0 }]}>
              <Text style={s.formLabel}>Особые флаги</Text>
              <View style={s.formToggle}>
                <View style={s.formToggleText}>
                  <Text style={s.formToggleTitle}>👑 Суперприз</Text>
                  <Text style={s.formToggleSub}>Может выпасть в розыгрыше при достижении цели</Text>
                </View>
                <Switch
                  value={isSuper} onValueChange={setIsSuper}
                  trackColor={{ false: C.line, true: C.purple }} thumbColor={C.surface}
                />
              </View>
              <View style={s.formToggle}>
                <View style={s.formToggleText}>
                  <Text style={s.formToggleTitle}>🎂 Подарок ко ДР</Text>
                  <Text style={s.formToggleSub}>Доступен гостю в день рождения и неделю до</Text>
                </View>
                <Switch
                  value={isBirthday} onValueChange={setIsBirthday}
                  trackColor={{ false: C.line, true: C.purple }} thumbColor={C.surface}
                />
              </View>
            </View>

            {/* Branches */}
            <View style={s.formGroup}>
              <Text style={s.formLabel}>Доступен в точках</Text>
              <View style={s.menuCard}>
                {branches.filter(b => b.id !== 0).map((b, i, arr) => {
                  const isOn = !!assignments.find(a => a.branch_id === b.id);
                  return (
                    <Pressable
                      key={b.id}
                      style={[s.branchPickRow, i === arr.length - 1 && s.branchPickRowLast]}
                      {...ripple()}
                      onPress={toggleBranch(b.id)}
                    >
                      <View style={[s.branchPickCheckbox, isOn && s.branchPickCheckboxOn]}>
                        {isOn && <Text style={{ color: C.surface, fontFamily: 'Manrope_800ExtraBold', fontSize: 13 }}>✓</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.branchPickName} numberOfLines={1}>{b.name}</Text>
                        {b.address && <Text style={s.branchPickSub} numberOfLines={1}>{b.address}</Text>}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <View style={s.modalFooter}>
            {!isNew && (
              <Pressable
                style={[s.btn, s.btnDanger]}
                {...ripple()}
                onPress={onDelete}
                disabled={saving}
              >
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
              <Text style={s.btnPrimaryText}>{saving ? 'Сохраняем…' : 'Сохранить'}</Text>
            </Pressable>
          </View>
    </SheetModal>
  );
};

function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}
