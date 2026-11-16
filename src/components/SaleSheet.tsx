import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  BookmarkCheck,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ScanLine,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  DEFAULT_INSTALLMENT_RATES,
  type DeviceItem,
  type PaymentBreakdown,
  type PaymentMethod,
  type SaleRecord,
  SCHEMA_LIMITS,
  type SinglePaymentMethod,
  type StoreSettings,
} from '../types';
import { registerSale } from '../services/storeService';
import { useAuth } from '../contexts/AuthContext';
import {
  calculateInstallment,
  formatBRL,
  formatDeviceModelName,
  formatImei,
  formatPhoneBR,
  formatStorage,
  formatTitleName,
  getAvailableColorVariants,
  PAYMENT_LABELS,
} from '../utils/formatters';
import { DeviceThumbnail } from './DeviceThumbnail';
import { getAppleColorHex, getAppleModelColorSuggestions } from '../utils/appleImages';
import { BarcodeScannerSheet } from './BarcodeScannerSheet';

interface SaleSheetProps {
  device: DeviceItem | null;
  settings: StoreSettings;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onSaleCompleted?: (sale: SaleRecord) => void;
  onError: (message: string) => void;
}

const SINGLE_PAYMENT_OPTIONS: SinglePaymentMethod[] = ['pix', 'credito', 'debito', 'dinheiro'];

function parseAmount(raw: string): number {
  const num = Number(raw.replace(',', '.'));
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.round(num * 100) / 100;
}

