import React, { useEffect, useState } from 'react';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import {
  AtSign,
  Check,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  MessageSquare,
  Printer,
  RotateCcw,
  Save,
  ShieldCheck,
  Sliders,
  Smartphone,
  Store,
  User,
} from 'lucide-react';
import {
  DEFAULT_INSTALLMENT_RATES,
  DEFAULT_STORE_SETTINGS,
  DEFAULT_USER_PREFERENCES,
  INFINITEPAY_PRESETS,
  type DeviceCondition,
  type InfinitePayTierPreset,
  type InstallmentCountKey,
  type SinglePaymentMethod,
  SCHEMA_LIMITS,
  type StaffDirectoryMember,
  type StoreSettings,
  type UserPreferences,
} from '../types';
import { useAuth } from '../contexts/AuthContext';
import { saveStoreSettings, updateOwnProfile } from '../services/storeService';
import {
  calculateInstallment,
  formatBRL,
  formatStorage,
  formatTimestamp,
  formatTitleName,
  PAYMENT_LABELS,
} from '../utils/formatters';
import { LABEL_STYLES, NIIMBOT_PRESETS } from '../utils/niimbotLabelCanvas';
import { encodeCode128B } from '../utils/barcode';

interface SettingsViewProps {
  settings: StoreSettings;
  staff: StaffDirectoryMember[];
  preferences: UserPreferences;
  onUpdatePreferences: (next: UserPreferences) => void;
  onNotify: (type: 'success' | 'error' | 'info', text: string) => void;
}

type SettingsSubTab = 'conta' | 'loja';

const PAYMENT_OPTIONS: SinglePaymentMethod[] = ['pix', 'credito', 'debito', 'dinheiro'];
const INSTALLMENT_KEYS: InstallmentCountKey[] = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
];

function sanitizeUsernameInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, SCHEMA_LIMITS.USERNAME_MAX);
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-0">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block text-sm font-medium text-white cursor-pointer">
          {label}
        </label>
        <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50 ${
          checked
            ? 'bg-[#D4AF37] border-[#D4AF37]'
            : 'bg-[#09090B] border-[#2E2E38]'
        }`}
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full transition-transform ${
            checked ? 'translate-x-7 bg-black' : 'translate-x-1 bg-zinc-400'
          }`}
        />
      </button>
    </div>
  );
}

