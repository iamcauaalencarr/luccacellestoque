import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'vendedor';
export type DeviceCondition = 'lacrado' | 'seminovo';
export type DeviceStatus = 'disponivel' | 'reservado' | 'vendido';
export type SinglePaymentMethod = 'pix' | 'credito' | 'debito' | 'dinheiro';
export type PaymentMethod = SinglePaymentMethod | 'misto';

export interface ColorVariant {
  color: string;
  quantity: number;
}

export interface PaymentBreakdown {
  pix: number;
  credito: number;
  debito: number;
  dinheiro: number;
}

export type InstallmentCountKey =
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | '11'
  | '12';

export type InstallmentRates = Record<InstallmentCountKey, number>;
export type CardFeeCalculationMode = 'infinitepay_repasse' | 'simple_markup';

export interface InfinitePayTierPreset {
  id: 'up_to_20k' | '20k_to_40k' | '40k_to_80k' | 'above_80k' | 'elo_up_to_20k' | 'elo_20k_to_40k' | 'elo_40k_to_80k' | 'elo_above_80k';
  label: string;
  shortLabel: string;
  description: string;
  debitFeePercent: number;
  installmentRates: InstallmentRates;
}

export const INFINITEPAY_PRESETS: InfinitePayTierPreset[] = [
  {
    id: 'up_to_20k',
    label: 'InfinitePay · Até R$ 20 mil/mês',
    shortLabel: 'Visa/MC · Até 20k',
    description: 'Visa/Mastercard · recebimento em 1 dia útil',
    debitFeePercent: 1.37,
    installmentRates: {
      '1': 3.15,
      '2': 5.39,
      '3': 6.12,
      '4': 6.85,
      '5': 7.57,
      '6': 8.28,
      '7': 8.99,
      '8': 9.8,
      '9': 10.38,
      '10': 11.06,
      '11': 11.74,
      '12': 12.4,
    },
  },
  {
    id: '20k_to_40k',
    label: 'InfinitePay · R$ 20 mil a 40 mil',
    shortLabel: 'Visa/MC · 20k–40k',
    description: 'Visa/Mastercard · recebimento em 1 dia útil',
    debitFeePercent: 0.85,
    installmentRates: {
      '1': 2.89,
      '2': 4.22,
      '3': 4.83,
      '4': 5.44,
      '5': 6.06,
      '6': 6.64,
      '7': 7.24,
      '8': 7.82,
      '9': 8.42,
      '10': 8.98,
      '11': 9.56,
      '12': 10.12,
    },
  },
  {
    id: '40k_to_80k',
    label: 'InfinitePay · R$ 40 mil a 80 mil',
    shortLabel: 'Visa/MC · 40k–80k',
    description: 'Visa/Mastercard · recebimento em 1 dia útil',
    debitFeePercent: 0.79,
    installmentRates: {
      '1': 2.79,
      '2': 4.08,
      '3': 4.65,
      '4': 5.21,
      '5': 5.77,
      '6': 6.32,
      '7': 6.87,
      '8': 7.42,
      '9': 7.96,
      '10': 8.49,
      '11': 9.03,
      '12': 9.56,
    },
  },
  {
    id: 'above_80k',
    label: 'InfinitePay · Acima de R$ 80 mil',
    shortLabel: 'Visa/MC · 80k+',
    description: 'Visa/Mastercard · recebimento em 1 dia útil',
    debitFeePercent: 0.75,
    installmentRates: {
      '1': 2.69,
      '2': 3.94,
      '3': 4.46,
      '4': 4.98,
      '5': 5.49,
      '6': 5.99,
      '7': 6.51,
      '8': 6.99,
      '9': 7.51,
      '10': 7.99,
      '11': 8.49,
      '12': 8.99,
    },
  },
  // ── Elo ────────────────────────────────────────────────────────────────────
  {
    id: 'elo_up_to_20k',
    label: 'InfinitePay Elo · Até R$ 20 mil/mês',
    shortLabel: 'Elo · Até 20k',
    description: 'Elo · recebimento em 1 dia útil',
    debitFeePercent: 1.59,
    installmentRates: {
      '1': 3.49,
      '2': 5.79,
      '3': 6.55,
      '4': 7.31,
      '5': 8.06,
      '6': 8.80,
      '7': 9.54,
      '8': 10.27,
      '9': 10.99,
      '10': 11.71,
      '11': 12.42,
      '12': 13.12,
    },
  },
  {
    id: 'elo_20k_to_40k',
    label: 'InfinitePay Elo · R$ 20 mil a 40 mil',
    shortLabel: 'Elo · 20k–40k',
    description: 'Elo · recebimento em 1 dia útil',
    debitFeePercent: 1.05,
    installmentRates: {
      '1': 3.19,
      '2': 4.59,
      '3': 5.22,
      '4': 5.85,
      '5': 6.48,
      '6': 7.09,
      '7': 7.71,
      '8': 8.31,
      '9': 8.92,
      '10': 9.51,
      '11': 10.10,
      '12': 10.68,
    },
  },
  {
    id: 'elo_40k_to_80k',
    label: 'InfinitePay Elo · R$ 40 mil a 80 mil',
    shortLabel: 'Elo · 40k–80k',
    description: 'Elo · recebimento em 1 dia útil',
    debitFeePercent: 0.99,
    installmentRates: {
      '1': 3.09,
      '2': 4.45,
      '3': 5.04,
      '4': 5.63,
      '5': 6.21,
      '6': 6.78,
      '7': 7.36,
      '8': 7.92,
      '9': 8.48,
      '10': 9.03,
      '11': 9.58,
      '12': 10.12,
    },
  },
  {
    id: 'elo_above_80k',
    label: 'InfinitePay Elo · Acima de R$ 80 mil',
    shortLabel: 'Elo · 80k+',
    description: 'Elo · recebimento em 1 dia útil',
    debitFeePercent: 0.95,
    installmentRates: {
      '1': 2.99,
      '2': 4.31,
      '3': 4.85,
      '4': 5.40,
      '5': 5.93,
      '6': 6.45,
      '7': 6.99,
      '8': 7.49,
      '9': 8.01,
      '10': 8.51,
      '11': 9.01,
      '12': 9.49,
    },
  },
];

