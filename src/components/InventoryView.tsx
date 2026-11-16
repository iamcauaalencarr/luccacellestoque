import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  CopyPlus,
  ListChecks,
  Pencil,
  Plus,
  Printer,
  Search,
  Share2,
  ShoppingBag,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import {
  DEFAULT_INSTALLMENT_RATES,
  type DeviceCondition,
  type DeviceItem,
  type DeviceStatus,
  type StoreSettings,
} from '../types';
import {
  calculateInstallment,
  formatBRL,
  formatDeviceModelName,
  formatShortDate,
  formatStorage,
  formatTitleName,
  getAvailableColorVariants,
  getDeviceColorVariants,
  getDeviceTotalStock,
} from '../utils/formatters';
import { deleteDevice } from '../services/storeService';
import { useAuth } from '../contexts/AuthContext';
import { DeviceThumbnail } from './DeviceThumbnail';
import { getAppleColorHex } from '../utils/appleImages';
import { WhatsAppListSheet } from './WhatsAppListSheet';

type InventorySort = 'recentes' | 'menor_preco' | 'maior_preco' | 'modelo';

interface InventoryViewProps {
  devices: DeviceItem[];
  settings: StoreSettings;
  loading: boolean;
  onAddDevice: () => void;
  onEditDevice: (device: DeviceItem) => void;
  onDuplicateDevice: (device: DeviceItem) => void;
  onReserveDevice: (device: DeviceItem) => void;
  onSellDevice: (device: DeviceItem) => void;
  onPrintLabel: (device: DeviceItem) => void;
  onNotify: (type: 'success' | 'error' | 'info', text: string) => void;
}

interface LowStockEntry {
  device: DeviceItem;
  model: string;
  storageGb: number;
  color: string;
  quantity: number;
}