export function SettingsView({
  settings,
  staff,
  preferences,
  onUpdatePreferences,
  onNotify,
}: SettingsViewProps) {
  const { firebaseUser, profile, isGoogleUser, signOut } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [subTab, setSubTab] = useState<SettingsSubTab>('conta');

  // Store settings draft (admin)
  const [draft, setDraft] = useState<StoreSettings>(settings);
  const [saving, setSaving] = useState(false);

  // Own profile edit state (both seller and admin)
  const [profileDisplayName, setProfileDisplayName] = useState(profile?.displayName || '');
  const [profileUsername, setProfileUsername] = useState(profile?.username || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Copy Pix feedback
  const [copiedPix, setCopiedPix] = useState(false);

  // Password change state (for username/password accounts)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  useEffect(() => {
    if (!profile) return;
    setProfileDisplayName(profile.displayName);
    setProfileUsername(profile.username);
  }, [profile]);

  if (!profile) return null;

  const previewPreset =
    NIIMBOT_PRESETS.find((p) => p.id === draft.defaultLabelPresetId) || NIIMBOT_PRESETS[0];
  const previewPrefix =
    draft.labelPrefix.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'LC';
  const previewCode = `${previewPrefix}-A1B2C3`;
  const previewBarcode = encodeCode128B(previewCode);
  const previewHeading = (draft.storeName || 'Lucca Cell').trim().toUpperCase() || 'LUCCA CELL';
  const previewBars: { x: number; w: number }[] = [];
  let previewX = 0;
  for (const mod of previewBarcode.modules) {
    if (mod.isBar) previewBars.push({ x: previewX, w: mod.width });
    previewX += mod.width;
  }

  const isPasswordProvider = Boolean(
    firebaseUser?.providerData.some((p) => p.providerId === 'password')
  );

  const hasRatesChange = INSTALLMENT_KEYS.some(
    (k) =>
      Number(draft.installmentRates?.[k] ?? DEFAULT_INSTALLMENT_RATES[k]) !==
      Number(settings.installmentRates?.[k] ?? DEFAULT_INSTALLMENT_RATES[k])
  );

  const hasUnsavedChanges =
    draft.storeName !== settings.storeName ||
    draft.storeTagline !== settings.storeTagline ||
    draft.storePhone !== settings.storePhone ||
    (draft.storeDocument || '') !== (settings.storeDocument || '') ||
    (draft.storeAddress || '') !== (settings.storeAddress || '') ||
    (draft.storePixKey || '') !== (settings.storePixKey || '') ||
    draft.defaultCondition !== settings.defaultCondition ||
    draft.defaultStorageGb !== settings.defaultStorageGb ||
    draft.defaultPaymentMethod !== settings.defaultPaymentMethod ||
    draft.allowSellerPriceEdit !== settings.allowSellerPriceEdit ||
    draft.requireCustomerOnSale !== settings.requireCustomerOnSale ||
    Boolean(draft.requireCustomerPhoneOnSale) !== Boolean(settings.requireCustomerPhoneOnSale) ||
    (draft.allowSellerTradeIn !== false) !== (settings.allowSellerTradeIn !== false) ||
    (draft.allowSellerReserve !== false) !== (settings.allowSellerReserve !== false) ||
    draft.lowBatteryWarningThreshold !== settings.lowBatteryWarningThreshold ||
    draft.lowStockThreshold !== settings.lowStockThreshold ||
    draft.warrantyDaysLacrado !== settings.warrantyDaysLacrado ||
    draft.warrantyDaysSeminovo !== settings.warrantyDaysSeminovo ||
    (draft.warrantyTerms || '') !== (settings.warrantyTerms || '') ||
    (draft.whatsappListFooter || '') !== (settings.whatsappListFooter || '') ||
    Number(draft.debitFeePercent ?? 0) !== Number(settings.debitFeePercent ?? 0) ||
    draft.passCardFeeToCustomer !== settings.passCardFeeToCustomer ||
    (draft.cardFeeCalculationMode || 'infinitepay_repasse') !==
      (settings.cardFeeCalculationMode || 'infinitepay_repasse') ||
    hasRatesChange ||
    draft.defaultLabelPresetId !== settings.defaultLabelPresetId ||
    draft.defaultLabelStyleId !== settings.defaultLabelStyleId ||
    draft.labelShowStore !== settings.labelShowStore ||
    draft.labelShowPrice !== settings.labelShowPrice ||
    draft.labelShowBarcode !== settings.labelShowBarcode ||
    draft.labelPrefix !== settings.labelPrefix;

  const cleanDraftUsername = sanitizeUsernameInput(profileUsername);
  const usernameTaken =
    isGoogleUser &&
    cleanDraftUsername.length >= SCHEMA_LIMITS.USERNAME_MIN &&
    staff.some(
      (m) => m.uid !== profile.uid && m.username.toLowerCase() === cleanDraftUsername.toLowerCase()
    );
  const hasProfileChanges =
    formatTitleName(profileDisplayName) !== formatTitleName(profile.displayName) ||
    (isGoogleUser && cleanDraftUsername !== profile.username.toLowerCase());

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileDisplayName.trim().length < SCHEMA_LIMITS.DISPLAY_NAME_MIN) {
      onNotify('error', 'Informe um nome de exibição com pelo menos 2 caracteres.');
      return;
    }
    if (isGoogleUser) {
      if (
        cleanDraftUsername.length < SCHEMA_LIMITS.USERNAME_MIN ||
        !SCHEMA_LIMITS.USERNAME_PATTERN.test(cleanDraftUsername)
      ) {
        onNotify('error', 'O @usuário precisa ter pelo menos 3 caracteres válidos.');
        return;
      }
      if (usernameTaken) {
        onNotify('error', `O usuário @${cleanDraftUsername} já está em uso.`);
        return;
      }
    }

    setSavingProfile(true);
    try {
      const updated = await updateOwnProfile(
        profile.uid,
        {
          displayName: profileDisplayName,
          ...(isGoogleUser ? { username: cleanDraftUsername, usernameConfirmed: true } : {}),
        },
        staff
      );
      onNotify(
        'success',
        `Perfil atualizado: ${updated.displayName}${updated.username ? ` (@${updated.username})` : ''}.`
      );
    } catch (err) {
      onNotify(
        'error',
        err instanceof Error ? err.message : 'Não foi possível atualizar seu perfil.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (draft.storeName.trim().length < SCHEMA_LIMITS.STORE_NAME_MIN) {
      onNotify('error', 'Informe o nome da loja (mínimo 2 caracteres).');
      return;
    }

    setSaving(true);
    try {
      await saveStoreSettings(draft, {
        uid: profile.uid,
        displayName: profile.displayName,
        role: profile.role,
      });
      onNotify('success', 'Configurações da loja salvas e aplicadas em tempo real.');
    } catch {
      onNotify('error', 'Não foi possível salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (!isAdmin) return;
    setDraft((prev) => ({
      ...DEFAULT_STORE_SETTINGS,
      updatedBy: prev.updatedBy,
      updatedAt: prev.updatedAt,
    }));
    onNotify('info', 'Valores padrão carregados. Toque em Salvar Configurações para confirmar.');
  };

  const handleZeroRates = () => {
    if (!isAdmin) return;
    const zeroed = {} as typeof DEFAULT_INSTALLMENT_RATES;
    for (const k of INSTALLMENT_KEYS) zeroed[k] = 0;
    setDraft((prev) => ({
      ...prev,
      debitFeePercent: 0,
      installmentRates: zeroed,
    }));
    onNotify('info', 'Taxas zeradas no rascunho. Salve para aplicar.');
  };

  const handleRestoreRates = () => {
    if (!isAdmin) return;
    setDraft((prev) => ({
      ...prev,
      debitFeePercent: DEFAULT_STORE_SETTINGS.debitFeePercent,
      cardFeeCalculationMode: 'infinitepay_repasse',
      installmentRates: { ...DEFAULT_INSTALLMENT_RATES },
    }));
    onNotify('info', 'Tabela InfinitePay padrão restaurada no rascunho.');
  };

  const handleApplyInfinitePayPreset = (preset: InfinitePayTierPreset) => {
    if (!isAdmin) return;
    setDraft((prev) => ({
      ...prev,
      debitFeePercent: preset.debitFeePercent,
      cardFeeCalculationMode: 'infinitepay_repasse',
      installmentRates: { ...preset.installmentRates },
    }));
    onNotify(
      'info',
      `Taxas ${preset.label} carregadas no rascunho. Toque em Salvar Configurações para aplicar.`
    );
  };

  const handleCopyPixKey = async () => {
    if (!settings.storePixKey?.trim()) return;
    try {
      await navigator.clipboard.writeText(settings.storePixKey.trim());
      setCopiedPix(true);
      onNotify('success', 'Chave Pix da loja copiada!');
      setTimeout(() => setCopiedPix(false), 2000);
    } catch {
      onNotify('error', 'Não foi possível copiar a Chave Pix.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !firebaseUser.email) return;
    if (!currentPassword || newPassword.length < 6) {
      onNotify('error', 'Informe a senha atual e uma nova senha com no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      onNotify('error', 'A confirmação da nova senha não confere.');
      return;
    }

    setChangingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onNotify('success', 'Sua senha foi atualizada com sucesso.');
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        onNotify('error', 'Senha atual incorreta.');
      } else if (code === 'auth/weak-password') {
        onNotify('error', 'A nova senha é muito fraca. Use ao menos 6 caracteres.');
      } else {
        onNotify('error', 'Não foi possível alterar a senha agora.');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-white">
            Configurações
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            {isAdmin
              ? 'Sua conta, preferências do dispositivo e parâmetros completos da loja'
              : 'Personalize seu perfil, preferências de trabalho e consulte regras da loja'}
          </p>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          {settings.updatedAt && (
            <span className="text-xs text-zinc-500 font-mono-tabular whitespace-nowrap">
              Loja atualizada: {formatTimestamp(settings.updatedAt)}
            </span>
          )}
          <button
            type="button"
            onClick={() => signOut()}
            className="min-h-[44px] px-3.5 rounded-xl bg-[#1A1A20] hover:bg-[#24242C] border border-[#26262E] text-white font-semibold text-xs inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <LogOut className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span>Sair da Conta</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-[#121216] border border-[#26262E] rounded-xl sm:max-w-md">
        <button
          type="button"
          onClick={() => setSubTab('conta')}
          className={`min-h-[42px] px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
            subTab === 'conta'
              ? 'bg-[#D4AF37] text-black'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5 shrink-0" />
          <span>Conta e Preferências</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('loja')}
          className={`min-h-[42px] px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
            subTab === 'loja'
              ? 'bg-[#D4AF37] text-black'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Store className="w-3.5 h-3.5 shrink-0" />
          <span>{isAdmin ? 'Configurações da Loja' : 'Regras da Loja'}</span>
        </button>
      </div>

      {/* TAB 1: MINHA CONTA & PREFERÊNCIAS (FOR BOTH SELLER & ADMIN) */}
      {subTab === 'conta' && (
        <div className="space-y-4 sm:space-y-5">
          {/* 1A. Perfil e @usuário */}
          <form
            onSubmit={handleSaveProfile}
            className="bg-[#121216] border border-[#26262E] rounded-2xl p-4 sm:p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-[#1A1A20] border border-[#2E2E38] flex items-center justify-center text-[#D4AF37] shrink-0">
                  {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <h2 className="font-display font-semibold text-base text-white truncate">
                    Meu Perfil Operacional
                  </h2>
                  <p className="text-xs text-zinc-400 truncate">
                    {isAdmin ? 'Administrador' : 'Vendedor'} ·{' '}
                    {isGoogleUser ? 'Conectado via Google' : 'Login por Usuário e Senha'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-400 whitespace-nowrap">
                Acesso Ativo
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label htmlFor="my-display-name" className="block text-xs font-medium text-zinc-400">
                  Nome de Exibição (recibos, reservas e garantias)
                </label>
                <input
                  id="my-display-name"
                  type="text"
                  autoCapitalize="words"
                  maxLength={SCHEMA_LIMITS.DISPLAY_NAME_MAX}
                  value={profileDisplayName}
                  onChange={(e) => setProfileDisplayName(e.target.value)}
                  onBlur={() => setProfileDisplayName((prev) => formatTitleName(prev))}
                  placeholder="Seu nome"
                  className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="my-username" className="block text-xs font-medium text-zinc-400">
                    Nome de Usuário (@usuário)
                  </label>
                  {!isGoogleUser && (
                    <span className="text-[11px] text-zinc-500">Vinculado ao login</span>
                  )}
                </div>
                <div className="relative">
                  <AtSign className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="my-username"
                    type="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    disabled={!isGoogleUser}
                    maxLength={SCHEMA_LIMITS.USERNAME_MAX}
                    value={profileUsername}
                    onChange={(e) => setProfileUsername(sanitizeUsernameInput(e.target.value))}
                    className="w-full min-h-[46px] pl-10 pr-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular text-base sm:text-sm focus:outline-none focus:border-[#D4AF37] disabled:opacity-65"
                    required
                  />
                </div>
                {usernameTaken && (
                  <p className="text-[11px] text-red-400">
                    Este @usuário já está em uso por outro integrante.
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-[#202028] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <p className="text-xs text-zinc-400 truncate">
                E-mail da conta: <span className="text-zinc-200 font-mono-tabular">{profile.email}</span>
              </p>
              <button
                type="submit"
                disabled={savingProfile || !hasProfileChanges || usernameTaken}
                className="min-h-[44px] px-4 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] disabled:opacity-50 text-black font-semibold text-xs inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <Save className="w-4 h-4 shrink-0" />
                <span>{savingProfile ? 'Salvando...' : 'Salvar Meu Perfil'}</span>
              </button>
            </div>
          </form>

          {/* 1B. Preferências Pessoais neste Dispositivo */}
          <section className="bg-[#121216] border border-[#26262E] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <Smartphone className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <div>
                  <h2 className="font-display font-semibold text-base text-white">
                    Preferências Pessoais (Neste Dispositivo)
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Ajusta sua experiência diária sem interferir nos outros usuários da equipe
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onUpdatePreferences({ ...DEFAULT_USER_PREFERENCES });
                  onNotify('info', 'Preferências pessoais restauradas para o padrão.');
                }}
                className="min-h-[38px] px-3 rounded-xl bg-[#1A1A20] hover:bg-[#24242C] text-xs font-medium text-zinc-300 inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Padrão Pessoal</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-7">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="block text-xs font-medium text-zinc-400">
                    Tela inicial ao abrir o aplicativo
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#09090B] border border-[#26262E] rounded-xl">
                    {(
                      [
                        { id: 'estoque', label: 'Estoque' },
                        { id: 'relatorios', label: 'Relatórios' },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onUpdatePreferences({ ...preferences, defaultTab: item.id });
                          onNotify('success', `Tela inicial definida para ${item.label}.`);
                        }}
                        className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
                          preferences.defaultTab === item.id
                            ? 'bg-white text-black'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-xs font-medium text-zinc-400">
                    Filtro padrão de condição no estoque
                  </span>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-[#09090B] border border-[#26262E] rounded-xl">
                    {(
                      [
                        { id: 'todos', label: 'Todos' },
                        { id: 'lacrado', label: 'Lacrados' },
                        { id: 'seminovo', label: 'Seminovos' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          onUpdatePreferences({
                            ...preferences,
                            defaultConditionFilter: opt.id,
                          })
                        }
                        className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
                          preferences.defaultConditionFilter === opt.id
                            ? 'bg-[#D4AF37] text-black'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="pref-sort" className="block text-xs font-medium text-zinc-400">
                    Ordenação padrão do estoque
                  </label>
                  <select
                    id="pref-sort"
                    value={preferences.defaultInventorySort}
                    onChange={(e) =>
                      onUpdatePreferences({
                        ...preferences,
                        defaultInventorySort: e.target.value as UserPreferences['defaultInventorySort'],
                      })
                    }
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[#09090B] border border-[#26262E] text-white text-sm focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="recentes">Mais recentes</option>
                    <option value="menor_preco">Menor preço</option>
                    <option value="maior_preco">Maior preço</option>
                    <option value="modelo">Modelo (A-Z)</option>
                  </select>
                </div>
              </div>

              <div className="pt-1 border-t lg:border-t-0 border-[#202028] divide-y divide-[#202028]">
                <ToggleRow
                  id="pref-show-12x"
                  label="Exibir simulação 12x nos cards"
                  description="Mostra o valor estimado em 12x logo abaixo do preço à vista nos aparelhos do estoque."
                  checked={preferences.showInstallmentPreview}
                  onChange={(next) =>
                    onUpdatePreferences({ ...preferences, showInstallmentPreview: next })
                  }
                />
                <ToggleRow
                  id="pref-show-imei"
                  label="Exibir código IMEI nos cards"
                  description="Mostra o IMEI/Serial cadastrado diretamente nos cards do estoque para conferência rápida."
                  checked={preferences.showImeiOnCards}
                  onChange={(next) =>
                    onUpdatePreferences({ ...preferences, showImeiOnCards: next })
                  }
                />
                <ToggleRow
                  id="pref-auto-warranty"
                  label="Abrir comprovante automaticamente após venda"
                  description="Abre o Comprovante Digital de Garantia assim que a venda é registrada para envio ao cliente."
                  checked={preferences.autoOpenWarrantyAfterSale}
                  onChange={(next) =>
                    onUpdatePreferences({ ...preferences, autoOpenWarrantyAfterSale: next })
                  }
                />
              </div>
            </div>
          </section>

          {/* 1C. Segurança da Conta */}
          <section className="bg-[#121216] border border-[#26262E] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <h2 className="font-display font-semibold text-base text-white">
                Segurança & Sessão
              </h2>
            </div>

            {isPasswordProvider ? (
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="cfg-cur-pwd" className="block text-xs font-medium text-zinc-400">
                      Senha atual
                    </label>
                    <div className="relative">
                      <input
                        id="cfg-cur-pwd"
                        type={showPasswords ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••"
                        className="w-full min-h-[46px] pl-3.5 pr-12 rounded-xl bg-[#09090B] border border-[#26262E] text-white placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords((v) => !v)}
                        aria-label={showPasswords ? 'Ocultar senhas' : 'Mostrar senhas'}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-white"
                      >
                        {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="cfg-new-pwd" className="block text-xs font-medium text-zinc-400">
                      Nova senha (mín. 6)
                    </label>
                    <input
                      id="cfg-new-pwd"
                      type={showPasswords ? 'text' : 'password'}
                      autoComplete="new-password"
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="cfg-conf-pwd" className="block text-xs font-medium text-zinc-400">
                      Confirmar nova senha
                    </label>
                    <input
                      id="cfg-conf-pwd"
                      type={showPasswords ? 'text' : 'password'}
                      autoComplete="new-password"
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="min-h-[46px] px-5 rounded-xl bg-[#1A1A20] hover:bg-[#24242C] disabled:opacity-60 text-white font-semibold text-sm transition-colors"
                  >
                    {changingPassword ? 'Atualizando senha...' : 'Atualizar Minha Senha'}
                  </button>

                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="min-h-[46px] px-5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Sair da Conta</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-medium text-white">Autenticação vinculada ao Google</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Conta protegida pelo Google ({profile.email}). A senha e verificação em duas etapas são gerenciadas na sua conta Google.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="min-h-[46px] px-5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Sair da Conta</span>
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 2A: REGRAS ATIVAS DA LOJA (SELLER VIEW — CLEAN & ACTIONABLE) */}
      {subTab === 'loja' && !isAdmin && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="bg-[#121216] border border-[#26262E] rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <Store className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <h2 className="font-display font-semibold text-base text-white">
                  Dados da Loja para Atendimento
                </h2>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-zinc-400">Loja</span>
                  <span className="text-white font-semibold text-right">{settings.storeName}</span>
                </div>
                {settings.storePhone && (
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-zinc-400">WhatsApp Comercial</span>
                    <span className="text-white font-mono-tabular">{settings.storePhone}</span>
                  </div>
                )}
                {settings.storeAddress && (
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-zinc-400">Endereço</span>
                    <span className="text-zinc-200 text-right">{settings.storeAddress}</span>
                  </div>
                )}
                {settings.storeDocument && (
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-zinc-400">CPF / CNPJ</span>
                    <span className="text-zinc-200 font-mono-tabular">{settings.storeDocument}</span>
                  </div>
                )}
              </div>

              {settings.storePixKey && (
                <div className="pt-3 border-t border-[#202028] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-zinc-400">Chave Pix da Loja</p>
                    <p className="text-xs font-mono-tabular font-semibold text-[#D4AF37] truncate">
                      {settings.storePixKey}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPixKey}
                    className="min-h-[38px] px-3 rounded-xl bg-[#1A1A20] hover:bg-[#24242C] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    {copiedPix ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />}
                    <span>{copiedPix ? 'Copiada' : 'Copiar Pix'}</span>
                  </button>
                </div>
              )}
            </section>

            <section className="bg-[#121216] border border-[#26262E] rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <h2 className="font-display font-semibold text-base text-white">
                  Permissões e Garantias Vigentes
                </h2>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-400">Ajustar preço na venda</span>
                  <span className={settings.allowSellerPriceEdit ? 'text-emerald-400 font-semibold' : 'text-zinc-400'}>
                    {settings.allowSellerPriceEdit ? 'Permitido' : 'Fixo de tabela'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-400">Receber aparelho na troca (Trade-In)</span>
                  <span className={settings.allowSellerTradeIn !== false ? 'text-emerald-400 font-semibold' : 'text-zinc-400'}>
                    {settings.allowSellerTradeIn !== false ? 'Permitido' : 'Somente Admin'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-400">Reservar aparelhos / registrar sinal</span>
                  <span className={settings.allowSellerReserve !== false ? 'text-emerald-400 font-semibold' : 'text-zinc-400'}>
                    {settings.allowSellerReserve !== false ? 'Permitido' : 'Somente Admin'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-400">Dados obrigatórios do cliente</span>
                  <span className="text-white font-medium text-right">
                    {settings.requireCustomerOnSale && settings.requireCustomerPhoneOnSale
                      ? 'Nome e WhatsApp'
                      : settings.requireCustomerOnSale
                        ? 'Nome obrigatório'
                        : settings.requireCustomerPhoneOnSale
                          ? 'WhatsApp obrigatório'
                          : 'Opcionais'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#202028]">
                  <span className="text-zinc-400">Garantia padrão</span>
                  <span className="text-[#D4AF37] font-mono-tabular font-semibold">
                    Lacrados {settings.warrantyDaysLacrado}d · Seminovos {settings.warrantyDaysSeminovo}d
                  </span>
                </div>
              </div>
            </section>
          </div>

          <section className="bg-[#121216] border border-[#26262E] rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <h2 className="font-display font-semibold text-base text-white">
                  Tabela da Maquininha Ativa
                </h2>
              </div>
              <span className="text-xs text-zinc-400">
                {settings.passCardFeeToCustomer
                  ? settings.cardFeeCalculationMode === 'simple_markup'
                    ? 'Acréscimo simples repassado ao cliente'
                    : 'Repasse líquido InfinitePay (÷ (1 - taxa))'
                  : 'Parcelamento sem repasse ao cliente'}
                {typeof settings.debitFeePercent === 'number'
                  ? ` · Débito ${settings.debitFeePercent.toFixed(2)}%`
                  : ''}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {INSTALLMENT_KEYS.map((k) => {
                const rate = Number(settings.installmentRates?.[k] ?? DEFAULT_INSTALLMENT_RATES[k]);
                return (
                  <div
                    key={k}
                    className="rounded-xl bg-[#09090B] border border-[#26262E] px-3 py-2 flex items-center justify-between text-xs font-mono-tabular"
                  >
                    <span className="text-zinc-400">{k}x</span>
                    <span className="text-white font-semibold">{rate.toFixed(2)}%</span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* TAB 2B: CONFIGURAÇÕES DA LOJA (ADMIN FULL CONTROL) */}
      {subTab === 'loja' && isAdmin && (
        <form onSubmit={handleSaveSettings} className="space-y-4 sm:space-y-5">
          {/* 1. Identidade, Contato, Endereço & Pix */}
          <section className="bg-[#121216] border border-[#26262E] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <Store className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <h2 className="font-display font-semibold text-base text-white">
                Identidade, Endereço e Pix da Loja
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="space-y-1.5">
                <label htmlFor="cfg-store-name" className="block text-xs font-medium text-zinc-400">
                  Nome da Loja
                </label>
                <input
                  id="cfg-store-name"
                  type="text"
                  autoCapitalize="words"
                  maxLength={SCHEMA_LIMITS.STORE_NAME_MAX}
                  value={draft.storeName}
                  onChange={(e) => setDraft((prev) => ({ ...prev, storeName: e.target.value }))}
                  onBlur={() =>
                    setDraft((prev) => ({ ...prev, storeName: formatTitleName(prev.storeName) }))
                  }
                  placeholder="Lucca Cell"
                  className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="cfg-store-tagline" className="block text-xs font-medium text-zinc-400">
                  Subtítulo / Slogan
                </label>
                <input
                  id="cfg-store-tagline"
                  type="text"
                  maxLength={SCHEMA_LIMITS.STORE_TAGLINE_MAX}
                  value={draft.storeTagline}
                  onChange={(e) => setDraft((prev) => ({ ...prev, storeTagline: e.target.value }))}
                  placeholder="Aparelhos Lacrados e Seminovos"
                  className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="cfg-store-phone" className="block text-xs font-medium text-zinc-400">
                  WhatsApp Comercial
                </label>
                <input
                  id="cfg-store-phone"
                  type="tel"
                  inputMode="tel"
                  maxLength={SCHEMA_LIMITS.STORE_PHONE_MAX}
                  value={draft.storePhone}
                  onChange={(e) => setDraft((prev) => ({ ...prev, storePhone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="cfg-store-doc" className="block text-xs font-medium text-zinc-400">
                  CPF ou CNPJ (aparece no comprovante)
                </label>
                <input
                  id="cfg-store-doc"
                  type="text"
                  maxLength={SCHEMA_LIMITS.STORE_DOCUMENT_MAX}
                  value={draft.storeDocument || ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, storeDocument: e.target.value }))}
                  placeholder="00.000.000/0001-00"
                  className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="cfg-store-address" className="block text-xs font-medium text-zinc-400">
                  Endereço / Cidade (comprovante e listas)
                </label>
                <input
                  id="cfg-store-address"
                  type="text"
                  maxLength={SCHEMA_LIMITS.STORE_ADDRESS_MAX}
                  value={draft.storeAddress || ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, storeAddress: e.target.value }))}
                  placeholder="Ex: Rua Exemplo, 120 - Centro"
                  className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="cfg-store-pix" className="block text-xs font-medium text-zinc-400">
                  Chave Pix da Loja (cópia rápida no balcão)
                </label>
                <input
                  id="cfg-store-pix"
                  type="text"
                  maxLength={SCHEMA_LIMITS.STORE_PIX_MAX}
                  value={draft.storePixKey || ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, storePixKey: e.target.value }))}
                  placeholder="CNPJ, celular, e-mail ou chave aleatória"
                  className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>
          </section>

          {/* 2. Operação, Permissões da Equipe & Estoque */}
          <section className="bg-[#121216] border border-[#26262E] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <Sliders className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <h2 className="font-display font-semibold text-base text-white">
                Estoque, Permissões dos Vendedores e Regras de Venda
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-7">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="block text-xs font-medium text-zinc-400">
                    Condição padrão ao cadastrar aparelho
                  </span>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-[#09090B] border border-[#26262E] rounded-xl">
                    {(['lacrado', 'seminovo'] as DeviceCondition[]).map((cond) => (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => setDraft((prev) => ({ ...prev, defaultCondition: cond }))}
                        className={`min-h-[42px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                          draft.defaultCondition === cond
                            ? cond === 'lacrado'
                              ? 'bg-[#D4AF37] text-black'
                              : 'bg-white text-black'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {cond === 'lacrado' ? 'Lacrado' : 'Seminovo'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-xs font-medium text-zinc-400">
                    Capacidade padrão (GB)
                  </span>
                  <div className="grid grid-cols-5 gap-1">
                    {SCHEMA_LIMITS.STORAGE_OPTIONS.map((gb) => (
                      <button
                        key={gb}
                        type="button"
                        onClick={() => setDraft((prev) => ({ ...prev, defaultStorageGb: gb }))}
                        className={`min-h-[42px] px-1 rounded-xl text-xs font-mono-tabular font-semibold border transition-colors whitespace-nowrap ${
                          draft.defaultStorageGb === gb
                            ? 'bg-white text-black border-white'
                            : 'bg-[#09090B] text-zinc-300 border-[#26262E] hover:border-zinc-500'
                        }`}
                      >
                        {formatStorage(gb)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-xs font-medium text-zinc-400">
                    Pagamento padrão na venda
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {PAYMENT_OPTIONS.map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({ ...prev, defaultPaymentMethod: method }))
                        }
                        className={`min-h-[42px] px-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
                          draft.defaultPaymentMethod === method
                            ? 'bg-white text-black border-white'
                            : 'bg-[#09090B] text-zinc-300 border-[#26262E] hover:border-zinc-500'
                        }`}
                      >
                        {PAYMENT_LABELS[method]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <label htmlFor="cfg-battery-alert" className="font-medium text-zinc-400">
                      Alerta visual de bateria (seminovos)
                    </label>
                    <span className="font-mono-tabular font-semibold text-[#D4AF37] whitespace-nowrap">
                      Abaixo de {draft.lowBatteryWarningThreshold}%
                    </span>
                  </div>
                  <input
                    id="cfg-battery-alert"
                    type="range"
                    min={50}
                    max={95}
                    step={1}
                    value={draft.lowBatteryWarningThreshold}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        lowBatteryWarningThreshold: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-[#D4AF37] h-2 bg-[#09090B] rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <label htmlFor="cfg-stock-alert" className="font-medium text-zinc-400">
                      Alerta de reposição (Lacrados)
                    </label>
                    <span className="font-mono-tabular font-semibold text-[#D4AF37] whitespace-nowrap">
                      {draft.lowStockThreshold === 0
                        ? 'Apenas esgotado (0 un.)'
                        : `Até ${draft.lowStockThreshold} un.`}
                    </span>
                  </div>
                  <input
                    id="cfg-stock-alert"
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={draft.lowStockThreshold}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        lowStockThreshold: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-[#D4AF37] h-2 bg-[#09090B] rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-1 border-t lg:border-t-0 border-[#202028] divide-y divide-[#202028]">
                <ToggleRow
                  id="cfg-allow-price-edit"
                  label="Vendedor pode ajustar preço final"
                  description="Permite aplicar desconto ou acréscimo ao concluir uma venda."
                  checked={draft.allowSellerPriceEdit}
                  onChange={(next) =>
                    setDraft((prev) => ({ ...prev, allowSellerPriceEdit: next }))
                  }
                />
                <ToggleRow
                  id="cfg-allow-tradein"
                  label="Vendedor pode registrar Troca (Trade-In)"
                  description="Permite que vendedores recebam aparelhos usados como parte do pagamento."
                  checked={draft.allowSellerTradeIn !== false}
                  onChange={(next) =>
                    setDraft((prev) => ({ ...prev, allowSellerTradeIn: next }))
                  }
                />
                <ToggleRow
                  id="cfg-allow-reserve"
                  label="Vendedor pode reservar aparelhos"
                  description="Permite registrar reservas com sinal para segurar aparelhos do estoque."
                  checked={draft.allowSellerReserve !== false}
                  onChange={(next) =>
                    setDraft((prev) => ({ ...prev, allowSellerReserve: next }))
                  }
                />
                <ToggleRow
                  id="cfg-require-customer"
                  label="Exigir nome do cliente na venda"
                  description="Torna obrigatório preencher o nome do cliente antes de finalizar a venda."
                  checked={draft.requireCustomerOnSale}
                  onChange={(next) =>
                    setDraft((prev) => ({ ...prev, requireCustomerOnSale: next }))
                  }
                />
                <ToggleRow
                  id="cfg-require-phone"
                  label="Exigir WhatsApp do cliente na venda"
                  description="Garante o preenchimento do WhatsApp para alimentar o CRM e enviar garantias."
                  checked={Boolean(draft.requireCustomerPhoneOnSale)}
                  onChange={(next) =>
                    setDraft((prev) => ({ ...prev, requireCustomerPhoneOnSale: next }))
                  }
                />
              </div>
            </div>
          </section>

          {/* 3. Garantia & Mensagens WhatsApp */}
          <section className="bg-[#121216] border border-[#26262E] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <h2 className="font-display font-semibold text-base text-white">
                Prazos de Garantia & Textos Automáticos
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="cfg-warr-lac" className="block text-xs font-medium text-zinc-400">
                      Garantia Lacrado (dias)
                    </label>
                    <input
                      id="cfg-warr-lac"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={SCHEMA_LIMITS.WARRANTY_DAYS_MAX}
                      value={draft.warrantyDaysLacrado}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          warrantyDaysLacrado: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="w-full min-h-[44px] px-3 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="cfg-warr-sem" className="block text-xs font-medium text-zinc-400">
                      Garantia Seminovo (dias)
                    </label>
                    <input
                      id="cfg-warr-sem"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={SCHEMA_LIMITS.WARRANTY_DAYS_MAX}
                      value={draft.warrantyDaysSeminovo}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          warrantyDaysSeminovo: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="w-full min-h-[44px] px-3 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="cfg-warr-terms" className="block text-xs font-medium text-zinc-400">
                    Termo exibido no Comprovante de Garantia
                  </label>
                  <textarea
                    id="cfg-warr-terms"
                    rows={3}
                    maxLength={SCHEMA_LIMITS.WARRANTY_TERMS_MAX}
                    value={draft.warrantyTerms || ''}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, warrantyTerms: e.target.value }))
                    }
                    placeholder="Ex: Garantia cobre defeitos de hardware. Não cobre queda ou líquidos."
                    className="w-full p-3 rounded-xl bg-[#09090B] border border-[#26262E] text-white placeholder:text-zinc-600 text-xs leading-relaxed focus:outline-none focus:border-[#D4AF37] resize-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="cfg-wa-footer" className="block text-xs font-medium text-zinc-400">
                  Rodapé da Lista Diária para WhatsApp
                </label>
                <textarea
                  id="cfg-wa-footer"
                  rows={5}
                  maxLength={SCHEMA_LIMITS.WHATSAPP_FOOTER_MAX}
                  value={draft.whatsappListFooter || ''}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, whatsappListFooter: e.target.value }))
                  }
                  placeholder="Ex: Aceitamos seu iPhone usado na troca! Entregamos no mesmo dia."
                  className="w-full p-3 rounded-xl bg-[#09090B] border border-[#26262E] text-white placeholder:text-zinc-600 text-xs leading-relaxed focus:outline-none focus:border-[#D4AF37] resize-none"
                />
                <p className="text-[11px] text-zinc-500">
                  Incluído automaticamente no fim da lista gerada em Estoque &gt; Lista WhatsApp.
                </p>
              </div>
            </div>
          </section>

          {/* 4. Taxas da Maquininha (InfinitePay · Débito e Crédito 1x a 12x) */}
          <section className="bg-[#121216] border border-[#26262E] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <CreditCard className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <div>
                  <h2 className="font-display font-semibold text-base text-white">
                    Taxas da Maquininha (InfinitePay · 1x–12x)
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    Carregue a faixa de faturamento InfinitePay (1 dia útil · Visa/Mastercard) ou edite manualmente
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRestoreRates}
                  className="min-h-[34px] px-2.5 rounded-lg bg-[#1A1A20] hover:bg-[#24242C] text-zinc-300 text-xs font-medium"
                >
                  Restaurar Padrão
                </button>
                <button
                  type="button"
                  onClick={handleZeroRates}
                  className="min-h-[34px] px-2.5 rounded-lg bg-[#1A1A20] hover:bg-[#24242C] text-amber-300 text-xs font-medium"
                >
                  Zerar Taxas (0%)
                </button>
              </div>
            </div>

            {/* InfinitePay Tier Presets */}
            <div className="rounded-xl bg-[#09090B] border border-[#26262E] p-3 space-y-2">
              <span className="block text-[11px] font-medium text-zinc-400">
                Tabelas InfinitePay por Faturamento Mensal (1 clique)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {INFINITEPAY_PRESETS.map((preset) => {
                  const isActivePreset =
                    Math.abs(Number(draft.debitFeePercent ?? 0) - preset.debitFeePercent) < 0.005 &&
                    INSTALLMENT_KEYS.every(
                      (k) =>
                        Math.abs(
                          Number(draft.installmentRates?.[k] ?? 0) - preset.installmentRates[k]
                        ) < 0.005
                    );
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyInfinitePayPreset(preset)}
                      className={`min-h-[46px] px-2.5 py-1.5 rounded-xl border text-left transition-colors ${
                        isActivePreset
                          ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                          : 'bg-[#121216] text-zinc-200 border-[#26262E] hover:border-zinc-500'
                      }`}
                    >
                      <span className="block text-xs font-bold leading-tight">
                        {preset.shortLabel}
                      </span>
                      <span
                        className={`block text-[10px] font-mono-tabular mt-0.5 ${
                          isActivePreset ? 'text-black/80' : 'text-zinc-400'
                        }`}
                      >
                        1x {preset.installmentRates['1'].toFixed(2)}% · 12x{' '}
                        {preset.installmentRates['12'].toFixed(2)}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex-1">
                <ToggleRow
                  id="cfg-pass-card-fee"
                  label="Repassar juros da maquininha para o cliente"
                  description="Quando ativo, o simulador e o checkout no Crédito calculam o valor parcelado cobrindo a taxa da maquininha."
                  checked={draft.passCardFeeToCustomer}
                  onChange={(next) =>
                    setDraft((prev) => ({ ...prev, passCardFeeToCustomer: next }))
                  }
                />
              </div>

              <div className="sm:w-44 space-y-1 shrink-0">
                <label htmlFor="cfg-debit-rate" className="block text-[11px] font-medium text-zinc-400">
                  Taxa Débito (%)
                </label>
                <input
                  id="cfg-debit-rate"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  max={SCHEMA_LIMITS.RATE_MAX}
                  value={draft.debitFeePercent ?? 0}
                  onChange={(e) => {
                    const nextNum = Math.max(
                      0,
                      Math.min(SCHEMA_LIMITS.RATE_MAX, Number(e.target.value) || 0)
                    );
                    setDraft((prev) => ({ ...prev, debitFeePercent: nextNum }));
                  }}
                  className="w-full min-h-[42px] px-3 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular text-sm focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            {/* Pass-through formula mode */}
            <div className="space-y-1.5">
              <span className="block text-[11px] font-medium text-zinc-400">
                Fórmula de Repasse ao Cliente
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-1 bg-[#09090B] border border-[#26262E] rounded-xl">
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      cardFeeCalculationMode: 'infinitepay_repasse',
                    }))
                  }
                  className={`min-h-[44px] px-3 py-1.5 rounded-lg text-left transition-colors ${
                    (draft.cardFeeCalculationMode || 'infinitepay_repasse') ===
                    'infinitepay_repasse'
                      ? 'bg-[#D4AF37] text-black'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  <span className="block text-xs font-bold leading-tight">
                    Repasse Líquido InfinitePay
                  </span>
                  <span
                    className={`block text-[10px] leading-tight mt-0.5 ${
                      (draft.cardFeeCalculationMode || 'infinitepay_repasse') ===
                      'infinitepay_repasse'
                        ? 'text-black/80'
                        : 'text-zinc-400'
                    }`}
                  >
                    Valor ÷ (1 - taxa) · loja recebe 100% líquido
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      cardFeeCalculationMode: 'simple_markup',
                    }))
                  }
                  className={`min-h-[44px] px-3 py-1.5 rounded-lg text-left transition-colors ${
                    draft.cardFeeCalculationMode === 'simple_markup'
                      ? 'bg-white text-black'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  <span className="block text-xs font-bold leading-tight">Acréscimo Simples</span>
                  <span
                    className={`block text-[10px] leading-tight mt-0.5 ${
                      draft.cardFeeCalculationMode === 'simple_markup'
                        ? 'text-black/80'
                        : 'text-zinc-400'
                    }`}
                  >
                    Valor × (1 + taxa) · soma percentual direta
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-2 border-t border-[#202028]">
              {INSTALLMENT_KEYS.map((k) => {
                const rateVal =
                  draft.installmentRates?.[k] ?? DEFAULT_INSTALLMENT_RATES[k];
                return (
                  <div key={k} className="space-y-1">
                    <label
                      htmlFor={`cfg-rate-${k}`}
                      className="block text-[11px] font-medium text-zinc-400"
                    >
                      {k}x (%)
                    </label>
                    <input
                      id={`cfg-rate-${k}`}
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min={0}
                      max={SCHEMA_LIMITS.RATE_MAX}
                      value={rateVal}
                      onChange={(e) => {
                        const nextNum = Math.max(
                          0,
                          Math.min(SCHEMA_LIMITS.RATE_MAX, Number(e.target.value) || 0)
                        );
                        setDraft((prev) => ({
                          ...prev,
                          installmentRates: {
                            ...(prev.installmentRates || DEFAULT_INSTALLMENT_RATES),
                            [k]: nextNum,
                          },
                        }));
                      }}
                      className="w-full min-h-[42px] px-2.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular text-sm focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                );
              })}
            </div>

            {(() => {
              const sim12 = calculateInstallment(
                5000,
                12,
                draft.installmentRates || DEFAULT_INSTALLMENT_RATES,
                draft.passCardFeeToCustomer,
                draft.cardFeeCalculationMode || 'infinitepay_repasse'
              );
              return (
                <p className="text-xs text-zinc-400 font-mono-tabular">
                  Simulação para receber R$ 5.000,00: 12x de{' '}
                  <strong className="text-[#D4AF37]">{formatBRL(sim12.installmentValue)}</strong>{' '}
                  (Total {formatBRL(sim12.totalWithFee)})
                </p>
              );
            })()}
          </section>

          {/* 5. Padrões da Impressora NIIMBOT */}
          <section className="bg-[#121216] border border-[#26262E] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <Printer className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <h2 className="font-display font-semibold text-base text-white">
                Padrões da Impressora NIIMBOT
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-7">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="block text-xs font-medium text-zinc-400">
                    Tamanho de etiqueta padrão
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {NIIMBOT_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({ ...prev, defaultLabelPresetId: p.id }))
                        }
                        className={`min-h-[44px] px-2 rounded-xl text-xs font-mono-tabular font-semibold border transition-colors whitespace-nowrap ${
                          draft.defaultLabelPresetId === p.id
                            ? 'bg-white text-black border-white'
                            : 'bg-[#09090B] text-zinc-300 border-[#26262E] hover:border-zinc-500'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-xs font-medium text-zinc-400">
                    Modelo visual padrão
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {LABEL_STYLES.map((st) => {
                      const active = draft.defaultLabelStyleId === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() =>
                            setDraft((prev) => ({ ...prev, defaultLabelStyleId: st.id }))
                          }
                          className={`min-h-[48px] px-3 py-2 rounded-xl text-left border transition-colors ${
                            active
                              ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                              : 'bg-[#09090B] text-white border-[#26262E] hover:border-zinc-500'
                          }`}
                        >
                          <span className="block text-xs font-bold leading-tight">{st.name}</span>
                          <span
                            className={`block text-[11px] leading-tight mt-0.5 ${
                              active ? 'text-black/80' : 'text-zinc-400'
                            }`}
                          >
                            {st.subtitle}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="cfg-label-prefix" className="block text-xs font-medium text-zinc-400">
                    Prefixo do código de barras (1 a 6 letras/números)
                  </label>
                  <input
                    id="cfg-label-prefix"
                    type="text"
                    maxLength={SCHEMA_LIMITS.LABEL_PREFIX_MAX}
                    value={draft.labelPrefix}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        labelPrefix: e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase(),
                      }))
                    }
                    placeholder="LC"
                    className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular uppercase placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                    required
                  />
                </div>

                <div className="pt-1 border-t border-[#202028] divide-y divide-[#202028]">
                  <ToggleRow
                    id="cfg-label-store"
                    label="Exibir nome da loja na etiqueta"
                    description="Imprime o nome configurado no topo da etiqueta."
                    checked={draft.labelShowStore}
                    onChange={(next) => setDraft((prev) => ({ ...prev, labelShowStore: next }))}
                  />
                  <ToggleRow
                    id="cfg-label-price"
                    label="Exibir valor (R$) na etiqueta"
                    description="Mostra o preço de venda diretamente na etiqueta."
                    checked={draft.labelShowPrice}
                    onChange={(next) => setDraft((prev) => ({ ...prev, labelShowPrice: next }))}
                  />
                  <ToggleRow
                    id="cfg-label-barcode"
                    label="Exibir código de barras Code-128"
                    description="Inclui código de barras escaneável na etiqueta."
                    checked={draft.labelShowBarcode}
                    onChange={(next) => setDraft((prev) => ({ ...prev, labelShowBarcode: next }))}
                  />
                </div>

                {/* Live Mini NIIMBOT Preview */}
                <div className="bg-[#09090B] rounded-xl p-3 flex flex-col items-center justify-center gap-2">
                  <span className="text-[11px] text-zinc-500 font-mono-tabular">
                    Prévia ao vivo · {previewPreset.label}
                  </span>
                  <div
                    className="bg-white text-black rounded-md border border-zinc-300 px-2.5 py-1.5 flex flex-col justify-between overflow-hidden"
                    style={{
                      width: `${Math.min(240, previewPreset.widthMm * (previewPreset.widthMm <= 35 ? 6.8 : 4.4))}px`,
                      minHeight: `${Math.max(62, previewPreset.heightMm * (previewPreset.widthMm <= 35 ? 6.2 : 4.0))}px`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-1 text-[9px] font-bold border-b border-black pb-0.5">
                      <span className="truncate">
                        {draft.labelShowStore ? previewHeading : previewCode}
                      </span>
                      <span>LACRADO</span>
                    </div>
                    <div className="py-0.5">
                      <p className="text-[11px] font-extrabold leading-tight truncate">
                        iPhone 15 Pro
                      </p>
                      <p className="text-[9px] text-zinc-800 truncate">256 GB · Titânio · Bat. 100%</p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      {draft.labelShowPrice && (
                        <span
                          className={`font-mono-tabular text-[11px] font-extrabold whitespace-nowrap ${
                            draft.defaultLabelStyleId === 'vitrine'
                              ? 'bg-black text-white px-1.5 py-0.5 rounded'
                              : ''
                          }`}
                        >
                          R$ 5.890,00
                        </span>
                      )}
                      {draft.labelShowBarcode && !previewPreset.compact && (
                        <div className="flex-1 max-w-[96px] ml-auto">
                          <svg
                            viewBox={`0 0 ${previewBarcode.totalUnits} 18`}
                            preserveAspectRatio="none"
                            className="w-full h-3.5"
                          >
                            {previewBars.map((b, idx) => (
                              <rect key={idx} x={b.x} y={0} width={b.w} height={18} fill="#000000" />
                            ))}
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Save / Restore Bar */}
          <div className="bg-[#121216] border border-[#26262E] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-zinc-400">
              {hasUnsavedChanges
                ? 'Existem alterações pendentes aguardando salvamento.'
                : 'Todas as preferências da loja estão sincronizadas.'}
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="min-h-[46px] px-4 rounded-xl bg-[#1A1A20] hover:bg-[#24242C] text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span>Restaurar Padrões</span>
              </button>

              <button
                type="submit"
                disabled={saving}
                className="min-h-[46px] px-5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] disabled:opacity-60 text-black font-semibold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                {saving ? (
                  'Salvando...'
                ) : hasUnsavedChanges ? (
                  <>
                    <Save className="w-4 h-4 shrink-0" />
                    <span>Salvar Configurações</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Configurações Salvas</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