export const DEFAULT_INSTALLMENT_RATES: InstallmentRates = {
  ...INFINITEPAY_PRESETS[0].installmentRates,
};

export type AuditAction =
  | 'CREATE_DEVICE'
  | 'UPDATE_DEVICE'
  | 'DELETE_DEVICE'
  | 'RESERVE_DEVICE'
  | 'RELEASE_RESERVATION'
  | 'REGISTER_SALE'
  | 'CREATE_USER'
  | 'UPDATE_USER_STATUS'
  | 'UPDATE_SETTINGS';

export type LabelStyleId = 'boutique' | 'vitrine' | 'ficha' | 'minimal';
export type LabelPresetId = '30x20' | '50x30' | '40x30' | '60x40' | '50x15' | '40x12';

export const SCHEMA_LIMITS = {
  UID_MAX: 128,
  USERNAME_MIN: 3,
  USERNAME_MAX: 50,
  USERNAME_PATTERN: /^[a-zA-Z0-9._-]+$/,
  DISPLAY_NAME_MIN: 2,
  DISPLAY_NAME_MAX: 80,
  MODEL_MIN: 2,
  MODEL_MAX: 80,
  COLOR_MIN: 2,
  COLOR_MAX: 40,
  IMEI_MAX: 32,
  PHONE_MAX: 30,
  NOTES_MAX: 200,
  CUSTOMER_MAX: 80,
  SUMMARY_MAX: 240,
  PRICE_MAX: 500000,
  STORE_NAME_MIN: 2,
  STORE_NAME_MAX: 40,
  STORE_TAGLINE_MAX: 80,
  STORE_PHONE_MAX: 30,
  STORE_DOCUMENT_MAX: 30,
  STORE_ADDRESS_MAX: 120,
  STORE_PIX_MAX: 100,
  WARRANTY_TERMS_MAX: 240,
  WHATSAPP_FOOTER_MAX: 200,
  LABEL_PREFIX_MAX: 6,
  COLOR_VARIANTS_MAX: 12,
  VARIANT_QTY_MAX: 500,
  LOW_STOCK_MAX: 20,
  WARRANTY_DAYS_MAX: 1095,
  RATE_MAX: 45,
  STORAGE_OPTIONS: [64, 128, 256, 512, 1024] as const,
};