export function InventoryView({
  devices,
  settings,
  loading,
  onAddDevice,
  onEditDevice,
  onDuplicateDevice,
  onReserveDevice,
  onSellDevice,
  onPrintLabel,
  onNotify,
}: InventoryViewProps) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<InventorySort>('recentes');
  const [conditionFilter, setConditionFilter] = useState<'todos' | DeviceCondition>('todos');
  const [statusFilter, setStatusFilter] = useState<DeviceStatus>('disponivel');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedRestock, setCopiedRestock] = useState(false);
  const [showRestockList, setShowRestockList] = useState(false);
  const [previewColors, setPreviewColors] = useState<Record<string, string>>({});
  const [showWhatsAppList, setShowWhatsAppList] = useState(false);

  const summary = useMemo(() => {
    const available = devices.filter((d) => d.status === 'disponivel');
    const reserved = devices.filter((d) => d.status === 'reservado');
    const sold = devices.filter((d) => d.status === 'vendido');
    const lacrados = available.filter((d) => d.condition === 'lacrado');
    const seminovos = available.filter((d) => d.condition === 'seminovo');
    const lacradosUnits = lacrados.reduce((acc, d) => acc + getDeviceTotalStock(d), 0);
    const seminovosUnits = seminovos.length;
    return {
      totalAvailable: lacradosUnits + seminovosUnits,
      reservedCount: reserved.length,
      lacradosCount: lacradosUnits,
      lacradosValue: lacrados.reduce((acc, d) => acc + d.price * getDeviceTotalStock(d), 0),
      seminovosCount: seminovosUnits,
      seminovosValue: seminovos.reduce((acc, d) => acc + d.price, 0),
      soldCount: sold.length,
    };
  }, [devices]);

  const lowStockAlerts = useMemo<LowStockEntry[]>(() => {
    const threshold = settings.lowStockThreshold ?? 1;
    const alerts: LowStockEntry[] = [];
    for (const d of devices) {
      if (d.status !== 'disponivel' || d.condition !== 'lacrado') continue;
      if (d.colorVariants && d.colorVariants.length > 0) {
        const variants = getDeviceColorVariants(d);
        for (const v of variants) {
          if (v.quantity <= threshold) {
            alerts.push({
              device: d,
              model: formatDeviceModelName(d.model),
              storageGb: d.storageGb,
              color: v.color,
              quantity: v.quantity,
            });
          }
        }
      } else if (1 <= threshold) {
        alerts.push({
          device: d,
          model: formatDeviceModelName(d.model),
          storageGb: d.storageGb,
          color: formatTitleName(d.color),
          quantity: 1,
        });
      }
    }
    return alerts.sort((a, b) => a.quantity - b.quantity);
  }, [devices, settings.lowStockThreshold]);

  const filteredDevices = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = devices.filter((d) => {
      if (d.status !== statusFilter) return false;
      if (conditionFilter !== 'todos' && d.condition !== conditionFilter) return false;
      if (!q) return true;
      return (
        d.model.toLowerCase().includes(q) ||
        d.color.toLowerCase().includes(q) ||
        Boolean(d.colorVariants?.some((v) => v.color.toLowerCase().includes(q))) ||
        String(d.storageGb).includes(q) ||
        (d.imei && d.imei.toLowerCase().includes(q)) ||
        (d.reservation?.customerName && d.reservation.customerName.toLowerCase().includes(q)) ||
        (d.notes && d.notes.toLowerCase().includes(q))
      );
    });

    if (sortBy === 'menor_preco') {
      return [...list].sort((a, b) => a.price - b.price);
    }
    if (sortBy === 'maior_preco') {
      return [...list].sort((a, b) => b.price - a.price);
    }
    if (sortBy === 'modelo') {
      return [...list].sort((a, b) => a.model.localeCompare(b.model, 'pt-BR'));
    }
    return list;
  }, [devices, search, conditionFilter, statusFilter, sortBy]);

  const handleConfirmDelete = async (device: DeviceItem) => {
    if (!profile) return;
    setDeletingId(device.id);
    try {
      await deleteDevice(device, {
        uid: profile.uid,
        displayName: profile.displayName,
        role: profile.role,
      });
      onNotify('success', `${formatDeviceModelName(device.model)} removido do estoque.`);
      setConfirmDeleteId(null);
    } catch {
      onNotify('error', 'Não foi possível excluir o aparelho.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyQuote = async (device: DeviceItem) => {
    const condLabel = device.condition === 'lacrado' ? 'Lacrado' : 'Seminovo';
    const modelLabel = formatDeviceModelName(device.model);
    const activeColors = getAvailableColorVariants(device);
    const colorLine =
      activeColors.length > 1
        ? `Cores disponíveis: ${activeColors.map((v) => v.color).join(', ')}`
        : `Cor: ${activeColors[0]?.color || formatTitleName(device.color)}`;
    const parcel12 = calculateInstallment(
      device.price,
      12,
      settings.installmentRates || DEFAULT_INSTALLMENT_RATES,
      settings.passCardFeeToCustomer
    );
    const lines = [
      `*${formatTitleName(settings.storeName)}*`,
      `${modelLabel} · ${formatStorage(device.storageGb)}`,
      colorLine,
      `Condição: ${condLabel}${device.condition === 'seminovo' ? ` (Bateria ${device.batteryHealth}%)` : ''}`,
      `Valor à vista: *${formatBRL(device.price)}*`,
      `Cartão: até *12x de ${formatBRL(parcel12.installmentValue)}*`,
      device.notes ? `Obs: ${device.notes}` : null,
      settings.storePhone ? `Contato: ${settings.storePhone}` : null,
    ].filter(Boolean);

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedId(device.id);
      onNotify('success', `Ficha de ${modelLabel} copiada para enviar ao cliente.`);
      setTimeout(() => {
        setCopiedId((prev) => (prev === device.id ? null : prev));
      }, 2000);
    } catch {
      onNotify('error', 'Não foi possível copiar a ficha do aparelho.');
    }
  };

  const handleCopyRestockOrder = async () => {
    if (lowStockAlerts.length === 0) return;
    const today = new Intl.DateTimeFormat('pt-BR').format(new Date());
    const lines = [
      `*PEDIDO DE REPOSIÇÃO · ${settings.storeName.toUpperCase()}*`,
      `Data: ${today}`,
      ``,
      ...lowStockAlerts.map(
        (item) =>
          `• ${item.model} ${formatStorage(item.storageGb)} · ${item.color} (${
            item.quantity === 0 ? 'Esgotado' : `Resta ${item.quantity} un.`
          })`
      ),
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedRestock(true);
      onNotify('success', 'Lista de reposição copiada para enviar ao fornecedor.');
      setTimeout(() => setCopiedRestock(false), 2000);
    } catch {
      onNotify('error', 'Não foi possível copiar a lista de reposição.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-white">
            Estoque de Aparelhos
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            {summary.totalAvailable} disponíveis
            {summary.reservedCount > 0 ? ` · ${summary.reservedCount} reservados` : ''} ·{' '}
            {summary.soldCount} vendidos
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {summary.totalAvailable > 0 && (
            <button
              type="button"
              onClick={() => setShowWhatsAppList(true)}
              className="flex-1 sm:flex-initial min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#1A1A20] hover:bg-[#24242C] border border-[#26262E] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <ListChecks className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <span>Lista WhatsApp</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={onAddDevice}
              className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-black font-semibold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Novo Aparelho</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Comparison Strip: Lacrados vs Seminovos */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <div className="bg-[#121216] border border-[#26262E] rounded-2xl p-3.5 sm:p-4 space-y-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-xs font-medium text-[#D4AF37]">Lacrados</span>
            <span className="font-mono-tabular text-[11px] sm:text-xs text-zinc-400 whitespace-nowrap">
              {summary.lacradosCount} un.
            </span>
          </div>
          <p className="font-mono-tabular text-base sm:text-xl font-bold text-white whitespace-nowrap">
            {formatBRL(summary.lacradosValue)}
          </p>
        </div>

        <div className="bg-[#121216] border border-[#26262E] rounded-2xl p-3.5 sm:p-4 space-y-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-xs font-medium text-white">Seminovos</span>
            <span className="font-mono-tabular text-[11px] sm:text-xs text-zinc-400 whitespace-nowrap">
              {summary.seminovosCount} un.
            </span>
          </div>
          <p className="font-mono-tabular text-base sm:text-xl font-bold text-white whitespace-nowrap">
            {formatBRL(summary.seminovosValue)}
          </p>
        </div>
      </div>

      {/* Low-Stock Restock Alert Strip */}
      {lowStockAlerts.length > 0 && statusFilter !== 'vendido' && (
        <div className="bg-[#17140E] border border-amber-500/35 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowRestockList((v) => !v)}
              className="flex items-center gap-2 text-left min-w-0 flex-1"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-amber-200 truncate">
                Alerta de Reposição ({lowStockAlerts.length}{' '}
                {lowStockAlerts.length === 1 ? 'variação' : 'variações'})
              </span>
              {showRestockList ? (
                <ChevronUp className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-amber-400 shrink-0" />
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyRestockOrder}
              className="min-h-[36px] px-2.5 rounded-lg bg-[#252015] hover:bg-[#322B1C] text-amber-300 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              {copiedRestock ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedRestock ? 'Copiado' : 'Copiar Pedido'}</span>
            </button>
          </div>

          {showRestockList && (
            <div className="pt-2 border-t border-amber-500/20 divide-y divide-amber-500/15">
              {lowStockAlerts.map((item, idx) => (
                <div
                  key={`${item.device.id}-${item.color}-${idx}`}
                  className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">
                      {item.model} · {formatStorage(item.storageGb)} ·{' '}
                      <span className="text-zinc-300">{item.color}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-mono-tabular font-semibold ${
                        item.quantity === 0 ? 'text-red-400' : 'text-amber-300'
                      }`}
                    >
                      {item.quantity === 0 ? 'Esgotado' : `${item.quantity} un.`}
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => onEditDevice(item.device)}
                        className="min-h-[32px] px-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] text-black font-semibold text-[11px]"
                      >
                        Repor
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search, Sort & Segmented Filters */}
      <div className="space-y-2.5 sm:space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por modelo, cor, GB ou IMEI..."
              className="w-full min-h-[46px] pl-10 pr-11 rounded-xl bg-[#121216] border border-[#26262E] text-white placeholder:text-zinc-500 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Limpar busca"
                className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <select
            aria-label="Ordenar aparelhos"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as InventorySort)}
            className="w-full sm:w-44 min-h-[46px] px-3 rounded-xl bg-[#121216] border border-[#26262E] text-base sm:text-sm text-white focus:outline-none focus:border-[#D4AF37] shrink-0"
          >
            <option value="recentes">Mais recentes</option>
            <option value="menor_preco">Menor preço</option>
            <option value="maior_preco">Maior preço</option>
            <option value="modelo">Modelo (A-Z)</option>
          </select>
        </div>

        <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#121216] border border-[#26262E] rounded-xl md:w-auto shrink-0">
            {(['todos', 'lacrado', 'seminovo'] as const).map((cond) => (
              <button
                key={cond}
                type="button"
                onClick={() => setConditionFilter(cond)}
                className={`min-h-[40px] px-2.5 sm:px-3.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  conditionFilter === cond
                    ? 'bg-[#D4AF37] text-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {cond === 'todos' ? 'Todos' : cond === 'lacrado' ? 'Lacrados' : 'Seminovos'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-1 p-1 bg-[#121216] border border-[#26262E] rounded-xl md:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('disponivel')}
              className={`min-h-[40px] px-2 sm:px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                statusFilter === 'disponivel'
                  ? 'bg-white text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Disponíveis ({summary.totalAvailable})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('reservado')}
              className={`min-h-[40px] px-2 sm:px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                statusFilter === 'reservado'
                  ? 'bg-[#D4AF37] text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Reservados ({summary.reservedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('vendido')}
              className={`min-h-[40px] px-2 sm:px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                statusFilter === 'vendido'
                  ? 'bg-white text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Vendidos ({summary.soldCount})
            </button>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-36 bg-[#121216] border border-[#26262E] rounded-2xl p-4 animate-pulse"
            />
          ))}
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="bg-[#121216] border border-[#26262E] rounded-2xl p-8 text-center space-y-3">
          <div className="w-11 h-11 rounded-2xl bg-[#1A1A20] text-[#D4AF37] flex items-center justify-center mx-auto">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="font-display font-semibold text-white text-base">
              Nenhum aparelho encontrado
            </p>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto">
              {devices.length === 0
                ? 'O estoque ainda está vazio. Cadastre o primeiro aparelho lacrado ou seminovo.'
                : 'Ajuste os filtros ou a busca para visualizar outros aparelhos.'}
            </p>
          </div>
          {isAdmin && devices.length === 0 && (
            <button
              type="button"
              onClick={onAddDevice}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-black font-semibold text-sm inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Primeiro Aparelho
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredDevices.map((device) => {
            const isAvailable = device.status === 'disponivel';
            const isReserved = device.status === 'reservado';
            const isConfirmingDelete = confirmDeleteId === device.id;
            const isCopied = copiedId === device.id;
            const totalStock = getDeviceTotalStock(device);
            const activeColors = getAvailableColorVariants(device);
            const hasMultipleColorOptions =
              (isAvailable || isReserved) &&
              device.condition === 'lacrado' &&
              (activeColors.length > 1 || totalStock > 1);
            const fallbackColor =
              (isReserved && device.reservation?.reservedColor) ||
              activeColors[0]?.color ||
              formatTitleName(device.color);
            const selectedPreviewColor =
              hasMultipleColorOptions &&
              previewColors[device.id] &&
              activeColors.some((v) => v.color === previewColors[device.id])
                ? previewColors[device.id]
                : fallbackColor;
            const singleColorHex = getAppleColorHex(selectedPreviewColor, device.model);
            const parcel12 = calculateInstallment(
              device.price,
              12,
              settings.installmentRates || DEFAULT_INSTALLMENT_RATES,
              settings.passCardFeeToCustomer
            );
            const canFinalizeReserved =
              isReserved &&
              (isAdmin || device.reservation?.reservedBy === profile?.uid);

            return (
              <article
                key={device.id}
                className="bg-[#121216] border border-[#26262E] rounded-2xl p-4 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <DeviceThumbnail
                    model={device.model}
                    color={selectedPreviewColor}
                    size="md"
                    className="mt-0.5"
                  />

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="font-display font-semibold text-base text-white leading-snug break-words">
                          {formatDeviceModelName(device.model)}
                        </h2>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono-tabular font-bold text-base text-[#D4AF37] whitespace-nowrap block leading-snug">
                          {formatBRL(device.price)}
                        </span>
                        {(isAvailable || isReserved) && (
                          <span className="text-[11px] text-zinc-400 font-mono-tabular block whitespace-nowrap">
                            12x {formatBRL(parcel12.installmentValue)}
                          </span>
                        )}
                        {isAvailable && (
                          <span className="text-[11px] font-medium text-emerald-400 font-mono-tabular block">
                            {totalStock > 1 ? `${totalStock} un. disponíveis` : 'Disponível'}
                          </span>
                        )}
                        {isReserved && (
                          <span className="text-[11px] font-semibold text-amber-300 block">
                            Reservado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Unboxed Metadata with typographic separators */}
                    <p className="text-xs text-zinc-300 font-mono-tabular leading-relaxed">
                      {formatStorage(device.storageGb)}
                      {!hasMultipleColorOptions && (
                        <>
                          <span className="text-zinc-600 mx-1.5" aria-hidden="true">
                            ·
                          </span>
                          <span className="font-sans inline-flex items-center gap-1.5 align-baseline">
                            {singleColorHex && (
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-white/25 inline-block shrink-0 translate-y-[1px]"
                                style={{ backgroundColor: singleColorHex }}
                                aria-hidden="true"
                              />
                            )}
                            <span>{selectedPreviewColor}</span>
                          </span>
                        </>
                      )}
                      <span className="text-zinc-600 mx-1.5" aria-hidden="true">
                        ·
                      </span>
                      <span
                        className={
                          device.condition === 'seminovo' &&
                          device.batteryHealth < settings.lowBatteryWarningThreshold
                            ? 'text-amber-400 font-semibold'
                            : ''
                        }
                      >
                        Bat. {device.batteryHealth}%
                      </span>
                      <span className="text-zinc-600 mx-1.5" aria-hidden="true">
                        ·
                      </span>
                      <span
                        className={
                          device.condition === 'lacrado'
                            ? 'text-[#D4AF37] font-sans font-medium'
                            : 'text-white font-sans font-medium'
                        }
                      >
                        {device.condition === 'lacrado' ? 'Lacrado' : 'Seminovo'}
                      </span>
                    </p>

                    {device.imei && (
                      <p className="text-[11px] text-zinc-400 font-mono-tabular truncate">
                        IMEI {device.imei}
                      </p>
                    )}

                    {hasMultipleColorOptions && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {activeColors.map((v) => {
                          const isPreviewed = selectedPreviewColor === v.color;
                          const swatchHex = getAppleColorHex(v.color, device.model);
                          const isLow = v.quantity <= (settings.lowStockThreshold ?? 1);
                          return (
                            <button
                              key={v.color}
                              type="button"
                              aria-pressed={isPreviewed}
                              onClick={() =>
                                setPreviewColors((prev) => ({ ...prev, [device.id]: v.color }))
                              }
                              className={`min-h-[32px] px-2 py-1 rounded-lg text-xs border transition-colors inline-flex items-center gap-1.5 ${
                                isPreviewed
                                  ? 'bg-[#1A1A20] border-[#D4AF37] text-white font-medium'
                                  : isLow
                                    ? 'bg-[#09090B] border-amber-500/40 text-amber-200 hover:border-amber-400'
                                    : 'bg-[#09090B] border-[#26262E] text-zinc-300 hover:border-zinc-500'
                              }`}
                            >
                              {swatchHex && (
                                <span
                                  className="w-2.5 h-2.5 rounded-full border border-white/25 shrink-0"
                                  style={{ backgroundColor: swatchHex }}
                                  aria-hidden="true"
                                />
                              )}
                              <span>{v.color}</span>
                              <span
                                className={`font-mono-tabular ${
                                  isLow ? 'text-amber-300' : 'text-zinc-400'
                                }`}
                              >
                                ({v.quantity})
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {isReserved && device.reservation && (
                      <p className="text-xs text-amber-200/90 leading-snug">
                        Cliente: <strong className="text-white">{device.reservation.customerName}</strong>
                        {device.reservation.depositAmount
                          ? ` · Sinal ${formatBRL(device.reservation.depositAmount)}`
                          : ''}
                        {' · '}
                        <span className="text-zinc-400">por {device.reservation.reservedByName}</span>
                      </p>
                    )}

                    {device.notes && (
                      <p className="text-xs text-zinc-400 line-clamp-2">{device.notes}</p>
                    )}
                  </div>
                </div>

                {/* Footer / Actions */}
                <div className="pt-3 border-t border-[#202028] flex items-center justify-between gap-2">
                  {isAvailable ? (
                    isAdmin && isConfirmingDelete ? (
                      <div className="w-full flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-red-300 font-medium whitespace-nowrap">
                          Excluir item?
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="min-h-[44px] px-3 rounded-xl bg-[#1A1A20] text-xs font-medium text-zinc-300 whitespace-nowrap"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === device.id}
                            onClick={() => handleConfirmDelete(device)}
                            className="min-h-[44px] px-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white whitespace-nowrap"
                          >
                            {deletingId === device.id ? 'Excluindo...' : 'Excluir'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center justify-between sm:justify-start gap-1 w-full sm:w-auto min-w-0">
                          <button
                            type="button"
                            onClick={() => onPrintLabel(device)}
                            aria-label={`Etiqueta NIIMBOT de ${device.model}`}
                            title="Etiqueta NIIMBOT"
                            className="flex-1 sm:flex-initial min-w-[40px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#1A1A20] hover:bg-[#24242C] text-[#D4AF37] hover:text-[#E5C158] transition-colors active:scale-95"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyQuote(device)}
                            aria-label={`Copiar ficha de ${device.model}`}
                            title="Copiar ficha para WhatsApp"
                            className="flex-1 sm:flex-initial min-w-[40px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#1A1A20] hover:bg-[#24242C] text-zinc-300 hover:text-white transition-colors active:scale-95"
                          >
                            {isCopied ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Share2 className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => onReserveDevice(device)}
                            aria-label={`Reservar ${device.model}`}
                            title="Reservar aparelho / sinal"
                            className="flex-1 sm:flex-initial min-w-[40px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#1A1A20] hover:bg-[#24242C] text-zinc-300 hover:text-[#D4AF37] transition-colors active:scale-95"
                          >
                            <Bookmark className="w-4 h-4" />
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => onDuplicateDevice(device)}
                                aria-label={`Duplicar ${device.model}`}
                                title="Duplicar aparelho"
                                className="flex-1 sm:flex-initial min-w-[40px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#1A1A20] hover:bg-[#24242C] text-zinc-300 hover:text-white transition-colors active:scale-95"
                              >
                                <CopyPlus className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onEditDevice(device)}
                                aria-label={`Editar ${device.model}`}
                                title="Editar aparelho"
                                className="flex-1 sm:flex-initial min-w-[40px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#1A1A20] hover:bg-[#24242C] text-zinc-300 hover:text-white transition-colors active:scale-95"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(device.id)}
                                aria-label={`Remover ${device.model}`}
                                title="Remover aparelho"
                                className="flex-1 sm:flex-initial min-w-[40px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#1A1A20] hover:bg-red-950/50 text-zinc-400 hover:text-red-400 transition-colors active:scale-95"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => onSellDevice(device)}
                          className="w-full sm:w-auto min-h-[44px] px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 active:scale-[0.98]"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                          Vender
                        </button>
                      </div>
                    )
                  ) : isReserved ? (
                    <div className="w-full flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onReserveDevice(device)}
                        className="flex-1 sm:flex-initial min-h-[44px] px-3 rounded-xl bg-[#1A1A20] hover:bg-[#24242C] text-[#D4AF37] text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        <BookmarkCheck className="w-4 h-4 shrink-0" />
                        <span>Ver Reserva</span>
                      </button>

                      {canFinalizeReserved && (
                        <button
                          type="button"
                          onClick={() => onSellDevice(device)}
                          className="flex-1 sm:flex-initial min-h-[44px] px-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-black font-semibold text-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                          <span>Concluir Venda</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="w-full flex items-center justify-between gap-2 text-xs text-zinc-400">
                      <span className="truncate">
                        Vendido por{' '}
                        <strong className="text-zinc-200 font-medium">
                          {device.soldByName ? formatTitleName(device.soldByName) : 'Vendedor'}
                        </strong>
                      </span>
                      <span className="font-mono-tabular whitespace-nowrap shrink-0">
                        {formatShortDate(device.soldAt)}
                      </span>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <WhatsAppListSheet
        open={showWhatsAppList}
        devices={devices}
        settings={settings}
        onClose={() => setShowWhatsAppList(false)}
        onNotify={onNotify}
      />
    </div>
  );
}
