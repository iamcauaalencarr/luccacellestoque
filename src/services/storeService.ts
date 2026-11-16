import { createUserWithEmailAndPassword, deleteUser, signOut } from 'firebase/auth';
import {
  collection,
  deleteField,
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import {
  db,
  extractUsername,
  getSecondaryProvisioningAuth,
  handleFirestoreError,
  normalizeLoginIdentifier,
  OperationType,
} from '../firebase';
import {
  DEFAULT_INSTALLMENT_RATES,
  type AuditAction,
  type ColorVariant,
  type DeviceCondition,
  type DeviceItem,
  type InstallmentCountKey,
  type InstallmentRates,
  type PaymentBreakdown,
  type PaymentMethod,
  type SaleRecord,
  SCHEMA_LIMITS,
  type StaffDirectoryMember,
  type StoreSettings,
  type TradeInRecord,
  type UserAccount,
  type UserRole,
} from '../types';
import {
  formatBRL,
  formatDeviceModelName,
  formatImei,
  formatPaymentBreakdown,
  formatPhoneBR,
  formatStorage,
  formatTitleName,
  PAYMENT_LABELS,
} from '../utils/formatters';

interface ActorContext {
  uid: string;
  displayName: string;
  role: UserRole;
}

function clampString(value: string, max: number): string {
  return value.trim().slice(0, max);
}

function buildAuditPayload(
  actor: ActorContext,
  action: AuditAction,
  targetId: string,
  summary: string
) {
  return {
    actorId: actor.uid,
    actorName: clampString(actor.displayName, SCHEMA_LIMITS.DISPLAY_NAME_MAX),
    actorRole: actor.role,
    action,
    targetId: targetId.slice(0, SCHEMA_LIMITS.UID_MAX),
    summary: clampString(summary, SCHEMA_LIMITS.SUMMARY_MAX),
    createdAt: serverTimestamp(),
  };
}

export interface DeviceFormInput {
  model: string;
  storageGb: number;
  batteryHealth: number;
  color: string;
  colorVariants?: ColorVariant[];
  condition: DeviceCondition;
  price: number;
  imei?: string;
  notes?: string;
}

function normalizeColorVariants(raw?: ColorVariant[]): ColorVariant[] {
  if (!raw || raw.length === 0) return [];
  const merged = new Map<string, ColorVariant>();
  for (const item of raw) {
    const cleanColor = clampString(formatTitleName(item.color), SCHEMA_LIMITS.COLOR_MAX);
    if (cleanColor.length < SCHEMA_LIMITS.COLOR_MIN) continue;
    const qty = Math.max(0, Math.min(SCHEMA_LIMITS.VARIANT_QTY_MAX, Math.round(Number(item.quantity) || 0)));
    const key = cleanColor.toLocaleLowerCase('pt-BR');
    const existing = merged.get(key);
    if (existing) {
      existing.quantity = Math.min(SCHEMA_LIMITS.VARIANT_QTY_MAX, existing.quantity + qty);
    } else if (merged.size < SCHEMA_LIMITS.COLOR_VARIANTS_MAX) {
      merged.set(key, { color: cleanColor, quantity: qty });
    }
  }
  return Array.from(merged.values());
}

export async function createDevice(
  input: DeviceFormInput,
  actor: ActorContext
): Promise<string> {
  const model = clampString(formatDeviceModelName(input.model), SCHEMA_LIMITS.MODEL_MAX);
  const variants =
    input.condition === 'lacrado' ? normalizeColorVariants(input.colorVariants) : [];
  const positiveVariants = variants.filter((v) => v.quantity > 0);
  const color =
    positiveVariants.length > 0
      ? positiveVariants[0].color
      : variants.length > 0
        ? variants[0].color
        : clampString(formatTitleName(input.color), SCHEMA_LIMITS.COLOR_MAX);
  const imei = input.imei ? formatImei(input.imei) : '';
  const notes = input.notes ? clampString(input.notes, SCHEMA_LIMITS.NOTES_MAX) : '';
  const storageGb = Math.max(16, Math.min(4096, Math.round(input.storageGb)));
  const batteryHealth =
    input.condition === 'lacrado'
      ? 100
      : Math.max(1, Math.min(100, Math.round(input.batteryHealth)));
  const price = Math.max(1, Math.min(SCHEMA_LIMITS.PRICE_MAX, Number(input.price)));

  const deviceRef = doc(collection(db, 'devices'));
  const auditRef = doc(collection(db, 'auditLogs'));
  const batch = writeBatch(db);

  batch.set(deviceRef, {
    model,
    storageGb,
    batteryHealth,
    color,
    ...(variants.length > 0 ? { colorVariants: variants } : {}),
    condition: input.condition,
    price,
    status: 'disponivel',
    ...(imei ? { imei } : {}),
    ...(notes ? { notes } : {}),
    createdBy: actor.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const condLabel = input.condition === 'lacrado' ? 'Lacrado' : 'Seminovo';
  const colorAudit =
    positiveVariants.length > 0
      ? positiveVariants.map((v) => `${v.color} x${v.quantity}`).join(', ')
      : color;
  batch.set(
    auditRef,
    buildAuditPayload(
      actor,
      'CREATE_DEVICE',
      deviceRef.id,
      `Cadastrou ${model} ${formatStorage(storageGb)} (${colorAudit}, ${condLabel}, Bat. ${batteryHealth}%) por ${formatBRL(price)}`
    )
  );

  try {
    await batch.commit();
    return deviceRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `devices/${deviceRef.id}`);
  }
}

export async function updateDevice(
  existingDevice: DeviceItem,
  input: DeviceFormInput,
  actor: ActorContext
): Promise<void> {
  const model = clampString(formatDeviceModelName(input.model), SCHEMA_LIMITS.MODEL_MAX);
  const variants =
    input.condition === 'lacrado' ? normalizeColorVariants(input.colorVariants) : [];
  const positiveVariants = variants.filter((v) => v.quantity > 0);
  const color =
    positiveVariants.length > 0
      ? positiveVariants[0].color
      : variants.length > 0
        ? variants[0].color
        : clampString(formatTitleName(input.color), SCHEMA_LIMITS.COLOR_MAX);
  const imei = input.imei ? formatImei(input.imei) : '';
  const notes = input.notes ? clampString(input.notes, SCHEMA_LIMITS.NOTES_MAX) : '';
  const storageGb = Math.max(16, Math.min(4096, Math.round(input.storageGb)));
  const batteryHealth =
    input.condition === 'lacrado'
      ? 100
      : Math.max(1, Math.min(100, Math.round(input.batteryHealth)));
  const price = Math.max(1, Math.min(SCHEMA_LIMITS.PRICE_MAX, Number(input.price)));

  const deviceRef = doc(db, 'devices', existingDevice.id);
  const auditRef = doc(collection(db, 'auditLogs'));
  const batch = writeBatch(db);

  const updatePayload: Record<string, unknown> = {
    model,
    storageGb,
    batteryHealth,
    color,
    condition: input.condition,
    price,
    updatedAt: serverTimestamp(),
  };

  if (variants.length > 0) {
    updatePayload.colorVariants = variants;
  } else if (existingDevice.colorVariants) {
    updatePayload.colorVariants = deleteField();
  }

  if (imei) {
    updatePayload.imei = imei;
  } else if (existingDevice.imei) {
    updatePayload.imei = deleteField();
  }

  if (notes) {
    updatePayload.notes = notes;
  } else if (existingDevice.notes) {
    updatePayload.notes = deleteField();
  }

  const colorAudit =
    positiveVariants.length > 0
      ? positiveVariants.map((v) => `${v.color} x${v.quantity}`).join(', ')
      : color;

  batch.update(deviceRef, updatePayload);
  batch.set(
    auditRef,
    buildAuditPayload(
      actor,
      'UPDATE_DEVICE',
      existingDevice.id,
      `Atualizou ${model} ${formatStorage(storageGb)} (${colorAudit}) para ${formatBRL(price)}`
    )
  );

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `devices/${existingDevice.id}`);
  }
}

