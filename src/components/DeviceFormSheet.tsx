import React, { useEffect, useState } from 'react';
import { Minus, Plus, ScanLine, Trash2, X } from 'lucide-react';
import {
  type ColorVariant,
  type DeviceCondition,
  type DeviceItem,
  SCHEMA_LIMITS,
  type StoreSettings,
} from '../types';
import { createDevice, updateDevice } from '../services/storeService';
import { useAuth } from '../contexts/AuthContext';
import {
  formatDeviceModelName,
  formatImei,
  formatStorage,
  formatTitleName,
  getDeviceColorVariants,
} from '../utils/formatters';
import { DeviceThumbnail } from './DeviceThumbnail';
import { getAppleColorHex, getAppleModelColorSuggestions } from '../utils/appleImages';
import { BarcodeScannerSheet } from './BarcodeScannerSheet';

interface DeviceFormSheetProps {
  open: boolean;
  editingDevice: DeviceItem | null;
  duplicateFrom?: DeviceItem | null;
  settings: StoreSettings;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const QUICK_MODELS = [
  'iPhone 13',
  'iPhone 14',
  'iPhone 15',
  'iPhone 15 Pro',
  'iPhone 16',
  'iPhone 16 Pro Max',
];

const QUICK_COLORS = [
  'Preto',
  'Branco',
  'Verde',
  'Azul',
  'Rosa',
  'Titânio Preto',
  'Titânio Natural',
  'Titânio Deserto',
];

export function DeviceFormSheet({
  open,
  editingDevice,
  duplicateFrom = null,
  settings,
  onClose,
  onSuccess,
  onError,
}: DeviceFormSheetProps) {
  const { profile } = useAuth();
  const [model, setModel] = useState('');
  const [storageGb, setStorageGb] = useState<number>(settings.defaultStorageGb);
  const [condition, setCondition] = useState<DeviceCondition>(settings.defaultCondition);
  const [batteryHealth, setBatteryHealth] = useState<string>(
    settings.defaultCondition === 'lacrado' ? '100' : '92'
  );
  const [color, setColor] = useState('');
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([{ color: '', quantity: 1 }]);
  const [price, setPrice] = useState('');
  const [imei, setImei] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const source = editingDevice || duplicateFrom;
    if (source) {
      setModel(formatDeviceModelName(source.model));
      setStorageGb(source.storageGb);
      setCondition(source.condition);
      setBatteryHealth(String(source.batteryHealth));
      setColor(formatTitleName(source.color));
      setColorVariants(
        source.condition === 'lacrado'
          ? getDeviceColorVariants(source)
          : [{ color: formatTitleName(source.color), quantity: 1 }]
      );
      setPrice(String(source.price));
      setImei(editingDevice ? source.imei || '' : '');
      setNotes(editingDevice ? source.notes || '' : '');
    } else {
      setModel('');
      setStorageGb(settings.defaultStorageGb);
      setCondition(settings.defaultCondition);
      setBatteryHealth(settings.defaultCondition === 'lacrado' ? '100' : '92');
      setColor('');
      setColorVariants([{ color: '', quantity: 1 }]);
      setPrice('');
      setImei('');
      setNotes('');
    }
  }, [open, editingDevice, duplicateFrom, settings.defaultCondition, settings.defaultStorageGb]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, saving, onClose]);

  if (!open || !profile) return null;

  const handleConditionChange = (next: DeviceCondition) => {
    setCondition(next);
    if (next === 'lacrado') {
      setBatteryHealth('100');
      const hasValidVariant = colorVariants.some((v) => v.color.trim().length > 0);
      if (!hasValidVariant && color.trim()) {
        setColorVariants([{ color: formatTitleName(color), quantity: 1 }]);
      }
    } else {
      if (batteryHealth === '100' && !editingDevice) {
        setBatteryHealth('92');
      }
      if (!color.trim()) {
        const firstFilled = colorVariants.find((v) => v.color.trim().length > 0);
        if (firstFilled) setColor(formatTitleName(firstFilled.color));
      }
    }
  };

  const totalLacradoUnits = colorVariants.reduce((sum, v) => sum + Math.max(0, v.quantity), 0);

  const handleVariantColorChange = (idx: number, nextColor: string) => {
    setColorVariants((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, color: nextColor } : item))
    );
  };

  const handleVariantColorBlur = (idx: number) => {
    setColorVariants((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, color: formatTitleName(item.color) } : item))
    );
  };

  const handleVariantQtyChange = (idx: number, deltaOrValue: number, isDelta = true) => {
    setColorVariants((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const nextQty = isDelta ? item.quantity + deltaOrValue : deltaOrValue;
        return {
          ...item,
          quantity: Math.max(0, Math.min(SCHEMA_LIMITS.VARIANT_QTY_MAX, Math.round(nextQty))),
        };
      })
    );
  };

  const handleAddVariantRow = () => {
    if (colorVariants.length >= SCHEMA_LIMITS.COLOR_VARIANTS_MAX) return;
    setColorVariants((prev) => [...prev, { color: '', quantity: 1 }]);
  };

  const handleRemoveVariantRow = (idx: number) => {
    if (colorVariants.length <= 1) return;
    setColorVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleQuickAddColor = (presetColor: string) => {
    const normalized = formatTitleName(presetColor);
    setColorVariants((prev) => {
      const existingIdx = prev.findIndex(
        (v) => v.color.trim().toLocaleLowerCase('pt-BR') === normalized.toLocaleLowerCase('pt-BR')
      );
      if (existingIdx >= 0) {
        return prev.map((v, i) =>
          i === existingIdx
            ? { ...v, quantity: Math.min(SCHEMA_LIMITS.VARIANT_QTY_MAX, v.quantity + 1) }
            : v
        );
      }
      const emptyIdx = prev.findIndex((v) => v.color.trim() === '');
      if (emptyIdx >= 0) {
        return prev.map((v, i) =>
          i === emptyIdx ? { color: normalized, quantity: Math.max(1, v.quantity) } : v
        );
      }
      if (prev.length >= SCHEMA_LIMITS.COLOR_VARIANTS_MAX) return prev;
      return [...prev, { color: normalized, quantity: 1 }];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedModel = formatDeviceModelName(model);
    const parsedPrice = Number(price.replace(',', '.'));
    const parsedBattery = condition === 'lacrado' ? 100 : Number(batteryHealth);

    if (trimmedModel.length < SCHEMA_LIMITS.MODEL_MIN) {
      onError('Informe o modelo do aparelho (mínimo 2 caracteres).');
      return;
    }

    let finalColor = formatTitleName(color);
    let finalVariants: ColorVariant[] | undefined;

    if (condition === 'lacrado') {
      const nonEmpty = colorVariants
        .map((v) => ({
          color: formatTitleName(v.color),
          quantity: Math.max(0, Math.min(SCHEMA_LIMITS.VARIANT_QTY_MAX, Math.round(v.quantity))),
        }))
        .filter((v) => v.color.length > 0);

      if (nonEmpty.length === 0) {
        onError('Adicione pelo menos uma cor disponível para o aparelho lacrado.');
        return;
      }
      if (nonEmpty.some((v) => v.color.length < SCHEMA_LIMITS.COLOR_MIN)) {
        onError('Cada cor precisa ter pelo menos 2 caracteres.');
        return;
      }
      const totalStock = nonEmpty.reduce((sum, v) => sum + v.quantity, 0);
      if (totalStock <= 0) {
        onError('Informe pelo menos 1 unidade em alguma das cores.');
        return;
      }
      finalVariants = nonEmpty;
      finalColor = (nonEmpty.find((v) => v.quantity > 0) || nonEmpty[0]).color;
    } else if (finalColor.length < SCHEMA_LIMITS.COLOR_MIN) {
      onError('Informe a cor do aparelho.');
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      onError('Informe um valor de venda válido em R$.');
      return;
    }
    if (!Number.isInteger(parsedBattery) || parsedBattery < 1 || parsedBattery > 100) {
      onError('A saúde da bateria deve estar entre 1% e 100%.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        model: trimmedModel,
        storageGb,
        batteryHealth: parsedBattery,
        color: finalColor,
        ...(finalVariants ? { colorVariants: finalVariants } : {}),
        condition,
        price: parsedPrice,
        imei: formatImei(imei),
        notes: notes.trim(),
      };

      if (editingDevice) {
        await updateDevice(editingDevice, payload, {
          uid: profile.uid,
          displayName: profile.displayName,
          role: profile.role,
        });
        onSuccess('Aparelho atualizado no estoque.');
      } else {
        await createDevice(payload, {
          uid: profile.uid,
          displayName: profile.displayName,
          role: profile.role,
        });
        onSuccess('Aparelho cadastrado no estoque.');
      }
      onClose();
    } catch {
      onError('Não foi possível salvar o aparelho. Verifique suas permissões.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="device-sheet-title"
    >
      <div className="w-full sm:max-w-lg bg-[#121216] border-t sm:border border-[#26262E] rounded-t-3xl sm:rounded-2xl max-h-[90dvh] flex flex-col overflow-hidden">
        <div className="sm:hidden w-10 h-1.5 bg-zinc-700 rounded-full mx-auto mt-3 shrink-0" />

        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[#26262E] shrink-0">
          <h2 id="device-sheet-title" className="font-display text-lg font-bold text-white">
            {editingDevice
              ? 'Editar Aparelho'
              : duplicateFrom
                ? 'Duplicar Aparelho'
                : 'Cadastrar Aparelho'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center text-zinc-400 hover:text-white rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-4">
            {/* Condição */}
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-zinc-400">Condição</span>
              <div className="grid grid-cols-2 gap-1 p-1 bg-[#09090B] border border-[#26262E] rounded-xl">
                <button
                  type="button"
                  onClick={() => handleConditionChange('lacrado')}
                  className={`min-h-[44px] rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                    condition === 'lacrado'
                      ? 'bg-[#D4AF37] text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Lacrado
                </button>
                <button
                  type="button"
                  onClick={() => handleConditionChange('seminovo')}
                  className={`min-h-[44px] rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                    condition === 'seminovo'
                      ? 'bg-white text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Seminovo
                </button>
              </div>
            </div>

            {/* Modelo + Prévia visual + atalhos rápidos */}
            <div className="space-y-2">
              <label htmlFor="device-model" className="block text-xs font-medium text-zinc-400">
                Modelo
              </label>
              <div className="flex items-center gap-2.5">
                <DeviceThumbnail
                  model={model || 'iPhone'}
                  color={
                    condition === 'lacrado'
                      ? colorVariants.find((v) => v.color.trim().length > 0)?.color
                      : color
                  }
                  size="sm"
                />
                <input
                  id="device-model"
                  type="text"
                  autoCapitalize="words"
                  maxLength={SCHEMA_LIMITS.MODEL_MAX}
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  onBlur={() => setModel((prev) => formatDeviceModelName(prev))}
                  placeholder="Ex: iPhone 15 Pro Max"
                  className="flex-1 min-w-0 min-h-[48px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                  required
                />
              </div>
              {!editingDevice && (
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_MODELS.map((presetModel) => (
                    <button
                      key={presetModel}
                      type="button"
                      onClick={() => setModel(presetModel)}
                      className={`min-h-[34px] px-2.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                        model === presetModel
                          ? 'bg-white text-black border-white'
                          : 'bg-[#09090B] text-zinc-400 border-[#26262E] hover:text-white hover:border-zinc-500'
                      }`}
                    >
                      {presetModel}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Armazenamento GB */}
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-zinc-400">Capacidade (GB)</span>
              <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
                {SCHEMA_LIMITS.STORAGE_OPTIONS.map((gb) => (
                  <button
                    key={gb}
                    type="button"
                    onClick={() => setStorageGb(gb)}
                    className={`min-h-[44px] px-1 rounded-xl text-xs font-mono-tabular font-semibold border transition-colors whitespace-nowrap ${
                      storageGb === gb
                        ? 'bg-white text-black border-white'
                        : 'bg-[#09090B] text-zinc-300 border-[#26262E] hover:border-zinc-500'
                    }`}
                  >
                    {formatStorage(gb)}
                  </button>
                ))}
              </div>
            </div>

            {/* Cores e Quantidade (Lacrado multi-cores) ou Bateria & Cor (Seminovo) */}
            {condition === 'lacrado' ? (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-400">
                    Opções de Cores e Estoque
                  </span>
                  <span className="font-mono-tabular text-xs font-semibold text-[#D4AF37]">
                    Total: {totalLacradoUnits} {totalLacradoUnits === 1 ? 'un.' : 'un.'} · Bat. 100%
                  </span>
                </div>

                <div className="space-y-2">
                  {colorVariants.map((variant, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 sm:gap-2">
                      <input
                        type="text"
                        autoCapitalize="words"
                        maxLength={SCHEMA_LIMITS.COLOR_MAX}
                        aria-label={`Cor ${idx + 1}`}
                        value={variant.color}
                        onChange={(e) => handleVariantColorChange(idx, e.target.value)}
                        onBlur={() => handleVariantColorBlur(idx)}
                        placeholder={idx === 0 ? 'Ex: Titânio Preto' : 'Outra cor...'}
                        className="flex-1 min-w-0 min-h-[44px] px-3 rounded-xl bg-[#09090B] border border-[#26262E] text-white placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                      />

                      <div className="flex items-center bg-[#09090B] border border-[#26262E] rounded-xl shrink-0">
                        <button
                          type="button"
                          onClick={() => handleVariantQtyChange(idx, -1, true)}
                          aria-label={`Diminuir quantidade da cor ${idx + 1}`}
                          className="min-w-[38px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-white"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={SCHEMA_LIMITS.VARIANT_QTY_MAX}
                          aria-label={`Quantidade da cor ${idx + 1}`}
                          value={variant.quantity}
                          onChange={(e) =>
                            handleVariantQtyChange(idx, Number(e.target.value) || 0, false)
                          }
                          className="w-10 text-center bg-transparent text-white font-mono-tabular text-sm font-semibold focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleVariantQtyChange(idx, 1, true)}
                          aria-label={`Aumentar quantidade da cor ${idx + 1}`}
                          className="min-w-[38px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-white"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {colorVariants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveVariantRow(idx)}
                          aria-label={`Remover cor ${idx + 1}`}
                          className="min-w-[40px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#1A1A20] hover:bg-red-950/50 text-zinc-400 hover:text-red-400 transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Quick color additions (dynamic from ArquivoApple when iPhone model matches) + Custom row button */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {(getAppleModelColorSuggestions(model).length > 0
                    ? getAppleModelColorSuggestions(model)
                    : QUICK_COLORS.map((label) => ({
                        label,
                        hex: getAppleColorHex(label, model) || undefined,
                      }))
                  ).map((qc) => (
                    <button
                      key={qc.label}
                      type="button"
                      onClick={() => handleQuickAddColor(qc.label)}
                      className="min-h-[34px] px-2.5 rounded-lg text-xs font-medium bg-[#09090B] text-zinc-300 border border-[#26262E] hover:border-[#D4AF37] hover:text-white transition-colors whitespace-nowrap inline-flex items-center gap-1.5"
                    >
                      {qc.hex && (
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-white/25 shrink-0"
                          style={{ backgroundColor: qc.hex }}
                          aria-hidden="true"
                        />
                      )}
                      <span>+ {qc.label}</span>
                    </button>
                  ))}

                  {colorVariants.length < SCHEMA_LIMITS.COLOR_VARIANTS_MAX && (
                    <button
                      type="button"
                      onClick={handleAddVariantRow}
                      className="min-h-[34px] px-2.5 rounded-lg text-xs font-semibold bg-[#1A1A20] hover:bg-[#24242C] text-[#D4AF37] flex items-center gap-1 transition-colors whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Outra cor</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="device-battery" className="block text-xs font-medium text-zinc-400">
                      Saúde Bateria (%)
                    </label>
                    <input
                      id="device-battery"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={100}
                      value={batteryHealth}
                      onChange={(e) => setBatteryHealth(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="device-color" className="block text-xs font-medium text-zinc-400">
                      Cor
                    </label>
                    <input
                      id="device-color"
                      type="text"
                      autoCapitalize="words"
                      maxLength={SCHEMA_LIMITS.COLOR_MAX}
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      onBlur={() => setColor((prev) => formatTitleName(prev))}
                      placeholder="Ex: Verde, Titânio Preto"
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                      required
                    />
                  </div>
                </div>

                {getAppleModelColorSuggestions(model).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {getAppleModelColorSuggestions(model).map((qc) => {
                      const active =
                        color.trim().toLocaleLowerCase('pt-BR') ===
                        qc.label.toLocaleLowerCase('pt-BR');
                      return (
                        <button
                          key={qc.label}
                          type="button"
                          onClick={() => setColor(qc.label)}
                          className={`min-h-[32px] px-2.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
                            active
                              ? 'bg-white text-black border-white'
                              : 'bg-[#09090B] text-zinc-300 border-[#26262E] hover:border-[#D4AF37] hover:text-white'
                          }`}
                        >
                          <span
                            className={`w-2.5 h-2.5 rounded-full border shrink-0 ${
                              active ? 'border-black/25' : 'border-white/25'
                            }`}
                            style={{ backgroundColor: qc.hex }}
                            aria-hidden="true"
                          />
                          <span>{qc.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Valor */}
            <div className="space-y-1.5">
              <label htmlFor="device-price" className="block text-xs font-medium text-zinc-400">
                Valor de Venda (R$)
              </label>
              <input
                id="device-price"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="1"
                max={SCHEMA_LIMITS.PRICE_MAX}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Ex: 5890.00"
                className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                required
              />
            </div>

            {/* IMEI / Serial com leitor */}
            <div className="space-y-1.5">
              <label htmlFor="device-imei" className="block text-xs font-medium text-zinc-400">
                IMEI / Nº de Série (opcional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="device-imei"
                  type="text"
                  maxLength={SCHEMA_LIMITS.IMEI_MAX}
                  value={imei}
                  onChange={(e) => setImei(e.target.value)}
                  onBlur={() => setImei((v) => formatImei(v))}
                  placeholder="Ex: 356985114829012"
                  className="flex-1 min-w-0 min-h-[48px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular uppercase placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                />
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  aria-label="Escanear código de barras IMEI"
                  className="min-h-[48px] px-3.5 rounded-xl bg-[#1A1A20] hover:bg-[#24242C] border border-[#26262E] text-[#D4AF37] font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                >
                  <ScanLine className="w-4 h-4 shrink-0" />
                  <span>Ler código</span>
                </button>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <label htmlFor="device-notes" className="block text-xs font-medium text-zinc-400">
                Observações (opcional)
              </label>
              <input
                id="device-notes"
                type="text"
                maxLength={SCHEMA_LIMITS.NOTES_MAX}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Caixa original, película aplicada, detalhe lateral"
                className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          <div className="px-4 sm:px-5 py-3.5 pb-safe border-t border-[#26262E] bg-[#121216] flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[48px] px-4 rounded-xl bg-[#1A1A20] hover:bg-[#24242C] text-zinc-200 font-semibold text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[1.5] min-h-[48px] px-4 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] disabled:opacity-60 text-black font-semibold text-sm transition-colors"
            >
              {saving
                ? 'Salvando...'
                : editingDevice
                  ? 'Salvar Alterações'
                  : 'Adicionar ao Estoque'}
            </button>
          </div>
        </form>
      </div>

      <BarcodeScannerSheet
        open={scannerOpen}
        title="Escanear IMEI do Aparelho"
        onDetected={(code) => setImei(code)}
        onClose={() => setScannerOpen(false)}
      />
    </div>
  );
}
