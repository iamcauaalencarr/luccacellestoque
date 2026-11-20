import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Bookmark,
  Calculator,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  ShoppingBag,
  X,
} from 'lucide-react';
import {
  DEFAULT_INSTALLMENT_RATES,
  type DeviceItem,
  SCHEMA_LIMITS,
  type StoreSettings,
} from '../types';
import {
  buildWhatsAppUrl,
  calculateInstallment,
  formatBRL,
  formatDeviceModelName,
  formatPhoneBR,
  formatStorage,
  formatTitleName,
  getAvailableColorVariants,
  getCardBrandRates,
} from '../utils/formatters';
import { DeviceThumbnail } from './DeviceThumbnail';
import { getAppleColorHex } from '../utils/appleImages';

interface SaleSimulatorSheetProps {
  open: boolean;
  initialDevice: DeviceItem | null;
  devices: DeviceItem[];
  settings: StoreSettings;
  canReserve?: boolean;
  onClose: () => void;
  onProceedToSell?: (device: DeviceItem) => void;
  onProceedToReserve?: (device: DeviceItem) => void;
  onNotify: (type: 'success' | 'error' | 'info', text: string) => void;
}

function parseAmount(raw: string): number {
  const num = Number(raw.replace(',', '.'));
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.round(num * 100) / 100;
}