export async function deleteDevice(
  device: DeviceItem,
  actor: ActorContext
): Promise<void> {
  const deviceRef = doc(db, 'devices', device.id);
  const auditRef = doc(collection(db, 'auditLogs'));
  const batch = writeBatch(db);

  batch.delete(deviceRef);
  batch.set(
    auditRef,
    buildAuditPayload(
      actor,
      'DELETE_DEVICE',
      device.id,
      `Removeu ${device.model} ${formatStorage(device.storageGb)} (${device.color}) do estoque`
    )
  );

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `devices/${device.id}`);
  }
}

export interface ReserveDeviceInput {
  device: DeviceItem;
  customerName: string;
  customerPhone?: string;
  depositAmount?: number;
  reservedColor?: string;
  notes?: string;
}

export async function reserveDevice(
  input: ReserveDeviceInput,
  actor: ActorContext
): Promise<void> {
  const customerName = clampString(
    formatTitleName(input.customerName),
    SCHEMA_LIMITS.CUSTOMER_MAX
  );
  if (customerName.length < 2) {
    throw new Error('Informe o nome do cliente para reservar o aparelho.');
  }
  const customerPhone = input.customerPhone
    ? clampString(formatPhoneBR(input.customerPhone), SCHEMA_LIMITS.PHONE_MAX)
    : '';
  const depositAmount =
    input.depositAmount !== undefined && input.depositAmount > 0
      ? roundCents(input.depositAmount)
      : undefined;
  const reservedColor = input.reservedColor
    ? clampString(formatTitleName(input.reservedColor), SCHEMA_LIMITS.COLOR_MAX)
    : '';
  const notes = input.notes ? clampString(input.notes, SCHEMA_LIMITS.NOTES_MAX) : '';
  const actorName = clampString(formatTitleName(actor.displayName), SCHEMA_LIMITS.DISPLAY_NAME_MAX);

  const deviceRef = doc(db, 'devices', input.device.id);
  const auditRef = doc(collection(db, 'auditLogs'));
  const batch = writeBatch(db);

  batch.update(deviceRef, {
    status: 'reservado',
    reservation: {
      customerName,
      ...(customerPhone ? { customerPhone } : {}),
      ...(depositAmount !== undefined ? { depositAmount } : {}),
      ...(reservedColor ? { reservedColor } : {}),
      ...(notes ? { notes } : {}),
      reservedBy: actor.uid,
      reservedByName: actorName,
      reservedAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });

  const depositText = depositAmount ? ` · Sinal ${formatBRL(depositAmount)}` : '';
  batch.set(
    auditRef,
    buildAuditPayload(
      actor,
      'RESERVE_DEVICE',
      input.device.id,
      `Reservou ${formatDeviceModelName(input.device.model)} ${formatStorage(input.device.storageGb)} para ${customerName}${depositText}`
    )
  );

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `devices/${input.device.id}`);
  }
}