export function SaleSheet({
  device,
  settings,
  onClose,
  onSuccess,
  onSaleCompleted,
  onError,
}: SaleSheetProps) {
  const { profile } = useAuth();
  const defaultFirstMethod: SinglePaymentMethod = settings.defaultPaymentMethod;
  const defaultSecondMethod: SinglePaymentMethod =
    defaultFirstMethod === 'credito' ? 'pix' : 'credito';

  const [salePrice, setSalePrice] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [saleImei, setSaleImei] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(settings.defaultPaymentMethod);
  const [splitMethod1, setSplitMethod1] = useState<SinglePaymentMethod>(defaultFirstMethod);
  const [splitMethod2, setSplitMethod2] = useState<SinglePaymentMethod>(defaultSecondMethod);
  const [splitAmount1, setSplitAmount1] = useState('');
  const [splitAmount2, setSplitAmount2] = useState('');
  const [lastEditedSlot, setLastEditedSlot] = useState<1 | 2>(1);

  // Installments
  const [installments, setInstallments] = useState<number>(1);

  // Trade-In
  const [hasTradeIn, setHasTradeIn] = useState(false);
  const [tiModel, setTiModel] = useState('');
  const [tiStorageGb, setTiStorageGb] = useState<number>(128);
  const [tiBattery, setTiBattery] = useState('88');
  const [tiColor, setTiColor] = useState('');
  const [tiImei, setTiImei] = useState('');
  const [tiValue, setTiValue] = useState('');
  const [tiResalePrice, setTiResalePrice] = useState('');
  const [tiResaleTouched, setTiResaleTouched] = useState(false);

  // Customer & Warranty
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [warrantyDays, setWarrantyDays] = useState<number>(90);

  // Scanner target
  const [scannerTarget, setScannerTarget] = useState<'sale' | 'tradein' | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!device) return;
    const first = settings.defaultPaymentMethod;
    const second: SinglePaymentMethod = first === 'credito' ? 'pix' : 'credito';
    const avail = getAvailableColorVariants(device);
    const defaultReservedColor = device.reservation?.reservedColor;
    const initialColor =
      defaultReservedColor && avail.some((v) => v.color === defaultReservedColor)
        ? defaultReservedColor
        : avail[0]?.color || formatTitleName(device.color);

    setSalePrice(String(device.price));
    setSelectedColor(initialColor);
    setSaleImei(device.imei || '');
    setPaymentMethod(first);
    setSplitMethod1(first);
    setSplitMethod2(second);
    setSplitAmount1('');
    setSplitAmount2('');
    setLastEditedSlot(1);
    setInstallments(1);

    setHasTradeIn(false);
    setTiModel('');
    setTiStorageGb(128);
    setTiBattery('88');
    setTiColor('');
    setTiImei('');
    setTiValue('');
    setTiResalePrice('');
    setTiResaleTouched(false);

    setCustomerName(device.reservation?.customerName || '');
    setCustomerPhone(device.reservation?.customerPhone || '');
    setWarrantyDays(
      device.condition === 'lacrado'
        ? settings.warrantyDaysLacrado ?? 365
        : settings.warrantyDaysSeminovo ?? 90
    );
    setScannerTarget(null);
  }, [
    device,
    settings.defaultPaymentMethod,
    settings.warrantyDaysLacrado,
    settings.warrantyDaysSeminovo,
  ]);

  useEffect(() => {
    if (!device) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting && !scannerTarget) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [device, submitting, scannerTarget, onClose]);

  const canEditPrice = profile?.role === 'admin' || settings.allowSellerPriceEdit;
  const canUseTradeIn = profile?.role === 'admin' || settings.allowSellerTradeIn !== false;
  const parsedDraftPrice = device
    ? canEditPrice
      ? Number(salePrice.replace(',', '.'))
      : device.price
    : 0;
  const effectiveTotal =
    Number.isFinite(parsedDraftPrice) && parsedDraftPrice > 0
      ? Math.round(parsedDraftPrice * 100) / 100
      : 0;

  const parsedTradeInValue = hasTradeIn ? parseAmount(tiValue) : 0;
  const netCashDue = Math.max(0, Math.round((effectiveTotal - parsedTradeInValue) * 100) / 100);

  const val1 = parseAmount(splitAmount1);
  const val2 = parseAmount(splitAmount2);
  const splitSum = Math.round((val1 + val2) * 100) / 100;
  const splitRemaining = Math.round((netCashDue - splitSum) * 100) / 100;
  const hasBothPositive = val1 > 0 && val2 > 0 && splitMethod1 !== splitMethod2;
  const isSplitBalanced = hasBothPositive && Math.abs(splitRemaining) <= 0.02;

  const includesCredito =
    netCashDue > 0 &&
    (paymentMethod === 'credito' ||
      (paymentMethod === 'misto' && (splitMethod1 === 'credito' || splitMethod2 === 'credito')));

  const creditBaseAmount = useMemo(() => {
    if (paymentMethod === 'credito') return netCashDue;
    if (paymentMethod === 'misto') {
      if (splitMethod1 === 'credito') return val1;
      if (splitMethod2 === 'credito') return val2;
    }
    return 0;
  }, [paymentMethod, netCashDue, splitMethod1, splitMethod2, val1, val2]);

  const installmentPreview = useMemo(
    () =>
      calculateInstallment(
        creditBaseAmount,
        installments,
        settings.installmentRates || DEFAULT_INSTALLMENT_RATES,
        settings.passCardFeeToCustomer,
        settings.cardFeeCalculationMode || 'infinitepay_repasse'
      ),
    [
      creditBaseAmount,
      installments,
      settings.installmentRates,
      settings.passCardFeeToCustomer,
      settings.cardFeeCalculationMode,
    ]
  );

  if (!device || !profile) return null;

  const availableColors = getAvailableColorVariants(device);
  const activeColor = selectedColor || availableColors[0]?.color || formatTitleName(device.color);
  const showColorSelector =
    device.condition === 'lacrado' &&
    availableColors.length > 0 &&
    (availableColors.length > 1 || (availableColors[0]?.quantity || 0) > 1);

  const priceDelta = effectiveTotal > 0 ? effectiveTotal - device.price : 0;
  const priceDeltaPct = device.price > 0 ? Math.abs((priceDelta / device.price) * 100) : 0;

  const applyHalfSplit = (total: number) => {
    if (total <= 0) {
      setSplitAmount1('');
      setSplitAmount2('');
      return;
    }
    const firstHalf = Math.round((total / 2) * 100) / 100;
    const secondHalf = Math.round((total - firstHalf) * 100) / 100;
    setSplitAmount1(firstHalf.toFixed(2));
    setSplitAmount2(secondHalf.toFixed(2));
    setLastEditedSlot(1);
  };

  const syncMixedToTarget = (nextNetTarget: number) => {
    if (paymentMethod !== 'misto') return;
    if (nextNetTarget <= 0) {
      setSplitAmount1('');
      setSplitAmount2('');
      return;
    }
    if (lastEditedSlot === 1 && val1 > 0 && val1 < nextNetTarget) {
      setSplitAmount2((nextNetTarget - val1).toFixed(2));
    } else if (lastEditedSlot === 2 && val2 > 0 && val2 < nextNetTarget) {
      setSplitAmount1((nextNetTarget - val2).toFixed(2));
    } else if (val1 > 0 || val2 > 0) {
      applyHalfSplit(nextNetTarget);
    }
  };

  const handleSelectMixed = () => {
    setPaymentMethod('misto');
    if (val1 === 0 && val2 === 0 && netCashDue > 0) {
      applyHalfSplit(netCashDue);
    }
  };

  const handleSalePriceChange = (rawPrice: string) => {
    setSalePrice(rawPrice);
    const nextGross = parseAmount(rawPrice);
    const nextNet = Math.max(0, Math.round((nextGross - parsedTradeInValue) * 100) / 100);
    syncMixedToTarget(nextNet);
  };

  const handleTradeInValueChange = (rawVal: string) => {
    setTiValue(rawVal);
    const parsedTi = parseAmount(rawVal);
    if (!tiResaleTouched && parsedTi > 0) {
      const suggested = Math.max(100, Math.round((parsedTi * 1.25) / 10) * 10);
      setTiResalePrice(String(suggested));
    }
    const nextNet = Math.max(0, Math.round((effectiveTotal - parsedTi) * 100) / 100);
    syncMixedToTarget(nextNet);
  };

  const handleToggleTradeIn = () => {
    const next = !hasTradeIn;
    setHasTradeIn(next);
    if (!next) {
      syncMixedToTarget(effectiveTotal);
    } else if (parsedTradeInValue > 0) {
      syncMixedToTarget(Math.max(0, effectiveTotal - parsedTradeInValue));
    }
  };

  const handleApplyCardFeeToTotal = () => {
    if (!canEditPrice || paymentMethod !== 'credito') return;
    const baseNet = netCashDue;
    const { totalWithFee } = calculateInstallment(
      baseNet,
      installments,
      settings.installmentRates || DEFAULT_INSTALLMENT_RATES,
      true,
      settings.cardFeeCalculationMode || 'infinitepay_repasse'
    );
    const nextGross = Math.round((totalWithFee + parsedTradeInValue) * 100) / 100;
    setSalePrice(nextGross.toFixed(2));
  };

  const handleAmount1Change = (raw: string) => {
    setSplitAmount1(raw);
    setLastEditedSlot(1);
    const parsed = parseAmount(raw);
    if (netCashDue > 0 && parsed > 0 && parsed < netCashDue) {
      const rem = Math.round((netCashDue - parsed) * 100) / 100;
      setSplitAmount2(rem.toFixed(2));
    } else if (raw.trim() === '' || parsed >= netCashDue) {
      setSplitAmount2('');
    }
  };

  const handleAmount2Change = (raw: string) => {
    setSplitAmount2(raw);
    setLastEditedSlot(2);
    const parsed = parseAmount(raw);
    if (netCashDue > 0 && parsed > 0 && parsed < netCashDue) {
      const rem = Math.round((netCashDue - parsed) * 100) / 100;
      setSplitAmount1(rem.toFixed(2));
    } else if (raw.trim() === '' || parsed >= netCashDue) {
      setSplitAmount1('');
    }
  };

  const handleMethod1Change = (nextMethod: SinglePaymentMethod) => {
    if (nextMethod === splitMethod2) {
      setSplitMethod2(splitMethod1);
    }
    setSplitMethod1(nextMethod);
  };

  const handleMethod2Change = (nextMethod: SinglePaymentMethod) => {
    if (nextMethod === splitMethod1) {
      setSplitMethod1(splitMethod2);
    }
    setSplitMethod2(nextMethod);
  };

  const handleConfirmSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isFinite(effectiveTotal) || effectiveTotal <= 0) {
      onError('Informe um valor final de venda válido.');
      return;
    }

    if (hasTradeIn) {
      const cleanTiModel = formatDeviceModelName(tiModel);
      const cleanTiColor = formatTitleName(tiColor);
      const parsedTiBat = Number(tiBattery);
      const parsedResale = parseAmount(tiResalePrice);
      if (cleanTiModel.length < 2 || cleanTiColor.length < 2) {
        onError('Informe modelo e cor do aparelho recebido na troca.');
        return;
      }
      if (!Number.isInteger(parsedTiBat) || parsedTiBat < 1 || parsedTiBat > 100) {
        onError('Informe a saúde da bateria (1-100%) do aparelho na troca.');
        return;
      }
      if (parsedTradeInValue <= 0 || parsedTradeInValue > effectiveTotal) {
        onError('O valor abatido na troca deve ser maior que zero e até o valor da venda.');
        return;
      }
      if (parsedResale <= 0) {
        onError('Informe o preço de revenda do aparelho recebido na troca.');
        return;
      }
    }

    let paymentBreakdown: PaymentBreakdown | undefined;
    if (netCashDue > 0 && paymentMethod === 'misto') {
      if (splitMethod1 === splitMethod2) {
        onError('Selecione duas formas de pagamento diferentes.');
        return;
      }
      if (val1 <= 0 || val2 <= 0) {
        onError('Informe valores maiores que zero para as duas formas de pagamento.');
        return;
      }
      if (Math.abs(splitRemaining) > 0.02) {
        onError(
          splitRemaining > 0
            ? `Ainda faltam ${formatBRL(splitRemaining)} para completar o valor restante.`
            : `O total informado excede o valor restante em ${formatBRL(Math.abs(splitRemaining))}.`
        );
        return;
      }
      paymentBreakdown = {
        pix: 0,
        credito: 0,
        debito: 0,
        dinheiro: 0,
      };
      paymentBreakdown[splitMethod1] = val1;
      paymentBreakdown[splitMethod2] = val2;
    }

    if (settings.requireCustomerOnSale && !customerName.trim()) {
      onError('Informe o nome do cliente para concluir a venda.');
      return;
    }

    if (settings.requireCustomerPhoneOnSale && customerPhone.replace(/\D/g, '').length < 10) {
      onError('Informe o WhatsApp do cliente para concluir a venda.');
      return;
    }

    setSubmitting(true);
    try {
      const formattedCustomer = formatTitleName(customerName);
      const formattedPhone = formatPhoneBR(customerPhone);
      const effectiveMethod: PaymentMethod = netCashDue === 0 ? 'dinheiro' : paymentMethod;

      const createdSale = await registerSale(
        {
          device,
          selectedColor: activeColor,
          imei: formatImei(saleImei),
          salePrice: effectiveTotal,
          paymentMethod: effectiveMethod,
          ...(paymentBreakdown ? { paymentBreakdown } : {}),
          ...(includesCredito
            ? {
                installments,
                cardFeePercent: installmentPreview.ratePercent,
              }
            : {}),
          warrantyDays,
          ...(hasTradeIn
            ? {
                tradeIn: {
                  model: formatDeviceModelName(tiModel),
                  storageGb: tiStorageGb,
                  batteryHealth: Number(tiBattery),
                  color: formatTitleName(tiColor),
                  imei: formatImei(tiImei),
                  tradeInValue: parsedTradeInValue,
                  resalePrice: parseAmount(tiResalePrice),
                },
              }
            : {}),
          customerName: formattedCustomer,
          customerPhone: formattedPhone,
        },
        {
          uid: profile.uid,
          displayName: profile.displayName,
          role: profile.role,
        }
      );

      onSuccess(
        `Venda de ${formatDeviceModelName(device.model)} (${activeColor}) registrada!`
      );
      onClose();
      onSaleCompleted?.(createdSale);
    } catch {
      onError('Não foi possível registrar a venda. Verifique se o aparelho ainda está disponível.');
    } finally {
      setSubmitting(false);
    }
  };

  const tiColorSuggestions = getAppleModelColorSuggestions(tiModel);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sale-sheet-title"
    >
      <div className="w-full sm:max-w-lg bg-[#121216] border-t sm:border border-[#26262E] rounded-t-3xl sm:rounded-2xl max-h-[92dvh] flex flex-col overflow-hidden">
        <div className="sm:hidden w-10 h-1.5 bg-zinc-700 rounded-full mx-auto mt-3 shrink-0" />

        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[#26262E] shrink-0">
          <h2 id="sale-sheet-title" className="font-display text-lg font-bold text-white">
            Registrar Venda
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center text-zinc-400 hover:text-white rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirmSale} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-4">
            {/* Device Summary */}
            <div className="pb-3.5 border-b border-[#202028] flex items-center gap-3">
              <DeviceThumbnail model={device.model} color={activeColor} size="md" />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display font-semibold text-white text-base truncate">
                    {formatDeviceModelName(device.model)}
                  </span>
                  <span className="font-mono-tabular text-sm font-semibold text-[#D4AF37] whitespace-nowrap shrink-0">
                    {formatBRL(device.price)}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-mono-tabular">
                  {formatStorage(device.storageGb)} ·{' '}
                  <span className="font-sans text-zinc-200">{activeColor}</span> · Bat.{' '}
                  {device.batteryHealth}% ·{' '}
                  <span className="font-sans">
                    {device.condition === 'lacrado' ? 'Lacrado' : 'Seminovo'}
                  </span>
                </p>
              </div>
            </div>

            {device.status === 'reservado' && device.reservation && (
              <div className="rounded-xl bg-[#1A1710] border border-[#D4AF37]/40 px-3.5 py-2.5 flex items-start gap-2.5 text-xs">
                <BookmarkCheck className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <div className="space-y-0.5 min-w-0">
                  <p className="font-semibold text-white">
                    Reservado para {device.reservation.customerName}
                  </p>
                  {device.reservation.depositAmount !== undefined &&
                    device.reservation.depositAmount > 0 && (
                      <p className="text-[#D4AF37] font-mono-tabular">
                        Sinal já recebido: {formatBRL(device.reservation.depositAmount)}
                      </p>
                    )}
                </div>
              </div>
            )}

            {showColorSelector && (
              <div className="space-y-2">
                <span className="block text-xs font-medium text-zinc-400">
                  Cor vendida (estoque lacrado)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {availableColors.map((variant) => {
                    const isSelected = activeColor === variant.color;
                    const swatchHex = getAppleColorHex(variant.color, device.model);
                    return (
                      <button
                        key={variant.color}
                        type="button"
                        onClick={() => setSelectedColor(variant.color)}
                        className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                            : 'bg-[#09090B] text-zinc-300 border-[#26262E] hover:border-zinc-500'
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5 min-w-0">
                          {swatchHex && (
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 border ${
                                isSelected ? 'border-black/30' : 'border-white/25'
                              }`}
                              style={{ backgroundColor: swatchHex }}
                              aria-hidden="true"
                            />
                          )}
                          <span className="truncate">{variant.color}</span>
                        </span>
                        <span
                          className={`font-mono-tabular shrink-0 ${
                            isSelected ? 'text-black/80' : 'text-zinc-500'
                          }`}
                        >
                          {variant.quantity} un.
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sold IMEI with Camera Scanner */}
            <div className="space-y-1.5">
              <label htmlFor="sale-imei" className="block text-xs font-medium text-zinc-400">
                IMEI / Serial vendido (para comprovante e garantia)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="sale-imei"
                  type="text"
                  maxLength={SCHEMA_LIMITS.IMEI_MAX}
                  value={saleImei}
                  onChange={(e) => setSaleImei(e.target.value)}
                  onBlur={() => setSaleImei((v) => formatImei(v))}
                  placeholder="Opcional · leia na caixa ou *#06#"
                  className="flex-1 min-w-0 min-h-[44px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular uppercase placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                />
                <button
                  type="button"
                  onClick={() => setScannerTarget('sale')}
                  aria-label="Escanear IMEI vendido"
                  className="min-h-[44px] px-3 rounded-xl bg-[#1A1A20] hover:bg-[#24242C] border border-[#26262E] text-[#D4AF37] font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <ScanLine className="w-4 h-4" />
                  <span>Ler</span>
                </button>
              </div>
            </div>

            {/* Final Sale Price */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="sale-price" className="block text-xs font-medium text-zinc-400">
                  Valor Final da Venda (R$)
                </label>
                {!canEditPrice && (
                  <span className="text-[11px] text-zinc-500">Preço fixado</span>
                )}
              </div>
              <input
                id="sale-price"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="1"
                max={SCHEMA_LIMITS.PRICE_MAX}
                disabled={!canEditPrice}
                value={canEditPrice ? salePrice : String(device.price)}
                onChange={(e) => handleSalePriceChange(e.target.value)}
                className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular text-base font-semibold focus:outline-none focus:border-[#D4AF37] disabled:opacity-65"
                required
              />
              {canEditPrice && Math.abs(priceDelta) >= 0.01 && (
                <p
                  className={`text-xs font-mono-tabular ${
                    priceDelta < 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {priceDelta < 0
                    ? `Desconto de ${formatBRL(Math.abs(priceDelta))} (-${priceDeltaPct.toFixed(1)}%)`
                    : `Acréscimo de ${formatBRL(priceDelta)} (+${priceDeltaPct.toFixed(1)}%)`}
                </p>
              )}
            </div>

            {/* Trade-In Toggle & Panel */}
            {canUseTradeIn && (
            <div className="rounded-2xl bg-[#09090B] border border-[#26262E] p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ArrowLeftRight className="w-4 h-4 text-[#D4AF37] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white">Aparelho na Troca</p>
                    <p className="text-[11px] text-zinc-400">
                      Abate do valor e entra automático nos seminovos
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={hasTradeIn}
                  onClick={handleToggleTradeIn}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${
                    hasTradeIn
                      ? 'bg-[#D4AF37] border-[#D4AF37]'
                      : 'bg-[#121216] border-[#2E2E38]'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full transition-transform ${
                      hasTradeIn ? 'translate-x-6 bg-black' : 'translate-x-1 bg-zinc-400'
                    }`}
                  />
                </button>
              </div>

              {hasTradeIn && (
                <div className="pt-3 border-t border-[#202028] space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label htmlFor="ti-model" className="block text-[11px] text-zinc-400">
                        Modelo recebido
                      </label>
                      <input
                        id="ti-model"
                        type="text"
                        autoCapitalize="words"
                        maxLength={SCHEMA_LIMITS.MODEL_MAX}
                        value={tiModel}
                        onChange={(e) => setTiModel(e.target.value)}
                        onBlur={() => setTiModel((v) => formatDeviceModelName(v))}
                        placeholder="Ex: iPhone 13"
                        className="w-full min-h-[42px] px-3 rounded-xl bg-[#121216] border border-[#26262E] text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="ti-color" className="block text-[11px] text-zinc-400">
                        Cor
                      </label>
                      <input
                        id="ti-color"
                        type="text"
                        autoCapitalize="words"
                        maxLength={SCHEMA_LIMITS.COLOR_MAX}
                        value={tiColor}
                        onChange={(e) => setTiColor(e.target.value)}
                        onBlur={() => setTiColor((v) => formatTitleName(v))}
                        placeholder="Ex: Preto"
                        className="w-full min-h-[42px] px-3 rounded-xl bg-[#121216] border border-[#26262E] text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>

                  {tiColorSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tiColorSuggestions.map((qc) => (
                        <button
                          key={qc.label}
                          type="button"
                          onClick={() => setTiColor(qc.label)}
                          className={`min-h-[30px] px-2 rounded-lg text-[11px] border inline-flex items-center gap-1 ${
                            tiColor.toLocaleLowerCase('pt-BR') === qc.label.toLocaleLowerCase('pt-BR')
                              ? 'bg-white text-black border-white font-semibold'
                              : 'bg-[#121216] text-zinc-300 border-[#26262E]'
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full border border-white/25"
                            style={{ backgroundColor: qc.hex }}
                            aria-hidden="true"
                          />
                          <span>{qc.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-5 gap-1">
                    {SCHEMA_LIMITS.STORAGE_OPTIONS.map((gb) => (
                      <button
                        key={gb}
                        type="button"
                        onClick={() => setTiStorageGb(gb)}
                        className={`min-h-[36px] rounded-lg text-[11px] font-mono-tabular font-semibold border ${
                          tiStorageGb === gb
                            ? 'bg-white text-black border-white'
                            : 'bg-[#121216] text-zinc-300 border-[#26262E]'
                        }`}
                      >
                        {formatStorage(gb)}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label htmlFor="ti-bat" className="block text-[11px] text-zinc-400">
                        Bateria (%)
                      </label>
                      <input
                        id="ti-bat"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={100}
                        value={tiBattery}
                        onChange={(e) => setTiBattery(e.target.value)}
                        className="w-full min-h-[42px] px-2.5 rounded-xl bg-[#121216] border border-[#26262E] text-white font-mono-tabular text-sm focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="ti-val" className="block text-[11px] text-zinc-400">
                        Valor Troca (R$)
                      </label>
                      <input
                        id="ti-val"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="1"
                        max={effectiveTotal || SCHEMA_LIMITS.PRICE_MAX}
                        value={tiValue}
                        onChange={(e) => handleTradeInValueChange(e.target.value)}
                        placeholder="2200"
                        className="w-full min-h-[42px] px-2.5 rounded-xl bg-[#121216] border border-[#26262E] text-emerald-400 font-mono-tabular font-semibold text-sm focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="ti-resale" className="block text-[11px] text-zinc-400">
                        Revenda (R$)
                      </label>
                      <input
                        id="ti-resale"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="1"
                        max={SCHEMA_LIMITS.PRICE_MAX}
                        value={tiResalePrice}
                        onChange={(e) => {
                          setTiResaleTouched(true);
                          setTiResalePrice(e.target.value);
                        }}
                        placeholder="2800"
                        className="w-full min-h-[42px] px-2.5 rounded-xl bg-[#121216] border border-[#26262E] text-[#D4AF37] font-mono-tabular font-semibold text-sm focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="ti-imei"
                      type="text"
                      maxLength={SCHEMA_LIMITS.IMEI_MAX}
                      value={tiImei}
                      onChange={(e) => setTiImei(e.target.value)}
                      onBlur={() => setTiImei((v) => formatImei(v))}
                      placeholder="IMEI do aparelho recebido (opcional)"
                      className="flex-1 min-w-0 min-h-[40px] px-3 rounded-xl bg-[#121216] border border-[#26262E] text-white font-mono-tabular uppercase placeholder:text-zinc-600 text-xs focus:outline-none focus:border-[#D4AF37]"
                    />
                    <button
                      type="button"
                      onClick={() => setScannerTarget('tradein')}
                      aria-label="Escanear IMEI da troca"
                      className="min-h-[40px] px-3 rounded-xl bg-[#1A1A20] border border-[#26262E] text-[#D4AF37] text-xs font-semibold flex items-center gap-1 shrink-0"
                    >
                      <ScanLine className="w-3.5 h-3.5" />
                      <span>Ler</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-[#1D1D24] flex items-center justify-between text-xs font-mono-tabular">
                    <span className="text-zinc-400">Restante a pagar</span>
                    <span className="text-base font-bold text-white">
                      {formatBRL(netCashDue)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Payment Method (only when netCashDue > 0) */}
            {netCashDue > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="block text-xs font-medium text-zinc-400">
                    Forma de Pagamento {hasTradeIn ? `(diferença ${formatBRL(netCashDue)})` : ''}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SINGLE_PAYMENT_OPTIONS.map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
                        paymentMethod === method
                          ? 'bg-white text-black border-white'
                          : 'bg-[#09090B] text-zinc-300 border-[#26262E] hover:border-zinc-500'
                      }`}
                    >
                      {PAYMENT_LABELS[method]}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={handleSelectMixed}
                    className={`col-span-2 min-h-[44px] px-3 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
                      paymentMethod === 'misto'
                        ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                        : 'bg-[#09090B] text-zinc-200 border-[#26262E] hover:border-zinc-500'
                    }`}
                  >
                    Pagamento Misto (até 2 formas)
                  </button>
                </div>

                {/* Quick Store Pix Key Helper */}
                {settings.storePixKey?.trim() &&
                  (paymentMethod === 'pix' ||
                    (paymentMethod === 'misto' &&
                      (splitMethod1 === 'pix' || splitMethod2 === 'pix'))) && (
                    <div className="rounded-xl bg-[#09090B] border border-[#26262E] px-3 py-2 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <span className="text-[11px] text-zinc-400 block">Chave Pix da Loja</span>
                        <span className="font-mono-tabular font-semibold text-[#D4AF37] truncate block">
                          {settings.storePixKey}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(settings.storePixKey!.trim());
                            setCopiedPix(true);
                            setTimeout(() => setCopiedPix(false), 1800);
                          } catch {
                            onError('Não foi possível copiar a Chave Pix.');
                          }
                        }}
                        className="min-h-[34px] px-2.5 rounded-lg bg-[#1A1A20] hover:bg-[#24242C] text-white font-semibold inline-flex items-center gap-1 shrink-0"
                      >
                        {copiedPix ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />
                        )}
                        <span>{copiedPix ? 'Copiada' : 'Copiar Pix'}</span>
                      </button>
                    </div>
                  )}

                {/* Mixed Payment Split */}
                {paymentMethod === 'misto' && (
                  <div className="pt-3 mt-2 border-t border-[#202028] space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-zinc-300">
                        Dividir em 2 pagamentos
                      </span>
                      <button
                        type="button"
                        onClick={() => applyHalfSplit(netCashDue)}
                        className="min-h-[36px] px-2.5 rounded-lg bg-[#1A1A20] hover:bg-[#24242C] text-[#D4AF37] text-xs font-semibold whitespace-nowrap transition-colors"
                      >
                        Dividir 50% / 50%
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-[1fr_124px] gap-2 items-center">
                        <select
                          id="split-method-1"
                          aria-label="1º método de pagamento"
                          value={splitMethod1}
                          onChange={(e) => handleMethod1Change(e.target.value as SinglePaymentMethod)}
                          className="w-full min-h-[44px] px-2.5 sm:px-3 rounded-xl bg-[#09090B] border border-[#26262E] text-white text-base sm:text-sm font-medium focus:outline-none focus:border-[#D4AF37]"
                        >
                          {SINGLE_PAYMENT_OPTIONS.map((m) => (
                            <option key={m} value={m}>
                              1º · {PAYMENT_LABELS[m]}
                            </option>
                          ))}
                        </select>
                        <input
                          id="split-amount-1"
                          aria-label="Valor do 1º pagamento"
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          max={SCHEMA_LIMITS.PRICE_MAX}
                          value={splitAmount1}
                          onChange={(e) => handleAmount1Change(e.target.value)}
                          placeholder="0,00"
                          className="w-full min-h-[44px] px-3 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular placeholder:text-zinc-600 text-base sm:text-sm text-right focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>

                      <div className="grid grid-cols-[1fr_124px] gap-2 items-center">
                        <select
                          id="split-method-2"
                          aria-label="2º método de pagamento"
                          value={splitMethod2}
                          onChange={(e) => handleMethod2Change(e.target.value as SinglePaymentMethod)}
                          className="w-full min-h-[44px] px-2.5 sm:px-3 rounded-xl bg-[#09090B] border border-[#26262E] text-white text-base sm:text-sm font-medium focus:outline-none focus:border-[#D4AF37]"
                        >
                          {SINGLE_PAYMENT_OPTIONS.map((m) => (
                            <option key={m} value={m}>
                              2º · {PAYMENT_LABELS[m]}
                            </option>
                          ))}
                        </select>
                        <input
                          id="split-amount-2"
                          aria-label="Valor do 2º pagamento"
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          max={SCHEMA_LIMITS.PRICE_MAX}
                          value={splitAmount2}
                          onChange={(e) => handleAmount2Change(e.target.value)}
                          placeholder="0,00"
                          className="w-full min-h-[44px] px-3 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular placeholder:text-zinc-600 text-base sm:text-sm text-right focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs pt-0.5">
                      <span className="text-zinc-400 font-mono-tabular">
                        Soma: <span className="text-zinc-200">{formatBRL(splitSum)}</span>
                      </span>
                      <span
                        className={`font-mono-tabular font-semibold whitespace-nowrap ${
                          isSplitBalanced
                            ? 'text-emerald-400'
                            : splitRemaining < -0.02
                              ? 'text-red-400'
                              : 'text-amber-400'
                        }`}
                      >
                        {isSplitBalanced
                          ? 'Total conferido (100%)'
                          : !hasBothPositive && Math.abs(splitRemaining) <= 0.02
                            ? 'Preencha os 2 valores'
                            : splitRemaining > 0
                              ? `Restante: ${formatBRL(splitRemaining)}`
                              : `Excedente: ${formatBRL(Math.abs(splitRemaining))}`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Installments Simulator & Selector when Credit Card is involved */}
                {includesCredito && creditBaseAmount > 0 && (
                  <div className="rounded-xl bg-[#09090B] border border-[#26262E] p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                        <CreditCard className="w-3.5 h-3.5 text-[#D4AF37]" />
                        Parcelamento no Crédito
                      </span>
                      <span className="font-mono-tabular text-[11px] text-zinc-400">
                        Taxa {installmentPreview.ratePercent.toFixed(2)}%
                      </span>
                    </div>

                    <div className="grid grid-cols-6 gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setInstallments(n)}
                          className={`min-h-[34px] rounded-lg text-xs font-mono-tabular font-semibold border transition-colors ${
                            installments === n
                              ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                              : 'bg-[#121216] text-zinc-300 border-[#26262E] hover:border-zinc-500'
                          }`}
                        >
                          {n}x
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                      <span className="font-mono-tabular text-white font-semibold">
                        {installments}x de {formatBRL(installmentPreview.installmentValue)}
                        <span className="text-zinc-400 font-normal">
                          {' '}
                          (Total {formatBRL(installmentPreview.totalWithFee)})
                        </span>
                      </span>

                      {canEditPrice &&
                        paymentMethod === 'credito' &&
                        settings.passCardFeeToCustomer &&
                        installmentPreview.ratePercent > 0 &&
                        Math.abs(installmentPreview.totalWithFee - netCashDue) > 0.05 && (
                          <button
                            type="button"
                            onClick={handleApplyCardFeeToTotal}
                            className="min-h-[32px] px-2.5 rounded-lg bg-[#1A1A20] hover:bg-[#24242C] text-[#D4AF37] text-[11px] font-semibold whitespace-nowrap"
                          >
                            Aplicar c/ taxa no valor
                          </button>
                        )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl bg-emerald-950/30 border border-emerald-800/50 px-3.5 py-2.5 text-xs text-emerald-300 font-medium">
                Valor quitado integralmente pela troca (sem saldo em dinheiro/cartão).
              </div>
            )}

            {/* Customer Name, WhatsApp Phone & Warranty */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="sale-customer" className="block text-xs font-medium text-zinc-400">
                  Nome do Cliente ({settings.requireCustomerOnSale ? 'obrigatório' : 'opcional'})
                </label>
                <input
                  id="sale-customer"
                  type="text"
                  autoCapitalize="words"
                  maxLength={SCHEMA_LIMITS.CUSTOMER_MAX}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  onBlur={() => setCustomerName((prev) => formatTitleName(prev))}
                  placeholder="Ex: Maria Oliveira"
                  required={settings.requireCustomerOnSale}
                  className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="sale-phone" className="block text-xs font-medium text-zinc-400">
                  WhatsApp do Cliente ({settings.requireCustomerPhoneOnSale ? 'obrigatório' : 'opcional'})
                </label>
                <input
                  id="sale-phone"
                  type="tel"
                  inputMode="tel"
                  maxLength={SCHEMA_LIMITS.PHONE_MAX}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  onBlur={() => setCustomerPhone((prev) => formatPhoneBR(prev))}
                  placeholder="(11) 99999-9999"
                  required={Boolean(settings.requireCustomerPhoneOnSale)}
                  className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1 text-xs">
              <span className="inline-flex items-center gap-1.5 text-zinc-400">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                Garantia emitida (dias)
              </span>
              <input
                aria-label="Dias de garantia"
                type="number"
                inputMode="numeric"
                min={0}
                max={SCHEMA_LIMITS.WARRANTY_DAYS_MAX}
                value={warrantyDays}
                onChange={(e) =>
                  setWarrantyDays(
                    Math.max(0, Math.min(SCHEMA_LIMITS.WARRANTY_DAYS_MAX, Number(e.target.value) || 0))
                  )
                }
                className="w-20 min-h-[36px] px-2.5 rounded-lg bg-[#09090B] border border-[#26262E] text-white font-mono-tabular text-center font-semibold focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="text-xs text-zinc-400 flex items-center justify-between pt-1">
              <span>Vendedor responsável</span>
              <span className="text-white font-medium">{profile.displayName}</span>
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
              disabled={submitting}
              className="flex-[1.5] min-h-[48px] px-4 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] disabled:opacity-60 text-black font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? 'Registrando...' : 'Confirmar Venda'}
            </button>
          </div>
        </form>
      </div>

      <BarcodeScannerSheet
        open={scannerTarget !== null}
        title={scannerTarget === 'tradein' ? 'Escanear IMEI da Troca' : 'Escanear IMEI Vendido'}
        onDetected={(code) => {
          if (scannerTarget === 'tradein') {
            setTiImei(code);
          } else {
            setSaleImei(code);
          }
        }}
        onClose={() => setScannerTarget(null)}
      />
    </div>
  );
}