export interface StoreSettings {
  storeName: string;
  storeTagline: string;
  storePhone: string;
  storeDocument?: string;
  storeAddress?: string;
  storePixKey?: string;
  defaultCondition: DeviceCondition;
  defaultStorageGb: number;
  defaultPaymentMethod: SinglePaymentMethod;
  allowSellerPriceEdit: boolean;
  requireCustomerOnSale: boolean;
  requireCustomerPhoneOnSale?: boolean;
  allowSellerTradeIn?: boolean;
  allowSellerReserve?: boolean;
  lowBatteryWarningThreshold: number;
  lowStockThreshold: number;
  warrantyDaysLacrado: number;
  warrantyDaysSeminovo: number;
  warrantyTerms?: string;
  whatsappListFooter?: string;
  debitFeePercent?: number;
  passCardFeeToCustomer: boolean;
  cardFeeCalculationMode?: CardFeeCalculationMode;
  installmentRates: InstallmentRates;
  defaultLabelPresetId: LabelPresetId;
  defaultLabelStyleId: LabelStyleId;
  labelShowStore: boolean;
  labelShowPrice: boolean;
  labelShowBarcode: boolean;
  labelPrefix: string;
  updatedBy?: string;
  updatedAt?: Timestamp | null;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: 'Lucca Cell',
  storeTagline: 'Aparelhos Lacrados e Seminovos',
  storePhone: '',
  storeDocument: '',
  storeAddress: '',
  storePixKey: '',
  defaultCondition: 'lacrado',
  defaultStorageGb: 128,
  defaultPaymentMethod: 'pix',
  allowSellerPriceEdit: true,
  requireCustomerOnSale: false,
  requireCustomerPhoneOnSale: false,
  allowSellerTradeIn: true,
  allowSellerReserve: true,
  lowBatteryWarningThreshold: 85,
  lowStockThreshold: 1,
  warrantyDaysLacrado: 365,
  warrantyDaysSeminovo: 90,
  warrantyTerms: 'Garantia cobre defeitos de hardware. Não cobre queda, tela trincada, oxidação ou mau uso.',
  whatsappListFooter: 'Aceitamos seu iPhone usado na troca! Parcelamos em até 12x.',
  debitFeePercent: INFINITEPAY_PRESETS[0].debitFeePercent,
  passCardFeeToCustomer: true,
  cardFeeCalculationMode: 'simple_markup',
  installmentRates: { ...DEFAULT_INSTALLMENT_RATES },
  defaultLabelPresetId: '30x20',
  defaultLabelStyleId: 'boutique',
  labelShowStore: true,
  labelShowPrice: true,
  labelShowBarcode: true,
  labelPrefix: 'LC',
};

export interface UserPreferences {
  defaultTab: 'estoque' | 'relatorios';
  defaultInventorySort: 'recentes' | 'menor_preco' | 'maior_preco' | 'modelo';
  defaultConditionFilter: 'todos' | DeviceCondition;
  showInstallmentPreview: boolean;
  showImeiOnCards: boolean;
  autoOpenWarrantyAfterSale: boolean;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  defaultTab: 'estoque',
  defaultInventorySort: 'recentes',
  defaultConditionFilter: 'todos',
  showInstallmentPreview: true,
  showImeiOnCards: true,
  autoOpenWarrantyAfterSale: true,
};

export interface UserAccount {
  uid: string;
  username: string;
  email: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  usernameConfirmed?: boolean;
  createdBy: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface StaffDirectoryMember {
  uid: string;
  username: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  createdBy: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface DeviceReservation {
  customerName: string;
  customerPhone?: string;
  depositAmount?: number;
  reservedColor?: string;
  notes?: string;
  reservedBy: string;
  reservedByName: string;
  reservedAt?: Timestamp | null;
}

export interface DeviceItem {
  id: string;
  model: string;
  storageGb: number;
  batteryHealth: number;
  color: string;
  colorVariants?: ColorVariant[];
  condition: DeviceCondition;
  price: number;
  status: DeviceStatus;
  imei?: string;
  notes?: string;
  tradeInFromSaleId?: string;
  reservation?: DeviceReservation;
  createdBy: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  soldBy?: string;
  soldByName?: string;
  soldAt?: Timestamp | null;
  saleId?: string;
}

export interface TradeInRecord {
  deviceId: string;
  model: string;
  storageGb: number;
  batteryHealth: number;
  color: string;
  imei?: string;
  tradeInValue: number;
  resalePrice: number;
}

export interface SaleRecord {
  id: string;
  deviceId: string;
  model: string;
  storageGb: number;
  batteryHealth: number;
  color: string;
  condition: DeviceCondition;
  imei?: string;
  salePrice: number;
  paymentMethod: PaymentMethod;
  paymentBreakdown?: PaymentBreakdown;
  installments?: number;
  cardFeePercent?: number;
  warrantyDays?: number;
  tradeIn?: TradeInRecord;
  customerName?: string;
  customerPhone?: string;
  sellerId: string;
  sellerName: string;
  createdAt?: Timestamp | null;
}

export interface AuditLogRecord {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: AuditAction;
  targetId: string;
  summary: string;
  createdAt?: Timestamp | null;
}

export type AppTab = 'estoque' | 'relatorios' | 'equipe' | 'auditoria' | 'config';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}
