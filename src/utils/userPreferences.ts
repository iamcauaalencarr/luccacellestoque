import { DEFAULT_USER_PREFERENCES, type UserPreferences } from '../types';

const STORAGE_PREFIX = 'luccacell_user_prefs_';

export function loadUserPreferences(uid?: string | null): UserPreferences {
  if (!uid || typeof window === 'undefined') {
    return { ...DEFAULT_USER_PREFERENCES };
  }
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${uid}`);
    if (!raw) return { ...DEFAULT_USER_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      defaultTab: parsed.defaultTab === 'relatorios' ? 'relatorios' : 'estoque',
      defaultInventorySort:
        parsed.defaultInventorySort === 'menor_preco' ||
        parsed.defaultInventorySort === 'maior_preco' ||
        parsed.defaultInventorySort === 'modelo'
          ? parsed.defaultInventorySort
          : 'recentes',
      defaultConditionFilter:
        parsed.defaultConditionFilter === 'lacrado' || parsed.defaultConditionFilter === 'seminovo'
          ? parsed.defaultConditionFilter
          : 'todos',
      showInstallmentPreview:
        typeof parsed.showInstallmentPreview === 'boolean'
          ? parsed.showInstallmentPreview
          : DEFAULT_USER_PREFERENCES.showInstallmentPreview,
      showImeiOnCards:
        typeof parsed.showImeiOnCards === 'boolean'
          ? parsed.showImeiOnCards
          : DEFAULT_USER_PREFERENCES.showImeiOnCards,
      autoOpenWarrantyAfterSale:
        typeof parsed.autoOpenWarrantyAfterSale === 'boolean'
          ? parsed.autoOpenWarrantyAfterSale
          : DEFAULT_USER_PREFERENCES.autoOpenWarrantyAfterSale,
    };
  } catch {
    return { ...DEFAULT_USER_PREFERENCES };
  }
}

export function saveUserPreferences(uid: string, prefs: UserPreferences): void {
  if (!uid || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${uid}`, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota issues
  }
}
