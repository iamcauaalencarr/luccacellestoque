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

export const DEFAULT_INSTALLMENT_RATES: InstallmentRates = {
  '1': 3.49,
  '2': 4.59,
  '3': 5.49,
  '4': 6.39,
  '5': 7.29,
  '6': 8.19,
  '7': 9.09,
  '8': 9.99,
  '9': 10.89,
  '10': 11.79,
  '11': 12.69,
  '12': 13.59,
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
  defaultCondition: DeviceCondition;
  defaultStorageGb: number;
  defaultPaymentMethod: SinglePaymentMethod;
  allowSellerPriceEdit: boolean;
  requireCustomerOnSale: boolean;
  lowBatteryWarningThreshold: number;
  lowStockThreshold: number;
  warrantyDaysLacrado: number;
  warrantyDaysSeminovo: number;
  passCardFeeToCustomer: boolean;
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
  defaultCondition: 'lacrado',
  defaultStorageGb: 128,
  defaultPaymentMethod: 'pix',
  allowSellerPriceEdit: true,
  requireCustomerOnSale: false,
  lowBatteryWarningThreshold: 85,
  lowStockThreshold: 1,
  warrantyDaysLacrado: 365,
  warrantyDaysSeminovo: 90,
  passCardFeeToCustomer: true,
  installmentRates: { ...DEFAULT_INSTALLMENT_RATES },
  defaultLabelPresetId: '30x20',
  defaultLabelStyleId: 'boutique',
  labelShowStore: true,
  labelShowPrice: true,
  labelShowBarcode: true,
  labelPrefix: 'LC',
};

export interface UserAccount {
  uid: string;
  username: string;
  email: string;
  displayName: string;
  role: UserRole;
  active: boolean;
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
