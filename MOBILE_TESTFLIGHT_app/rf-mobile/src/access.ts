// ════════════════════════════════════════════════════════════════════
// Тонкое разграничение по разделам — паритет с веб тенант-админкой.
// Источник истины — бэкенд User.feature_access (apps/shared/users).
// Профиль приходит с полем feature_access: string[] (ProfileSerializer).
//
// Логика 1-в-1 как на вебе (user_allowed_features):
//   • суперадмин            → видит всё;
//   • feature_access пуст/нет → БЕЗ ограничений (показываем всё, как owner'у);
//   • непустой список        → видны ТОЛЬКО перечисленные разделы.
// ════════════════════════════════════════════════════════════════════

/** Ключи разделов — совпадают с FEATURE_CHOICES на бэке (apps/shared/users/models.py). */
export type FeatureKey =
  | 'home' | 'analytics' | 'reviews' | 'chat' | 'broadcasts' | 'guests'
  | 'general_stats' | 'contact_points' | 'reports' | 'catalog' | 'quests'
  | 'promotions' | 'daily_codes' | 'birthdays' | 'staff' | 'auto_reply'
  | 'cross_overview' | 'audit_log';

export function canFeature(
  featureAccess: string[] | null | undefined,
  key: FeatureKey,
  isSuperadmin?: boolean,
): boolean {
  if (isSuperadmin) return true;
  if (!featureAccess || featureAccess.length === 0) return true; // нет ограничений
  return featureAccess.includes(key);
}

/** True, если у пользователя реально стоит разграничение (непустой feature_access). */
export function hasFeatureRestriction(featureAccess: string[] | null | undefined): boolean {
  return Array.isArray(featureAccess) && featureAccess.length > 0;
}