export async function releaseReservation(
  device: DeviceItem,
  actor: ActorContext
): Promise<void> {
  const deviceRef = doc(db, 'devices', device.id);
  const auditRef = doc(collection(db, 'auditLogs'));
  const batch = writeBatch(db);

  batch.update(deviceRef, {
    status: 'disponivel',
    reservation: deleteField(),
    updatedAt: serverTimestamp(),
  });

  const customerInfo = device.reservation?.customerName
    ? ` (cliente ${device.reservation.customerName})`
    : '';
  batch.set(
    auditRef,
    buildAuditPayload(
      actor,
      'RELEASE_RESERVATION',
      device.id,
      `Cancelou reserva de ${formatDeviceModelName(device.model)} ${formatStorage(device.storageGb)}${customerInfo}`
    )
  );

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `devices/${device.id}`);
  }
}

export interface TradeInInput {
  model: string;
  storageGb: number;
  batteryHealth: number;
  color: string;
  imei?: string;
  tradeInValue: number;
  resalePrice: number;
}

export interface RegisterSaleInput {
  device: DeviceItem;
  selectedColor?: string;
  imei?: string;
  salePrice: number;
  paymentMethod: PaymentMethod;
  paymentBreakdown?: PaymentBreakdown;
  installments?: number;
  cardFeePercent?: number;
  warrantyDays?: number;
  tradeIn?: TradeInInput;
  customerName?: string;
  customerPhone?: string;
}

function roundCents(value: number): number {
  return Math.round(Math.max(0, Math.min(SCHEMA_LIMITS.PRICE_MAX, Number(value) || 0)) * 100) / 100;
}

