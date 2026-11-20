import type { Timestamp } from 'firebase/firestore';
import {
  DEFAULT_INSTALLMENT_RATES,
  INFINITEPAY_PRESETS,
  type AuditAction,
  type CardFeeCalculationMode,
  type ColorVariant,
  type DeviceItem,
  type InstallmentCountKey,
  type InstallmentRates,
  type PaymentBreakdown,
  type PaymentMethod,
  type SinglePaymentMethod,
} from '../types';

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatStorage(gb: number): string {
  if (gb >= 1024 && gb % 1024 === 0) {
    return `${gb / 1024} TB`;
  }
  return `${gb} GB`;
}

export function formatImei(raw: string): string {
  return raw
    .trim()
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toUpperCase()
    .slice(0, 32);
}

export function formatPhoneBR(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return trimmed.slice(0, 30);
}

export function buildWhatsAppUrl(phone?: string | null, text?: string): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return null;
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }
  const base = `https://wa.me/${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function calculateInstallment(
  baseAmount: number,
  installmentsCount: number,
  rates: InstallmentRates,
  passFeeToCustomer: boolean,
  mode: CardFeeCalculationMode = 'simple_markup'
): {
  count: number;
  ratePercent: number;
  totalWithFee: number;
  installmentValue: number;
} {
  const count = Math.max(1, Math.min(12, Math.round(installmentsCount))) as number;
  const key = String(count) as InstallmentCountKey;
  const ratePercent = Math.max(0, Math.min(45, Number(rates[key]) || 0));
  let totalWithFee = Math.round(baseAmount * 100) / 100;
  if (passFeeToCustomer && ratePercent > 0) {
    if (mode === 'infinitepay_repasse' && ratePercent < 99) {
      totalWithFee = Math.round((baseAmount / (1 - ratePercent / 100)) * 100) / 100;
    } else {
      totalWithFee = Math.round(baseAmount * (1 + ratePercent / 100) * 100) / 100;
    }
  }
  const installmentValue = Math.round((totalWithFee / count) * 100) / 100;
  return { count, ratePercent, totalWithFee, installmentValue };
}

export function getCardBrandRates(
  baseRates: InstallmentRates | undefined,
  brand: 'visa' | 'elo'
): InstallmentRates {
  const visaRates = baseRates || DEFAULT_INSTALLMENT_RATES;
  if (brand === 'visa') return visaRates;

  // Localiza a faixa correspondente na tabela da InfinitePay (comparando 12x e 1x)
  const currentRate12 = Number(visaRates['12'] ?? 12.4);
  let bestTierIdx = 0;
  let minDiff = 999;

  for (let i = 0; i < 4; i++) {
    const diff = Math.abs(currentRate12 - INFINITEPAY_PRESETS[i].installmentRates['12']);
    if (diff < minDiff) {
      minDiff = diff;
      bestTierIdx = i;
    }
  }

  // Se a taxa for muito próxima de um tier oficial da InfinitePay (diferença <= 0.6%)
  if (minDiff <= 0.6 && INFINITEPAY_PRESETS[bestTierIdx + 4]) {
    return INFINITEPAY_PRESETS[bestTierIdx + 4].installmentRates;
  }

  // Se for uma taxa personalizada manual, calcula proporcional com o diferencial da Elo
  const eloRates: Partial<InstallmentRates> = {};
  const refVisa = INFINITEPAY_PRESETS[bestTierIdx].installmentRates;
  const refElo = INFINITEPAY_PRESETS[bestTierIdx + 4].installmentRates;

  for (let i = 1; i <= 12; i++) {
    const k = String(i) as InstallmentCountKey;
    const diff = (refElo[k] ?? 0) - (refVisa[k] ?? 0);
    const current = Number(visaRates[k] ?? refVisa[k] ?? 0);
    eloRates[k] = Math.round((current + diff) * 100) / 100;
  }

  return eloRates as InstallmentRates;
}

export function getWarrantyInfo(
  createdAt: Timestamp | Date | null | undefined,
  warrantyDays?: number
): {
  days: number;
  expiresAt: Date;
  formattedEnd: string;
  isActive: boolean;
  daysRemaining: number;
} {
  const days = Math.max(0, Math.round(warrantyDays ?? 90));
  const start =
    createdAt instanceof Date
      ? createdAt
      : createdAt
        ? createdAt.toDate()
        : new Date();
  const expiresAt = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  const formattedEnd = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(expiresAt);

  return {
    days,
    expiresAt,
    formattedEnd,
    isActive: days > 0 && diffMs >= 0,
    daysRemaining: Math.max(0, daysRemaining),
  };
}

const PORTUGUESE_LOWER_CONNECTORS = new Set([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'e',
  'em',
  'com',
  'para',
]);

const SPECIAL_MODEL_TOKENS: Record<string, string> = {
  iphone: 'iPhone',
  ipad: 'iPad',
  ipod: 'iPod',
  imac: 'iMac',
  macbook: 'MacBook',
  airpods: 'AirPods',
  airtag: 'AirTag',
  oneplus: 'OnePlus',
  se: 'SE',
  xr: 'XR',
  xs: 'XS',
  fe: 'FE',
  nfc: 'NFC',
  lte: 'LTE',
  oled: 'OLED',
  amoled: 'AMOLED',
  usb: 'USB',
  '5g': '5G',
  '4g': '4G',
  '3g': '3G',
};

function capitalizeSimpleToken(token: string): string {
  if (!token) return '';
  return token.charAt(0).toLocaleUpperCase('pt-BR') + token.slice(1).toLocaleLowerCase('pt-BR');
}

function formatHyphenatedToken(
  token: string,
  formatSegment: (segment: string, isSubPart: boolean) => string
): string {
  if (!token.includes('-')) return formatSegment(token, false);
  return token
    .split('-')
    .map((part, idx) => formatSegment(part, idx > 0))
    .join('-');
}

/**
 * Padroniza nomes comuns (cores, clientes, vendedores, nome da loja) com iniciais em caixa alta.
 * Ex: "verde" -> "Verde", "titânio natural" -> "Titânio Natural", "maria da silva" -> "Maria da Silva".
 */
export function formatTitleName(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';

  return cleaned
    .split(' ')
    .map((word, index) =>
      formatHyphenatedToken(word, (segment) => {
        const lower = segment.toLocaleLowerCase('pt-BR');
        if (index > 0 && PORTUGUESE_LOWER_CONNECTORS.has(lower)) {
          return lower;
        }
        return capitalizeSimpleToken(segment);
      })
    )
    .join(' ');
}

/**
 * Padroniza nomes de modelos de smartphones preservando marcas e siglas.
 * Ex: "iphone 15 pro max" -> "iPhone 15 Pro Max", "galaxy s24 ultra 5g" -> "Galaxy S24 Ultra 5G".
 */
export function formatDeviceModelName(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';

  return cleaned
    .split(' ')
    .map((word, index) =>
      formatHyphenatedToken(word, (segment) => {
        const lower = segment.toLocaleLowerCase('pt-BR');
        if (SPECIAL_MODEL_TOKENS[lower]) {
          return SPECIAL_MODEL_TOKENS[lower];
        }
        const storageOrGenMatch = /^(\d+)(gb|tb|g)$/i.exec(segment);
        if (storageOrGenMatch) {
          return `${storageOrGenMatch[1]}${storageOrGenMatch[2].toUpperCase()}`;
        }
        const iphoneVariantMatch = /^(\d+)(e|s|c)$/i.exec(segment);
        if (iphoneVariantMatch) {
          return `${iphoneVariantMatch[1]}${iphoneVariantMatch[2].toLowerCase()}`;
        }
        if (index > 0 && PORTUGUESE_LOWER_CONNECTORS.has(lower)) {
          return lower;
        }
        return capitalizeSimpleToken(segment);
      })
    )
    .join(' ');
}

export function formatTimestamp(ts?: Timestamp | null, includeSeconds = false): string {
  if (!ts) return 'Agora';
  const date = ts.toDate();
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' } : {}),
  }).format(date);
}

export function formatShortDate(ts?: Timestamp | null): string {
  if (!ts) return 'Hoje';
  const date = ts.toDate();
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getDeviceColorVariants(
  device: Pick<DeviceItem, 'condition' | 'color' | 'colorVariants'>
): ColorVariant[] {
  if (device.condition === 'lacrado' && device.colorVariants && device.colorVariants.length > 0) {
    return device.colorVariants.map((v) => ({
      color: formatTitleName(v.color),
      quantity: Math.max(0, Math.round(v.quantity)),
    }));
  }
  return [{ color: formatTitleName(device.color), quantity: 1 }];
}

export function getAvailableColorVariants(
  device: Pick<DeviceItem, 'condition' | 'color' | 'colorVariants' | 'status'>
): ColorVariant[] {
  if (device.status === 'vendido') return [];
  return getDeviceColorVariants(device).filter((v) => v.quantity > 0);
}

export function getDeviceTotalStock(
  device: Pick<DeviceItem, 'condition' | 'color' | 'colorVariants' | 'status'>
): number {
  if (device.status === 'vendido') return 0;
  if (device.condition === 'lacrado' && device.colorVariants && device.colorVariants.length > 0) {
    return device.colorVariants.reduce((sum, v) => sum + Math.max(0, Math.round(v.quantity)), 0);
  }
  return 1;
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: 'PIX',
  credito: 'Cartão Crédito',
  debito: 'Cartão Débito',
  dinheiro: 'Dinheiro',
  misto: 'Misto',
};

const SINGLE_PAYMENT_ORDER: SinglePaymentMethod[] = ['pix', 'credito', 'debito', 'dinheiro'];

export function formatPaymentBreakdown(pb?: PaymentBreakdown | null): string {
  if (!pb) return '';
  return SINGLE_PAYMENT_ORDER.filter((m) => (pb[m] || 0) > 0)
    .map((m) => `${PAYMENT_LABELS[m]} ${formatBRL(pb[m])}`)
    .join(' + ');
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  CREATE_DEVICE: 'Aparelho cadastrado',
  UPDATE_DEVICE: 'Aparelho atualizado',
  DELETE_DEVICE: 'Aparelho removido',
  RESERVE_DEVICE: 'Aparelho reservado',
  RELEASE_RESERVATION: 'Reserva cancelada',
  REGISTER_SALE: 'Venda registrada',
  CREATE_USER: 'Usuário criado',
  UPDATE_USER_STATUS: 'Acesso alterado',
  UPDATE_SETTINGS: 'Configurações atualizadas',
};