export function SaleSimulatorSheet({
  open,
  initialDevice,
  devices,
  settings,
  canReserve = true,
  onClose,
  onProceedToSell,
  onProceedToReserve,
  onNotify,
}: SaleSimulatorSheetProps) {
  const availableDevices = useMemo(
    () => devices.filter((d) => d.status === 'disponivel'),
    [devices]
  );

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('custom');
  const [customModel, setCustomModel] = useState('iPhone 15 Pro');
  const [customStorageGb, setCustomStorageGb] = useState<number>(256);
  const [customCondition, setCustomCondition] = useState<'lacrado' | 'seminovo'>('lacrado');
  const [selectedColor, setSelectedColor] = useState('');
  const [devicePriceInput, setDevicePriceInput] = useState('5500');

  // Trade-in toggle & fields ("pegando o dele ou sem pegar")
  const [withTradeIn, setWithTradeIn] = useState(false);
  const [tradeInModel, setTradeInModel] = useState('');
  const [tradeInStorageGb, setTradeInStorageGb] = useState<number>(128);
  const [tradeInValueInput, setTradeInValueInput] = useState('');

  // Optional Pix/cash down payment
  const [downPaymentInput, setDownPaymentInput] = useState('');

  // Installment & rate options
  const [selectedInstallment, setSelectedInstallment] = useState<number>(12);
  const [applyCardFee, setApplyCardFee] = useState<boolean>(settings.passCardFeeToCustomer);
  const [cardBrand, setCardBrand] = useState<'visa' | 'elo'>('visa');
  const [includeFullTableInQuote, setIncludeFullTableInQuote] = useState<boolean>(false);

  // Customer info (optional for personalized WhatsApp quote)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const targetDevice =
      initialDevice || (availableDevices.length > 0 ? availableDevices[0] : null);

    if (targetDevice) {
      const avail = getAvailableColorVariants(targetDevice);
      setSelectedDeviceId(targetDevice.id);
      setSelectedColor(avail[0]?.color || formatTitleName(targetDevice.color));
      setDevicePriceInput(String(targetDevice.price));
    } else {
      setSelectedDeviceId('custom');
      setCustomModel('iPhone 15 Pro');
      setCustomStorageGb(256);
      setCustomCondition('lacrado');
      setSelectedColor('Titânio Natural');
      setDevicePriceInput('5500');
    }

    setWithTradeIn(false);
    setTradeInModel('');
    setTradeInStorageGb(128);
    setTradeInValueInput('');
    setDownPaymentInput('');
    setSelectedInstallment(12);
    setApplyCardFee(settings.passCardFeeToCustomer);
    setIncludeFullTableInQuote(false);
    setCustomerName('');
    setCustomerPhone('');
    setCopied(false);
  }, [open, initialDevice, availableDevices, settings.passCardFeeToCustomer]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const selectedDevice = useMemo(
    () => availableDevices.find((d) => d.id === selectedDeviceId) || null,
    [availableDevices, selectedDeviceId]
  );

  const handleSelectDevice = (id: string) => {
    setSelectedDeviceId(id);
    if (id === 'custom') return;
    const found = availableDevices.find((d) => d.id === id);
    if (found) {
      const avail = getAvailableColorVariants(found);
      setSelectedColor(avail[0]?.color || formatTitleName(found.color));
      setDevicePriceInput(String(found.price));
    }
  };

  const grossPrice = parseAmount(devicePriceInput);
  const tradeInValue = withTradeIn ? Math.min(grossPrice, parseAmount(tradeInValueInput)) : 0;
  const afterTradeIn = Math.max(0, Math.round((grossPrice - tradeInValue) * 100) / 100);
  const downPayment = Math.min(afterTradeIn, parseAmount(downPaymentInput));
  const financedBalance = Math.max(0, Math.round((afterTradeIn - downPayment) * 100) / 100);

  const rates = useMemo(
    () => getCardBrandRates(settings.installmentRates, cardBrand),
    [settings.installmentRates, cardBrand]
  );
  const calcMode = settings.cardFeeCalculationMode || 'infinitepay_repasse';

  const installmentRows = useMemo(() => {
    return Array.from({ length: 12 }, (_, idx) => {
      const count = idx + 1;
      return calculateInstallment(financedBalance, count, rates, applyCardFee, calcMode);
    });
  }, [financedBalance, rates, applyCardFee, calcMode]);

  if (!open) return null;

  const displayModel = selectedDevice
    ? formatDeviceModelName(selectedDevice.model)
    : formatDeviceModelName(customModel || 'iPhone');
  const displayStorage = selectedDevice ? selectedDevice.storageGb : customStorageGb;
  const displayCondition = selectedDevice ? selectedDevice.condition : customCondition;
  const availColors = selectedDevice ? getAvailableColorVariants(selectedDevice) : [];
  const activeColor =
    selectedColor ||
    availColors[0]?.color ||
    (selectedDevice ? formatTitleName(selectedDevice.color) : 'Preto');

  const chosenInstallment = installmentRows[selectedInstallment - 1] || installmentRows[11];

  const buildSimulationQuote = () => {
    const store = formatTitleName(settings.storeName || 'Lucca Cell');
    const cleanCustomer = customerName.trim() ? formatTitleName(customerName) : '';
    const condLabel =
      displayCondition === 'lacrado'
        ? 'Lacrado'
        : selectedDevice
          ? `Seminovo · Bat. ${selectedDevice.batteryHealth}%`
          : 'Seminovo';

    const lines: (string | null)[] = [
      `*SIMULAÇÃO DE COMPRA · ${store.toUpperCase()}*`,
      cleanCustomer ? `Olá, *${cleanCustomer}*! Segue a simulação personalizada:` : `Segue a simulação personalizada:`,
      ``,
      `*Aparelho:* ${displayModel} ${formatStorage(displayStorage)} (${activeColor} · ${condLabel})`,
      `*Valor do aparelho:* ${formatBRL(grossPrice)}`,
      withTradeIn && tradeInValue > 0
        ? `*Seu aparelho na troca:* ${formatDeviceModelName(tradeInModel || 'Aparelho usado')} ${formatStorage(tradeInStorageGb)} (-${formatBRL(tradeInValue)})`
        : null,
      downPayment > 0 ? `*Entrada (Pix/Dinheiro):* -${formatBRL(downPayment)}` : null,
      ``,
      afterTradeIn > 0
        ? `*À vista (Pix/Dinheiro):* *${formatBRL(afterTradeIn)}*`
        : `*Quitado integralmente com o aparelho na troca!*`,
    ];

    if (financedBalance > 0) {
      const brandLabel = cardBrand === 'elo' ? 'Elo' : 'Visa/Mastercard';
      if (includeFullTableInQuote) {
        lines.push('', `*Simulação no Cartão de Crédito (${brandLabel} - ${formatBRL(financedBalance)}):*`);
        for (const row of installmentRows) {
          lines.push(
            `• ${row.count}x de *${formatBRL(row.installmentValue)}* (Total ${formatBRL(row.totalWithFee)})`
          );
        }
      } else {
        const p3 = installmentRows[2];
        const p6 = installmentRows[5];
        const p10 = installmentRows[9];
        const p12 = installmentRows[11];
        lines.push(
          '',
          `*No Cartão de Crédito (${brandLabel}${downPayment > 0 ? ' · saldo restante' : ''}):*`,
          selectedInstallment !== 12
            ? `• *${chosenInstallment.count}x de ${formatBRL(chosenInstallment.installmentValue)}* (Total ${formatBRL(chosenInstallment.totalWithFee)})`
            : null,
          `• 3x de ${formatBRL(p3.installmentValue)}`,
          `• 6x de ${formatBRL(p6.installmentValue)}`,
          `• 10x de ${formatBRL(p10.installmentValue)}`,
          `• *12x de ${formatBRL(p12.installmentValue)}* (Total ${formatBRL(p12.totalWithFee)})`
        );
      }
    }

    if (settings.storePhone.trim() || settings.storeAddress?.trim()) {
      lines.push('');
      if (settings.storePhone.trim()) lines.push(`WhatsApp: ${settings.storePhone.trim()}`);
      if (settings.storeAddress?.trim()) lines.push(`Endereço: ${settings.storeAddress.trim()}`);
    }

    return lines.filter((l) => l !== null).join('\n');
  };

  const quoteText = buildSimulationQuote();
  const whatsappUrl = buildWhatsAppUrl(customerPhone, quoteText);

  const handleCopyQuote = async () => {
    if (grossPrice <= 0) {
      onNotify('error', 'Informe o valor do aparelho para gerar a simulação.');
      return;
    }
    try {
      await navigator.clipboard.writeText(quoteText);
      setCopied(true);
      onNotify('success', 'Simulação copiada! Cole no WhatsApp do cliente.');
      setTimeout(() => setCopied(false), 2200);
    } catch {
      onNotify('error', 'Não foi possível copiar automaticamente.');
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="simulator-title"
    >
      <div className="w-full sm:max-w-2xl bg-[#121216] border-t sm:border border-[#26262E] rounded-t-3xl sm:rounded-2xl max-h-[92dvh] flex flex-col overflow-hidden">
        <div className="sm:hidden w-10 h-1.5 bg-zinc-700 rounded-full mx-auto mt-3 shrink-0" />

        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[#26262E] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Calculator className="w-5 h-5 text-[#D4AF37] shrink-0" />
            <div className="min-w-0">
              <h2 id="simulator-title" className="font-display text-base sm:text-lg font-bold text-white truncate">
                Simulador de Venda (até 12x)
              </h2>
              <p className="text-[11px] text-zinc-400 truncate">
                Calcule à vista ou parcelado, com ou sem aparelho na troca
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar simulador"
            className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center text-zinc-400 hover:text-white rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-4">
          {/* 1. Aparelho Simulado */}
          <div className="rounded-2xl bg-[#09090B] border border-[#26262E] p-3.5 space-y-3">
            <div className="flex items-start gap-3">
              <DeviceThumbnail
                model={selectedDevice ? selectedDevice.model : customModel}
                color={activeColor}
                size="md"
              />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="space-y-1">
                  <label htmlFor="sim-device-select" className="block text-[11px] font-medium text-zinc-400">
                    Aparelho do Estoque ou Avulso
                  </label>
                  <select
                    id="sim-device-select"
                    value={selectedDeviceId}
                    onChange={(e) => handleSelectDevice(e.target.value)}
                    className="w-full min-h-[42px] px-3 rounded-xl bg-[#121216] border border-[#26262E] text-white text-xs sm:text-sm font-medium focus:outline-none focus:border-[#D4AF37]"
                  >
                    {availableDevices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {formatDeviceModelName(d.model)} · {formatStorage(d.storageGb)} ·{' '}
                        {d.condition === 'lacrado' ? 'Lacrado' : `Seminovo (${d.batteryHealth}%)`} —{' '}
                        {formatBRL(d.price)}
                      </option>
                    ))}
                    <option value="custom">Valor personalizado (aparelho avulso)</option>
                  </select>
                </div>

                {selectedDeviceId === 'custom' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={customModel}
                        onChange={(e) => setCustomModel(e.target.value)}
                        onBlur={() => setCustomModel((v) => formatDeviceModelName(v))}
                        placeholder="Modelo (ex: iPhone 15 Pro)"
                        className="sm:col-span-2 min-h-[40px] px-3 rounded-xl bg-[#121216] border border-[#26262E] text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                      />
                      <select
                        aria-label="Armazenamento personalizado"
                        value={customStorageGb}
                        onChange={(e) => setCustomStorageGb(Number(e.target.value))}
                        className="min-h-[40px] px-2.5 rounded-xl bg-[#121216] border border-[#26262E] text-white text-xs font-mono-tabular focus:outline-none focus:border-[#D4AF37]"
                      >
                        {SCHEMA_LIMITS.STORAGE_OPTIONS.map((gb) => (
                          <option key={gb} value={gb}>
                            {formatStorage(gb)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-1 p-1 bg-[#121216] border border-[#26262E] rounded-xl">
                      <button
                        type="button"
                        onClick={() => setCustomCondition('lacrado')}
                        className={`min-h-[34px] rounded-lg text-xs font-semibold transition-colors ${
                          customCondition === 'lacrado'
                            ? 'bg-[#D4AF37] text-black'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Lacrado
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomCondition('seminovo')}
                        className={`min-h-[34px] rounded-lg text-xs font-semibold transition-colors ${
                          customCondition === 'seminovo'
                            ? 'bg-white text-black'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Seminovo
                      </button>
                    </div>
                  </div>
                )}

                {selectedDevice && availColors.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {availColors.map((v) => {
                      const hex = getAppleColorHex(v.color, selectedDevice.model);
                      const isSel = activeColor === v.color;
                      return (
                        <button
                          key={v.color}
                          type="button"
                          onClick={() => setSelectedColor(v.color)}
                          className={`min-h-[30px] px-2 rounded-lg text-[11px] border inline-flex items-center gap-1.5 ${
                            isSel
                              ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-semibold'
                              : 'bg-[#121216] text-zinc-300 border-[#26262E]'
                          }`}
                        >
                          {hex && (
                            <span
                              className="w-2 h-2 rounded-full border border-white/25"
                              style={{ backgroundColor: hex }}
                              aria-hidden="true"
                            />
                          )}
                          <span>{v.color}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-[#1D1D24]">
              <div className="space-y-1">
                <label htmlFor="sim-price" className="block text-[11px] text-zinc-400">
                  Valor de Venda (R$)
                </label>
                <input
                  id="sim-price"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="1"
                  max={SCHEMA_LIMITS.PRICE_MAX}
                  value={devicePriceInput}
                  onChange={(e) => setDevicePriceInput(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-xl bg-[#121216] border border-[#26262E] text-white font-mono-tabular font-semibold text-sm focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="sim-down" className="block text-[11px] text-zinc-400">
                  Entrada em Pix / Dinheiro (opcional)
                </label>
                <input
                  id="sim-down"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  max={afterTradeIn || SCHEMA_LIMITS.PRICE_MAX}
                  value={downPaymentInput}
                  onChange={(e) => setDownPaymentInput(e.target.value)}
                  placeholder="0,00"
                  className="w-full min-h-[42px] px-3 rounded-xl bg-[#121216] border border-[#26262E] text-white font-mono-tabular text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>
          </div>

          {/* 2. Pegando aparelho na troca ou Sem troca */}
          <div className="rounded-2xl bg-[#09090B] border border-[#26262E] p-3.5 space-y-3">
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#121216] border border-[#26262E] rounded-xl">
              <button
                type="button"
                onClick={() => setWithTradeIn(false)}
                className={`min-h-[40px] px-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  !withTradeIn ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Sem Troca
              </button>
              <button
                type="button"
                onClick={() => setWithTradeIn(true)}
                className={`min-h-[40px] px-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                  withTradeIn ? 'bg-[#D4AF37] text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" />
                <span>Pegando o Dele (Troca)</span>
              </button>
            </div>

            {withTradeIn && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="space-y-1">
                  <label htmlFor="sim-ti-model" className="block text-[11px] text-zinc-400">
                    Aparelho do cliente
                  </label>
                  <input
                    id="sim-ti-model"
                    type="text"
                    autoCapitalize="words"
                    value={tradeInModel}
                    onChange={(e) => setTradeInModel(e.target.value)}
                    onBlur={() => setTradeInModel((v) => formatDeviceModelName(v))}
                    placeholder="Ex: iPhone 13"
                    className="w-full min-h-[42px] px-3 rounded-xl bg-[#121216] border border-[#26262E] text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="sim-ti-storage" className="block text-[11px] text-zinc-400">
                    Capacidade
                  </label>
                  <select
                    id="sim-ti-storage"
                    value={tradeInStorageGb}
                    onChange={(e) => setTradeInStorageGb(Number(e.target.value))}
                    className="w-full min-h-[42px] px-3 rounded-xl bg-[#121216] border border-[#26262E] text-white font-mono-tabular text-sm focus:outline-none focus:border-[#D4AF37]"
                  >
                    {SCHEMA_LIMITS.STORAGE_OPTIONS.map((gb) => (
                      <option key={gb} value={gb}>
                        {formatStorage(gb)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="sim-ti-val" className="block text-[11px] text-zinc-400">
                    Valor avaliado (R$)
                  </label>
                  <input
                    id="sim-ti-val"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    max={grossPrice || SCHEMA_LIMITS.PRICE_MAX}
                    value={tradeInValueInput}
                    onChange={(e) => setTradeInValueInput(e.target.value)}
                    placeholder="2200"
                    className="w-full min-h-[42px] px-3 rounded-xl bg-[#121216] border border-[#26262E] text-emerald-400 font-mono-tabular font-semibold text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>
            )}

            {/* Live Financial Summary Strip */}
            <div className="pt-2.5 border-t border-[#1D1D24] grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-zinc-400 block">À vista (Pix / Dinheiro)</span>
                <span className="font-mono-tabular font-bold text-base text-white">
                  {formatBRL(afterTradeIn)}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block">Saldo p/ Cartão</span>
                <span className="font-mono-tabular font-bold text-base text-[#D4AF37]">
                  {formatBRL(financedBalance)}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-zinc-400 block">Parcela em destaque ({selectedInstallment}x)</span>
                <span className="font-mono-tabular font-bold text-base text-emerald-400">
                  {financedBalance > 0
                    ? `${selectedInstallment}x ${formatBRL(chosenInstallment.installmentValue)}`
                    : 'Quitado'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Parcelas 1x até 12x */}
          {financedBalance > 0 && (
            <div className="rounded-2xl bg-[#09090B] border border-[#26262E] p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-xs font-semibold text-white">
                    Simulação no Cartão (1x a 12x)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setApplyCardFee((v) => !v)}
                  className={`min-h-[32px] px-2.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                    applyCardFee
                      ? 'bg-[#D4AF37]/15 border-[#D4AF37]/50 text-[#D4AF37]'
                      : 'bg-[#121216] border-[#26262E] text-zinc-300'
                  }`}
                >
                  {applyCardFee ? 'Taxa InfinitePay repassada' : 'Sem juros (0%)'}
                </button>
              </div>

              {applyCardFee && (
                <p className="text-[11px] text-zinc-400">
                  {calcMode === 'infinitepay_repasse'
                    ? `Repasse líquido InfinitePay: loja recebe ${formatBRL(financedBalance)} livres após a taxa.`
                    : `Acréscimo simples sobre ${formatBRL(financedBalance)}.`}
                </p>
              )}

              {/* Escolha da bandeira: Visa ou Elo */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#121216] border border-[#26262E] rounded-xl">
                <button
                  type="button"
                  onClick={() => setCardBrand('visa')}
                  className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                    cardBrand === 'visa'
                      ? 'bg-[#D4AF37] text-black shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Visa / Mastercard
                </button>
                <button
                  type="button"
                  onClick={() => setCardBrand('elo')}
                  className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                    cardBrand === 'elo'
                      ? 'bg-[#D4AF37] text-black shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Elo
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {installmentRows.map((row) => {
                  const isSel = selectedInstallment === row.count;
                  return (
                    <button
                      key={row.count}
                      type="button"
                      onClick={() => setSelectedInstallment(row.count)}
                      className={`min-h-[54px] px-3 py-2 rounded-xl border text-left transition-colors ${
                        isSel
                          ? 'bg-[#D4AF37] border-[#D4AF37] text-black'
                          : 'bg-[#121216] border-[#26262E] text-white hover:border-zinc-500'
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="font-mono-tabular text-xs font-bold">{row.count}x</span>
                        <span
                          className={`font-mono-tabular text-[10px] ${
                            isSel ? 'text-black/75' : 'text-zinc-500'
                          }`}
                        >
                          {row.ratePercent > 0 ? `+${row.ratePercent.toFixed(1)}%` : 'sem juros'}
                        </span>
                      </div>
                      <p className="font-mono-tabular text-xs font-bold mt-0.5 truncate">
                        {formatBRL(row.installmentValue)}
                      </p>
                      <p
                        className={`font-mono-tabular text-[10px] truncate ${
                          isSel ? 'text-black/75' : 'text-zinc-400'
                        }`}
                      >
                        Total {formatBRL(row.totalWithFee)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Personalização para enviar ao Cliente */}
          <div className="rounded-2xl bg-[#09090B] border border-[#26262E] p-3.5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label htmlFor="sim-cust-name" className="block text-[11px] text-zinc-400">
                  Nome do Cliente (opcional)
                </label>
                <input
                  id="sim-cust-name"
                  type="text"
                  autoCapitalize="words"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  onBlur={() => setCustomerName((v) => formatTitleName(v))}
                  placeholder="Ex: João Silva"
                  className="w-full min-h-[42px] px-3 rounded-xl bg-[#121216] border border-[#26262E] text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="sim-cust-phone" className="block text-[11px] text-zinc-400">
                  WhatsApp do Cliente (opcional)
                </label>
                <input
                  id="sim-cust-phone"
                  type="tel"
                  inputMode="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  onBlur={() => setCustomerPhone((v) => formatPhoneBR(v))}
                  placeholder="(11) 99999-9999"
                  className="w-full min-h-[42px] px-3 rounded-xl bg-[#121216] border border-[#26262E] text-white font-mono-tabular text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            {financedBalance > 0 && (
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeFullTableInQuote}
                  onChange={(e) => setIncludeFullTableInQuote(e.target.checked)}
                  className="w-4 h-4 accent-[#D4AF37] rounded"
                />
                <span>Incluir tabela completa (1x até 12x) na mensagem copiada</span>
              </label>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="px-4 sm:px-5 py-3.5 pb-safe border-t border-[#26262E] bg-[#121216] flex flex-wrap items-center gap-2 shrink-0">
          {selectedDevice && onProceedToReserve && canReserve && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onProceedToReserve(selectedDevice);
              }}
              className="min-h-[46px] px-3 rounded-xl bg-[#1A1A20] hover:bg-[#24242C] text-zinc-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Bookmark className="w-4 h-4 text-[#D4AF37]" />
              <span>Reservar</span>
            </button>
          )}

          {selectedDevice && onProceedToSell && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onProceedToSell(selectedDevice);
              }}
              className="min-h-[46px] px-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Vender</span>
            </button>
          )}

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[46px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Enviar</span>
            </a>
          )}

          <button
            type="button"
            onClick={handleCopyQuote}
            className="flex-1 min-h-[46px] px-4 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-black font-semibold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            {copied ? <Check className="w-4 h-4 shrink-0" /> : <Copy className="w-4 h-4 shrink-0" />}
            <span>{copied ? 'Simulação Copiada!' : 'Copiar Simulação'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