export async function registerSale(
  input: RegisterSaleInput,
  actor: ActorContext
): Promise<SaleRecord> {
  const { device } = input;
  const salePrice = Math.round(
    Math.max(1, Math.min(SCHEMA_LIMITS.PRICE_MAX, Number(input.salePrice))) * 100
  ) / 100;
  const customerName = input.customerName
    ? clampString(formatTitleName(input.customerName), SCHEMA_LIMITS.CUSTOMER_MAX)
    : '';
  const customerPhone = input.customerPhone
    ? clampString(formatPhoneBR(input.customerPhone), SCHEMA_LIMITS.PHONE_MAX)
    : '';
  const saleImei = input.imei
    ? formatImei(input.imei)
    : device.imei
      ? formatImei(device.imei)
      : '';
  const sellerName = clampString(formatTitleName(actor.displayName), SCHEMA_LIMITS.DISPLAY_NAME_MAX);
  const normalizedModel = clampString(formatDeviceModelName(device.model), SCHEMA_LIMITS.MODEL_MAX);
  const requestedColor = input.selectedColor
    ? clampString(formatTitleName(input.selectedColor), SCHEMA_LIMITS.COLOR_MAX)
    : '';

  const hasColorVariants =
    device.condition === 'lacrado' &&
    Array.isArray(device.colorVariants) &&
    device.colorVariants.length > 0;

  let soldColor = clampString(formatTitleName(device.color), SCHEMA_LIMITS.COLOR_MAX);
  let nextVariants: ColorVariant[] | undefined;
  let nextPrimaryColor = soldColor;
  let nextStatus: 'disponivel' | 'vendido' = 'vendido';

  if (hasColorVariants && device.colorVariants) {
    const cleanVariants = normalizeColorVariants(device.colorVariants);
    let targetIndex = requestedColor
      ? cleanVariants.findIndex(
          (v) =>
            v.color.toLocaleLowerCase('pt-BR') === requestedColor.toLocaleLowerCase('pt-BR') &&
            v.quantity > 0
        )
      : cleanVariants.findIndex((v) => v.quantity > 0);

    if (targetIndex === -1 && !requestedColor) {
      targetIndex = cleanVariants.findIndex((v) => v.quantity > 0);
    }

    if (targetIndex === -1 || cleanVariants[targetIndex].quantity <= 0) {
      throw new Error('Não há mais estoque disponível para a cor selecionada.');
    }

    soldColor = cleanVariants[targetIndex].color;
    nextVariants = cleanVariants.map((v, idx) =>
      idx === targetIndex ? { ...v, quantity: Math.max(0, v.quantity - 1) } : v
    );
    const totalRemaining = nextVariants.reduce((sum, v) => sum + v.quantity, 0);
    nextStatus = totalRemaining > 0 ? 'disponivel' : 'vendido';
    nextPrimaryColor = nextVariants.find((v) => v.quantity > 0)?.color || nextVariants[0].color;
  } else if (requestedColor) {
    soldColor = requestedColor;
  }

  // Trade-in validation
  let tradeInDeviceRef: ReturnType<typeof doc> | null = null;
  let normalizedTradeIn: TradeInRecord | undefined;
  if (input.tradeIn) {
    const tiModel = clampString(formatDeviceModelName(input.tradeIn.model), SCHEMA_LIMITS.MODEL_MAX);
    const tiColor = clampString(formatTitleName(input.tradeIn.color), SCHEMA_LIMITS.COLOR_MAX);
    const tiStorage = Math.max(16, Math.min(4096, Math.round(input.tradeIn.storageGb)));
    const tiBattery = Math.max(1, Math.min(100, Math.round(input.tradeIn.batteryHealth)));
    const tiValue = roundCents(input.tradeIn.tradeInValue);
    const tiResale = Math.max(1, roundCents(input.tradeIn.resalePrice));
    const tiImei = input.tradeIn.imei ? formatImei(input.tradeIn.imei) : '';

    if (tiModel.length < SCHEMA_LIMITS.MODEL_MIN || tiColor.length < SCHEMA_LIMITS.COLOR_MIN) {
      throw new Error('Preencha modelo e cor do aparelho recebido na troca.');
    }
    if (tiValue <= 0 || tiValue > salePrice) {
      throw new Error('O valor abatido na troca deve ser maior que zero e até o valor da venda.');
    }
    tradeInDeviceRef = doc(collection(db, 'devices'));
    normalizedTradeIn = {
      deviceId: tradeInDeviceRef.id,
      model: tiModel,
      storageGb: tiStorage,
      batteryHealth: tiBattery,
      color: tiColor,
      ...(tiImei ? { imei: tiImei } : {}),
      tradeInValue: tiValue,
      resalePrice: tiResale,
    };
  }

  const netCashDue = normalizedTradeIn
    ? roundCents(salePrice - normalizedTradeIn.tradeInValue)
    : salePrice;

  let normalizedBreakdown: PaymentBreakdown | undefined;
  if (input.paymentMethod === 'misto') {
    const raw = input.paymentBreakdown;
    if (!raw) {
      throw new Error('Informe os valores de cada forma de pagamento.');
    }
    normalizedBreakdown = {
      pix: roundCents(raw.pix),
      credito: roundCents(raw.credito),
      debito: roundCents(raw.debito),
      dinheiro: roundCents(raw.dinheiro),
    };
    const nonZeroCount = [
      normalizedBreakdown.pix,
      normalizedBreakdown.credito,
      normalizedBreakdown.debito,
      normalizedBreakdown.dinheiro,
    ].filter((v) => v > 0).length;
    const sum =
      normalizedBreakdown.pix +
      normalizedBreakdown.credito +
      normalizedBreakdown.debito +
      normalizedBreakdown.dinheiro;

    if (nonZeroCount < 2) {
      throw new Error('Selecione ao menos duas formas de pagamento no modo misto.');
    }
    if (Math.abs(sum - netCashDue) > 0.02) {
      throw new Error('A soma dos pagamentos deve ser igual ao valor líquido da venda.');
    }
  }

  const includesCredito =
    input.paymentMethod === 'credito' ||
    (input.paymentMethod === 'misto' && (normalizedBreakdown?.credito || 0) > 0);
  const installments =
    includesCredito && input.installments
      ? Math.max(1, Math.min(12, Math.round(input.installments)))
      : undefined;
  const cardFeePercent =
    includesCredito && input.cardFeePercent !== undefined
      ? Math.round(Math.max(0, Math.min(SCHEMA_LIMITS.RATE_MAX, input.cardFeePercent)) * 100) / 100
      : undefined;
  const warrantyDays =
    input.warrantyDays !== undefined
      ? Math.max(0, Math.min(SCHEMA_LIMITS.WARRANTY_DAYS_MAX, Math.round(input.warrantyDays)))
      : device.condition === 'lacrado'
        ? 365
        : 90;

  const deviceRef = doc(db, 'devices', device.id);
  const saleRef = doc(collection(db, 'sales'));
  const auditRef = doc(collection(db, 'auditLogs'));
  const batch = writeBatch(db);

  const deviceSaleUpdate: Record<string, unknown> = {
    soldBy: actor.uid,
    soldByName: sellerName,
    soldAt: serverTimestamp(),
    saleId: saleRef.id,
    updatedAt: serverTimestamp(),
  };

  if (device.status === 'reservado' || device.reservation) {
    deviceSaleUpdate.reservation = deleteField();
    if (nextStatus === 'disponivel') {
      deviceSaleUpdate.status = 'disponivel';
    }
  }

  if (nextVariants) {
    deviceSaleUpdate.color = nextPrimaryColor;
    deviceSaleUpdate.colorVariants = nextVariants;
  }
  if (nextStatus === 'vendido') {
    deviceSaleUpdate.status = 'vendido';
    if (saleImei && saleImei !== device.imei) {
      deviceSaleUpdate.imei = saleImei;
    }
  }

  batch.update(deviceRef, deviceSaleUpdate);

  if (tradeInDeviceRef && normalizedTradeIn) {
    batch.set(tradeInDeviceRef, {
      model: normalizedTradeIn.model,
      storageGb: normalizedTradeIn.storageGb,
      batteryHealth: normalizedTradeIn.batteryHealth,
      color: normalizedTradeIn.color,
      condition: 'seminovo',
      price: normalizedTradeIn.resalePrice,
      status: 'disponivel',
      ...(normalizedTradeIn.imei ? { imei: normalizedTradeIn.imei } : {}),
      notes: clampString(
        `Entrada via troca (${normalizedModel}${customerName ? ` · ${customerName}` : ''})`,
        SCHEMA_LIMITS.NOTES_MAX
      ),
      tradeInFromSaleId: saleRef.id,
      createdBy: actor.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  const salePayload: Omit<SaleRecord, 'id' | 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
    deviceId: device.id,
    model: normalizedModel,
    storageGb: device.storageGb,
    batteryHealth: device.batteryHealth,
    color: soldColor,
    condition: device.condition,
    ...(saleImei ? { imei: saleImei } : {}),
    salePrice,
    paymentMethod: input.paymentMethod,
    ...(normalizedBreakdown ? { paymentBreakdown: normalizedBreakdown } : {}),
    ...(installments !== undefined ? { installments } : {}),
    ...(cardFeePercent !== undefined ? { cardFeePercent } : {}),
    warrantyDays,
    ...(normalizedTradeIn ? { tradeIn: normalizedTradeIn } : {}),
    ...(customerName ? { customerName } : {}),
    ...(customerPhone ? { customerPhone } : {}),
    sellerId: actor.uid,
    sellerName,
    createdAt: serverTimestamp(),
  };

  batch.set(saleRef, salePayload);

  const paymentAuditText =
    input.paymentMethod === 'misto' && normalizedBreakdown
      ? `Misto (${formatPaymentBreakdown(normalizedBreakdown)})`
      : installments && installments > 1
        ? `${PAYMENT_LABELS[input.paymentMethod]} ${installments}x`
        : PAYMENT_LABELS[input.paymentMethod];
  const tradeInAuditText = normalizedTradeIn
    ? ` · Troca: ${normalizedTradeIn.model} (-${formatBRL(normalizedTradeIn.tradeInValue)})`
    : '';

  batch.set(
    auditRef,
    buildAuditPayload(
      actor,
      'REGISTER_SALE',
      device.id,
      `Vendeu ${normalizedModel} ${formatStorage(device.storageGb)} · ${soldColor} (${device.condition === 'lacrado' ? 'Lacrado' : 'Seminovo'}) por ${formatBRL(salePrice)} via ${paymentAuditText}${tradeInAuditText}`
    )
  );

  try {
    await batch.commit();
    return {
      id: saleRef.id,
      deviceId: device.id,
      model: normalizedModel,
      storageGb: device.storageGb,
      batteryHealth: device.batteryHealth,
      color: soldColor,
      condition: device.condition,
      ...(saleImei ? { imei: saleImei } : {}),
      salePrice,
      paymentMethod: input.paymentMethod,
      ...(normalizedBreakdown ? { paymentBreakdown: normalizedBreakdown } : {}),
      ...(installments !== undefined ? { installments } : {}),
      ...(cardFeePercent !== undefined ? { cardFeePercent } : {}),
      warrantyDays,
      ...(normalizedTradeIn ? { tradeIn: normalizedTradeIn } : {}),
      ...(customerName ? { customerName } : {}),
      ...(customerPhone ? { customerPhone } : {}),
      sellerId: actor.uid,
      sellerName,
      createdAt: null,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `sales/${saleRef.id}`);
  }
}

export interface CreateStaffUserInput {
  displayName: string;
  username: string;
  password: string;
  role: UserRole;
}

export async function createStaffUser(
  input: CreateStaffUserInput,
  admin: ActorContext
): Promise<string> {
  const displayName = clampString(
    formatTitleName(input.displayName),
    SCHEMA_LIMITS.DISPLAY_NAME_MAX
  );
  const username = extractUsername(input.username);
  if (username.length < SCHEMA_LIMITS.USERNAME_MIN) {
    throw new Error('O nome de usuário deve ter pelo menos 3 caracteres válidos.');
  }
  const email = normalizeLoginIdentifier(username);

  const { secondaryAuth, cleanup } = getSecondaryProvisioningAuth();
  let createdAuthUser: { uid: string; delete: () => Promise<void> } | null = null;
  let newUid = '';

  try {
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      input.password
    );
    createdAuthUser = credential.user;
    newUid = credential.user.uid;

    const userRef = doc(db, 'users', newUid);
    const directoryRef = doc(db, 'staffDirectory', newUid);
    const auditRef = doc(collection(db, 'auditLogs'));
    const batch = writeBatch(db);

    batch.set(userRef, {
      uid: newUid,
      username,
      email,
      displayName,
      role: input.role,
      active: true,
      createdBy: admin.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(directoryRef, {
      uid: newUid,
      username,
      displayName,
      role: input.role,
      active: true,
      createdBy: admin.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(
      auditRef,
      buildAuditPayload(
        admin,
        'CREATE_USER',
        newUid,
        `Criou acesso para ${displayName} (@${username}) como ${input.role === 'admin' ? 'Administrador' : 'Vendedor'}`
      )
    );

    try {
      await batch.commit();
      return newUid;
    } catch (error) {
      if (createdAuthUser) {
        try {
          await deleteUser(credential.user);
        } catch (delErr) {
          console.warn('Falha ao reverter usuário do Auth após erro no Firestore:', delErr);
        }
      }
      handleFirestoreError(error, OperationType.WRITE, `users/${newUid}`);
    }
    return newUid;
  } finally {
    try {
      await signOut(secondaryAuth);
    } catch {
      // ignore
    }
    await cleanup();
  }
}

export async function updateStaffAccess(
  member: StaffDirectoryMember | UserAccount,
  updates: { active: boolean; role: UserRole; displayName?: string },
  admin: ActorContext
): Promise<void> {
  const displayName = clampString(
    formatTitleName(updates.displayName || member.displayName),
    SCHEMA_LIMITS.DISPLAY_NAME_MAX
  );
  const userRef = doc(db, 'users', member.uid);
  const directoryRef = doc(db, 'staffDirectory', member.uid);
  const auditRef = doc(collection(db, 'auditLogs'));
  const batch = writeBatch(db);

  batch.update(userRef, {
    active: updates.active,
    role: updates.role,
    displayName,
    updatedAt: serverTimestamp(),
  });

  batch.update(directoryRef, {
    active: updates.active,
    role: updates.role,
    displayName,
    updatedAt: serverTimestamp(),
  });

  const statusText = updates.active ? 'Ativou' : 'Bloqueou';
  const roleText = updates.role === 'admin' ? 'Administrador' : 'Vendedor';
  batch.set(
    auditRef,
    buildAuditPayload(
      admin,
      'UPDATE_USER_STATUS',
      member.uid,
      `${statusText} acesso de ${displayName} (@${member.username}) — Perfil: ${roleText}`
    )
  );

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${member.uid}`);
  }
}

export interface UpdateOwnProfileInput {
  displayName: string;
  username?: string;
  usernameConfirmed?: boolean;
}

export async function updateOwnProfile(
  uid: string,
  input: UpdateOwnProfileInput,
  staffList: StaffDirectoryMember[] = []
): Promise<{ displayName: string; username?: string }> {
  const displayName = clampString(
    formatTitleName(input.displayName),
    SCHEMA_LIMITS.DISPLAY_NAME_MAX
  );
  if (displayName.length < SCHEMA_LIMITS.DISPLAY_NAME_MIN) {
    throw new Error('Informe um nome de exibição com pelo menos 2 caracteres.');
  }

  let cleanUsername: string | undefined;
  if (input.username !== undefined) {
    cleanUsername = extractUsername(input.username);
    if (
      cleanUsername.length < SCHEMA_LIMITS.USERNAME_MIN ||
      cleanUsername.length > SCHEMA_LIMITS.USERNAME_MAX ||
      !SCHEMA_LIMITS.USERNAME_PATTERN.test(cleanUsername)
    ) {
      throw new Error('Use de 3 a 50 caracteres (letras, números, ponto, traço ou sublinhado).');
    }
    const conflict = staffList.find(
      (m) => m.uid !== uid && m.username.toLowerCase() === cleanUsername!.toLowerCase()
    );
    if (conflict) {
      throw new Error(`O usuário @${cleanUsername} já está sendo usado por ${conflict.displayName}.`);
    }
  }

  const userRef = doc(db, 'users', uid);
  const directoryRef = doc(db, 'staffDirectory', uid);
  const batch = writeBatch(db);

  const userUpdates: Record<string, unknown> = {
    displayName,
    updatedAt: serverTimestamp(),
  };
  const directoryUpdates: Record<string, unknown> = {
    displayName,
    updatedAt: serverTimestamp(),
  };

  if (cleanUsername !== undefined) {
    userUpdates.username = cleanUsername;
    directoryUpdates.username = cleanUsername;
  }
  if (input.usernameConfirmed !== undefined) {
    userUpdates.usernameConfirmed = input.usernameConfirmed;
  }

  batch.update(userRef, userUpdates);
  batch.update(directoryRef, directoryUpdates);

  try {
    await batch.commit();
    return { displayName, username: cleanUsername };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

function normalizeInstallmentRates(raw?: Partial<InstallmentRates>): InstallmentRates {
  const keys: InstallmentCountKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const out = {} as InstallmentRates;
  for (const k of keys) {
    const val = Number(raw?.[k] ?? DEFAULT_INSTALLMENT_RATES[k]);
    out[k] = Math.round(Math.max(0, Math.min(SCHEMA_LIMITS.RATE_MAX, Number.isFinite(val) ? val : 0)) * 100) / 100;
  }
  return out;
}

export async function saveStoreSettings(
  input: StoreSettings,
  admin: ActorContext
): Promise<void> {
  const storeName = clampString(
    formatTitleName(input.storeName),
    SCHEMA_LIMITS.STORE_NAME_MAX
  );
  if (storeName.length < SCHEMA_LIMITS.STORE_NAME_MIN) {
    throw new Error('O nome da loja deve ter pelo menos 2 caracteres.');
  }
  const storeTagline = clampString(input.storeTagline || '', SCHEMA_LIMITS.STORE_TAGLINE_MAX);
  const storePhone = clampString(input.storePhone || '', SCHEMA_LIMITS.STORE_PHONE_MAX);
  const storeDocument = clampString(input.storeDocument || '', SCHEMA_LIMITS.STORE_DOCUMENT_MAX);
  const storeAddress = clampString(input.storeAddress || '', SCHEMA_LIMITS.STORE_ADDRESS_MAX);
  const storePixKey = clampString(input.storePixKey || '', SCHEMA_LIMITS.STORE_PIX_MAX);
  const warrantyTerms = clampString(input.warrantyTerms || '', SCHEMA_LIMITS.WARRANTY_TERMS_MAX);
  const whatsappListFooter = clampString(
    input.whatsappListFooter || '',
    SCHEMA_LIMITS.WHATSAPP_FOOTER_MAX
  );
  const cleanPrefix =
    input.labelPrefix
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, SCHEMA_LIMITS.LABEL_PREFIX_MAX) || 'LC';
  const lowBatteryWarningThreshold = Math.max(
    50,
    Math.min(95, Math.round(input.lowBatteryWarningThreshold))
  );
  const lowStockThreshold = Math.max(
    0,
    Math.min(SCHEMA_LIMITS.LOW_STOCK_MAX, Math.round(input.lowStockThreshold ?? 1))
  );
  const warrantyDaysLacrado = Math.max(
    0,
    Math.min(SCHEMA_LIMITS.WARRANTY_DAYS_MAX, Math.round(input.warrantyDaysLacrado ?? 365))
  );
  const warrantyDaysSeminovo = Math.max(
    0,
    Math.min(SCHEMA_LIMITS.WARRANTY_DAYS_MAX, Math.round(input.warrantyDaysSeminovo ?? 90))
  );
  const debitFeeVal = Number(input.debitFeePercent ?? 0);
  const debitFeePercent =
    Math.round(
      Math.max(0, Math.min(SCHEMA_LIMITS.RATE_MAX, Number.isFinite(debitFeeVal) ? debitFeeVal : 0)) *
        100
    ) / 100;
  const installmentRates = normalizeInstallmentRates(input.installmentRates);
  const defaultStorageGb = Math.max(16, Math.min(4096, Math.round(input.defaultStorageGb)));

  const settingsRef = doc(db, 'settings', 'store');
  const auditRef = doc(collection(db, 'auditLogs'));
  const batch = writeBatch(db);

  batch.set(settingsRef, {
    storeName,
    storeTagline,
    storePhone,
    storeDocument,
    storeAddress,
    storePixKey,
    defaultCondition: input.defaultCondition,
    defaultStorageGb,
    defaultPaymentMethod: input.defaultPaymentMethod,
    allowSellerPriceEdit: Boolean(input.allowSellerPriceEdit),
    requireCustomerOnSale: Boolean(input.requireCustomerOnSale),
    requireCustomerPhoneOnSale: Boolean(input.requireCustomerPhoneOnSale),
    allowSellerTradeIn: input.allowSellerTradeIn !== false,
    allowSellerReserve: input.allowSellerReserve !== false,
    lowBatteryWarningThreshold,
    lowStockThreshold,
    warrantyDaysLacrado,
    warrantyDaysSeminovo,
    warrantyTerms,
    whatsappListFooter,
    debitFeePercent,
    passCardFeeToCustomer: Boolean(input.passCardFeeToCustomer),
    cardFeeCalculationMode:
      input.cardFeeCalculationMode === 'simple_markup'
        ? 'simple_markup'
        : 'infinitepay_repasse',
    installmentRates,
    defaultLabelPresetId: input.defaultLabelPresetId,
    defaultLabelStyleId: input.defaultLabelStyleId,
    labelShowStore: Boolean(input.labelShowStore),
    labelShowPrice: Boolean(input.labelShowPrice),
    labelShowBarcode: Boolean(input.labelShowBarcode),
    labelPrefix: cleanPrefix,
    updatedBy: admin.uid,
    updatedAt: serverTimestamp(),
  });

  batch.set(
    auditRef,
    buildAuditPayload(
      admin,
      'UPDATE_SETTINGS',
      'store',
      `Atualizou configurações da loja (${storeName} · etiqueta ${input.defaultLabelPresetId} · prefixo ${cleanPrefix})`
    )
  );

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/store');
  }
}
