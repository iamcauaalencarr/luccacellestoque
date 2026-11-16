import React, { useEffect, useState } from 'react';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import {
  Check,
  CreditCard,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Printer,
  RotateCcw,
  Save,
  ShieldCheck,
  Sliders,
  Store,
  User,
} from 'lucide-react';
import {
  DEFAULT_INSTALLMENT_RATES,
  DEFAULT_STORE_SETTINGS,
  type DeviceCondition,
  type InstallmentCountKey,
  type SinglePaymentMethod,
  SCHEMA_LIMITS,
  type StoreSettings,
} from '../types';
import { useAuth } from '../contexts/AuthContext';
import { saveStoreSettings } from '../services/storeService';
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
  onNotify: (type: 'success' | 'error' | 'info', text: string) => void;
}

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

export function SettingsView({ settings, onNotify }: SettingsViewProps) {
  const { firebaseUser, profile, signOut } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [draft, setDraft] = useState<StoreSettings>(settings);
  const [saving, setSaving] = useState(false);

  // Password change state (for username/password accounts)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

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
    draft.defaultCondition !== settings.defaultCondition ||
    draft.defaultStorageGb !== settings.defaultStorageGb ||
    draft.defaultPaymentMethod !== settings.defaultPaymentMethod ||
    draft.allowSellerPriceEdit !== settings.allowSellerPriceEdit ||
    draft.requireCustomerOnSale !== settings.requireCustomerOnSale ||
    draft.lowBatteryWarningThreshold !== settings.lowBatteryWarningThreshold ||
    draft.lowStockThreshold !== settings.lowStockThreshold ||
    draft.warrantyDaysLacrado !== settings.warrantyDaysLacrado ||
    draft.warrantyDaysSeminovo !== settings.warrantyDaysSeminovo ||
    draft.passCardFeeToCustomer !== settings.passCardFeeToCustomer ||
    hasRatesChange ||
    draft.defaultLabelPresetId !== settings.defaultLabelPresetId ||
    draft.defaultLabelStyleId !== settings.defaultLabelStyleId ||
    draft.labelShowStore !== settings.labelShowStore ||
    draft.labelShowPrice !== settings.labelShowPrice ||
    draft.labelShowBarcode !== settings.labelShowBarcode ||
    draft.labelPrefix !== settings.labelPrefix;

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
      onNotify('success', 'Configurações salvas e aplicadas em tempo real.');
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-white">
            Configurações do App
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            {isAdmin
              ? 'Identidade da loja, regras operacionais, etiquetas NIIMBOT e sua conta'
              : 'Preferências ativas da loja e gerenciamento da sua conta'}
          </p>
        </div>

        {settings.updatedAt && (
          <span className="text-xs text-zinc-500 font-mono-tabular whitespace-nowrap">
            Atualizado: {formatTimestamp(settings.updatedAt)}
          </span>
        )}
      </div>

      {/* Store Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-4 sm:space-y-5">
        {/* 1. Identidade da Loja (Balanced 3-column row on desktop) */}
        <section className="bg-[#121216] border border-[#26262E] rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Store className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <h2 className="font-display font-semibold text-base text-white">
                Identidade da Loja
              </h2>
            </div>
            {!isAdmin && (
              <span className="text-xs text-zinc-500 whitespace-nowrap">Somente leitura</span>
            )}
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
                disabled={!isAdmin}
                value={draft.storeName}
                onChange={(e) => setDraft((prev) => ({ ...prev, storeName: e.target.value }))}
                onBlur={() =>
                  setDraft((prev) => ({ ...prev, storeName: formatTitleName(prev.storeName) }))
                }
                placeholder="Lucca Cell"
                className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37] disabled:opacity-60"
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
                disabled={!isAdmin}
                value={draft.storeTagline}
                onChange={(e) => setDraft((prev) => ({ ...prev, storeTagline: e.target.value }))}
                placeholder="Aparelhos Lacrados e Seminovos"
                className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37] disabled:opacity-60"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cfg-store-phone" className="block text-xs font-medium text-zinc-400">
                WhatsApp / Telefone Comercial
              </label>
              <input
                id="cfg-store-phone"
                type="tel"
                inputMode="tel"
                maxLength={SCHEMA_LIMITS.STORE_PHONE_MAX}
                disabled={!isAdmin}
                value={draft.storePhone}
                onChange={(e) => setDraft((prev) => ({ ...prev, storePhone: e.target.value }))}
                placeholder="(11) 99999-9999"
                className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37] disabled:opacity-60"
              />
            </div>
          </div>
        </section>

        {/* 2. Estoque e Regras de Venda (Balanced 2-column internal split) */}
        <section className="bg-[#121216] border border-[#26262E] rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Sliders className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <h2 className="font-display font-semibold text-base text-white">
                Estoque e Regras de Venda
              </h2>
            </div>
            {!isAdmin && (
              <span className="text-xs text-zinc-500 whitespace-nowrap">Somente leitura</span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-7">
            {/* Left: Stock defaults */}
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
                      disabled={!isAdmin}
                      onClick={() => setDraft((prev) => ({ ...prev, defaultCondition: cond }))}
                      className={`min-h-[42px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-60 ${
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
                      disabled={!isAdmin}
                      onClick={() => setDraft((prev) => ({ ...prev, defaultStorageGb: gb }))}
                      className={`min-h-[42px] px-1 rounded-xl text-xs font-mono-tabular font-semibold border transition-colors whitespace-nowrap disabled:opacity-60 ${
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
                  disabled={!isAdmin}
                  value={draft.lowBatteryWarningThreshold}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      lowBatteryWarningThreshold: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-[#D4AF37] h-2 bg-[#09090B] rounded-lg cursor-pointer disabled:opacity-60"
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
                  disabled={!isAdmin}
                  value={draft.lowStockThreshold}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      lowStockThreshold: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-[#D4AF37] h-2 bg-[#09090B] rounded-lg cursor-pointer disabled:opacity-60"
                />
              </div>
            </div>

            {/* Right: Sale rules & Warranty */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-zinc-400">
                  Pagamento padrão na venda
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {PAYMENT_OPTIONS.map((method) => (
                    <button
                      key={method}
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => setDraft((prev) => ({ ...prev, defaultPaymentMethod: method }))}
                      className={`min-h-[42px] px-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap disabled:opacity-60 ${
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
                    disabled={!isAdmin}
                    value={draft.warrantyDaysLacrado}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        warrantyDaysLacrado: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular text-base sm:text-sm focus:outline-none focus:border-[#D4AF37] disabled:opacity-60"
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
                    disabled={!isAdmin}
                    value={draft.warrantyDaysSeminovo}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        warrantyDaysSeminovo: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular text-base sm:text-sm focus:outline-none focus:border-[#D4AF37] disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="pt-1 border-t border-[#202028] divide-y divide-[#202028]">
                <ToggleRow
                  id="cfg-allow-price-edit"
                  label="Vendedor pode ajustar preço"
                  description="Permite editar o valor final ao registrar a venda; desativado mantém o preço de tabela."
                  checked={draft.allowSellerPriceEdit}
                  disabled={!isAdmin}
                  onChange={(next) =>
                    setDraft((prev) => ({ ...prev, allowSellerPriceEdit: next }))
                  }
                />
                <ToggleRow
                  id="cfg-require-customer"
                  label="Exigir nome do cliente na venda"
                  description="Torna obrigatório preencher o cliente antes de concluir o registro da venda."
                  checked={draft.requireCustomerOnSale}
                  disabled={!isAdmin}
                  onChange={(next) =>
                    setDraft((prev) => ({ ...prev, requireCustomerOnSale: next }))
                  }
                />
              </div>
            </div>
          </div>
        </section>

        {/* 2B. Taxas da Maquininha (Parcelamento 1x a 12x) */}
        <section className="bg-[#121216] border border-[#26262E] rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <CreditCard className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <h2 className="font-display font-semibold text-base text-white">
                Taxas da Maquininha (Crédito 1x a 12x)
              </h2>
            </div>
            <span className="text-xs text-zinc-400 font-mono-tabular whitespace-nowrap">
              Simulação R$ 5.000: 12x de{' '}
              <strong className="text-[#D4AF37]">
                {formatBRL(
                  calculateInstallment(
                    5000,
                    12,
                    draft.installmentRates || DEFAULT_INSTALLMENT_RATES,
                    draft.passCardFeeToCustomer
                  ).installmentValue
                )}
              </strong>
            </span>
          </div>

          <ToggleRow
            id="cfg-pass-card-fee"
            label="Repassar juros da maquininha para o cliente"
            description="Quando ativo, o simulador e o checkout no Crédito somam automaticamente o percentual abaixo ao valor parcelado."
            checked={draft.passCardFeeToCustomer}
            disabled={!isAdmin}
            onChange={(next) =>
              setDraft((prev) => ({ ...prev, passCardFeeToCustomer: next }))
            }
          />

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-1 border-t border-[#202028]">
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
                    disabled={!isAdmin}
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
                    className="w-full min-h-[42px] px-2.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular text-sm focus:outline-none focus:border-[#D4AF37] disabled:opacity-60"
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. Padrões da Impressora NIIMBOT */}
        <section className="bg-[#121216] border border-[#26262E] rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Printer className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <h2 className="font-display font-semibold text-base text-white">
                Padrões da Impressora NIIMBOT
              </h2>
            </div>
            {!isAdmin && (
              <span className="text-xs text-zinc-500 whitespace-nowrap">Somente leitura</span>
            )}
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
                      disabled={!isAdmin}
                      onClick={() =>
                        setDraft((prev) => ({ ...prev, defaultLabelPresetId: p.id }))
                      }
                      className={`min-h-[44px] px-2 rounded-xl text-xs font-mono-tabular font-semibold border transition-colors whitespace-nowrap disabled:opacity-60 ${
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
                        disabled={!isAdmin}
                        onClick={() =>
                          setDraft((prev) => ({ ...prev, defaultLabelStyleId: st.id }))
                        }
                        className={`min-h-[48px] px-3 py-2 rounded-xl text-left border transition-colors disabled:opacity-60 ${
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
                  disabled={!isAdmin}
                  value={draft.labelPrefix}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      labelPrefix: e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase(),
                    }))
                  }
                  placeholder="LC"
                  className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular uppercase placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37] disabled:opacity-60"
                  required
                />
              </div>

              <div className="pt-1 border-t border-[#202028] divide-y divide-[#202028]">
                <ToggleRow
                  id="cfg-label-store"
                  label="Exibir nome da loja na etiqueta"
                  description="Imprime o nome configurado no topo da etiqueta."
                  checked={draft.labelShowStore}
                  disabled={!isAdmin}
                  onChange={(next) => setDraft((prev) => ({ ...prev, labelShowStore: next }))}
                />
                <ToggleRow
                  id="cfg-label-price"
                  label="Exibir valor (R$) na etiqueta"
                  description="Mostra o preço de venda diretamente na etiqueta."
                  checked={draft.labelShowPrice}
                  disabled={!isAdmin}
                  onChange={(next) => setDraft((prev) => ({ ...prev, labelShowPrice: next }))}
                />
                <ToggleRow
                  id="cfg-label-barcode"
                  label="Exibir código de barras Code-128"
                  description="Inclui código de barras escaneável na etiqueta."
                  checked={draft.labelShowBarcode}
                  disabled={!isAdmin}
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

        {/* Dedicated Global Save / Restore Bar for the Store Form */}
        {isAdmin && (
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
        )}
      </form>

      {/* 4. Minha Conta e Segurança (Unified 2-column hairline-divided surface) */}
      <section className="bg-[#121216] border border-[#26262E] rounded-2xl p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-0 lg:divide-x lg:divide-[#202028]">
        {/* Account Overview */}
        <div className="lg:pr-6 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-[#1A1A20] border border-[#2E2E38] flex items-center justify-center text-[#D4AF37] shrink-0">
                {profile.role === 'admin' ? (
                  <ShieldCheck className="w-6 h-6" />
                ) : (
                  <User className="w-6 h-6" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display font-semibold text-base text-white truncate">
                  {profile.displayName}
                </h2>
                <p className="text-xs text-zinc-400 font-mono-tabular truncate">
                  @{profile.username} · {profile.role === 'admin' ? 'Administrador' : 'Vendedor'}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#202028] space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-400">Status do acesso</span>
                <span className="text-emerald-400 font-medium">Ativo</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-400">Loja vinculada</span>
                <span className="text-white font-medium truncate">{settings.storeName}</span>
              </div>
              {settings.storePhone && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-400">Contato comercial</span>
                  <span className="text-zinc-200 font-mono-tabular">{settings.storePhone}</span>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => signOut()}
            className="w-full min-h-[46px] px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sair da Conta</span>
          </button>
        </div>

        {/* Account Security */}
        <div className="pt-5 border-t border-[#202028] lg:pt-0 lg:border-t-0 lg:pl-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <h2 className="font-display font-semibold text-base text-white">
              Segurança da Conta
            </h2>
          </div>

          {isPasswordProvider ? (
            <form onSubmit={handleChangePassword} className="space-y-3">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              <button
                type="submit"
                disabled={changingPassword}
                className="w-full min-h-[46px] px-4 rounded-xl bg-[#1A1A20] hover:bg-[#24242C] disabled:opacity-60 text-white font-semibold text-sm transition-colors"
              >
                {changingPassword ? 'Atualizando senha...' : 'Atualizar Minha Senha'}
              </button>
            </form>
          ) : (
            <div className="pt-1 space-y-2">
              <p className="text-sm font-medium text-white">Autenticação vinculada ao Google</p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Sua conta administrativa utiliza login protegido pelo Google ({profile.email}).
                Alterações de senha e verificação em duas etapas são gerenciadas diretamente na sua conta Google.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
