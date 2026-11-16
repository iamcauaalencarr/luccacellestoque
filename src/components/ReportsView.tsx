import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Download,
  ExternalLink,
  Layers,
  Search,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type {
  DeviceItem,
  SaleRecord,
  SinglePaymentMethod,
  StaffDirectoryMember,
  StoreSettings,
} from '../types';
import {
  buildWhatsAppUrl,
  formatBRL,
  formatDeviceModelName,
  formatPaymentBreakdown,
  formatShortDate,
  formatStorage,
  formatTimestamp,
  formatTitleName,
  getDeviceTotalStock,
  getWarrantyInfo,
  PAYMENT_LABELS,
} from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import { DeviceThumbnail } from './DeviceThumbnail';

interface ReportsViewProps {
  devices: DeviceItem[];
  sales: SaleRecord[];
  staff: StaffDirectoryMember[];
  settings: StoreSettings;
  loading: boolean;
  onOpenWarranty: (sale: SaleRecord) => void;
}

type PeriodFilter = 'hoje' | '7d' | '30d' | 'tudo';
type ReportsSubTab = 'resumo' | 'clientes';
const PAYMENT_METHODS: SinglePaymentMethod[] = ['pix', 'credito', 'debito', 'dinheiro'];

interface CustomerProfileSummary {
  key: string;
  name: string;
  phone?: string;
  totalSpent: number;
  sales: SaleRecord[];
  reservedCount: number;
}

export function ReportsView({
  devices,
  sales,
  staff,
  settings,
  loading,
  onOpenWarranty,
}: ReportsViewProps) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [subTab, setSubTab] = useState<ReportsSubTab>('resumo');
  const [period, setPeriod] = useState<PeriodFilter>('tudo');
  const [selectedSellerId, setSelectedSellerId] = useState<string>('todos');
  const [customerSearch, setCustomerSearch] = useState('');

  // Stock Comparison: Lacrados vs Seminovos (available inventory)
  const stockComparison = useMemo(() => {
    const available = devices.filter((d) => d.status === 'disponivel');
    const lacrados = available.filter((d) => d.condition === 'lacrado');
    const seminovos = available.filter((d) => d.condition === 'seminovo');

    const lacradosCount = lacrados.reduce((sum, d) => sum + getDeviceTotalStock(d), 0);
    const seminovosCount = seminovos.length;
    const totalCount = lacradosCount + seminovosCount;

    const lacradosValue = lacrados.reduce((sum, d) => sum + d.price * getDeviceTotalStock(d), 0);
    const seminovosValue = seminovos.reduce((sum, d) => sum + d.price, 0);
    const totalValue = lacradosValue + seminovosValue;

    return {
      totalCount,
      totalValue,
      lacradosCount,
      lacradosValue,
      lacradosPct: totalCount > 0 ? Math.round((lacradosCount / totalCount) * 100) : 0,
      lacradosAvg: lacradosCount > 0 ? lacradosValue / lacradosCount : 0,
      seminovosCount,
      seminovosValue,
      seminovosPct: totalCount > 0 ? Math.round((seminovosCount / totalCount) * 100) : 0,
      seminovosAvg: seminovosCount > 0 ? seminovosValue / seminovosCount : 0,
    };
  }, [devices]);

  // Period-filtered sales
  const periodSales = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const msPerDay = 24 * 60 * 60 * 1000;

    return sales.filter((s) => {
      if (period === 'tudo') return true;
      if (!s.createdAt) return true; // Optimistic pending server timestamp
      const ts = s.createdAt.toDate().getTime();
      if (period === 'hoje') return ts >= startOfToday;
      if (period === '7d') return ts >= now.getTime() - 7 * msPerDay;
      if (period === '30d') return ts >= now.getTime() - 30 * msPerDay;
      return true;
    });
  }, [sales, period]);

  // Sales comparison Lacrados vs Seminovos
  const salesConditionSummary = useMemo(() => {
    const lacrados = periodSales.filter((s) => s.condition === 'lacrado');
    const seminovos = periodSales.filter((s) => s.condition === 'seminovo');
    const totalRevenue = periodSales.reduce((acc, s) => acc + s.salePrice, 0);
    return {
      totalCount: periodSales.length,
      totalRevenue,
      lacradosCount: lacrados.length,
      lacradosRevenue: lacrados.reduce((acc, s) => acc + s.salePrice, 0),
      seminovosCount: seminovos.length,
      seminovosRevenue: seminovos.reduce((acc, s) => acc + s.salePrice, 0),
    };
  }, [periodSales]);

  // Per-seller breakdown
  const sellerBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        sellerId: string;
        sellerName: string;
        count: number;
        lacrados: number;
        seminovos: number;
        revenue: number;
      }
    >();

    if (isAdmin) {
      for (const member of staff) {
        map.set(member.uid, {
          sellerId: member.uid,
          sellerName: member.displayName,
          count: 0,
          lacrados: 0,
          seminovos: 0,
          revenue: 0,
        });
      }
    }

    for (const s of periodSales) {
      const existing = map.get(s.sellerId) || {
        sellerId: s.sellerId,
        sellerName: s.sellerName,
        count: 0,
        lacrados: 0,
        seminovos: 0,
        revenue: 0,
      };
      existing.count += 1;
      if (s.condition === 'lacrado') existing.lacrados += 1;
      else existing.seminovos += 1;
      existing.revenue += s.salePrice;
      map.set(s.sellerId, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue || b.count - a.count);
  }, [periodSales, staff, isAdmin]);

  const visibleSalesList = useMemo(() => {
    if (!isAdmin || selectedSellerId === 'todos') return periodSales;
    return periodSales.filter((s) => s.sellerId === selectedSellerId);
  }, [periodSales, isAdmin, selectedSellerId]);

  const maxSellerRevenue = useMemo(
    () => Math.max(...sellerBreakdown.map((s) => s.revenue), 1),
    [sellerBreakdown]
  );

  const mixedSalesCount = useMemo(
    () => visibleSalesList.filter((s) => s.paymentMethod === 'misto').length,
    [visibleSalesList]
  );

  const paymentSummary = useMemo(() => {
    return PAYMENT_METHODS.map((method) => {
      let count = 0;
      let total = 0;
      for (const s of visibleSalesList) {
        const tradeInDeduction = s.tradeIn?.tradeInValue || 0;
        const cashValue = Math.max(0, s.salePrice - tradeInDeduction);
        if (s.paymentMethod === method) {
          count += 1;
          total += cashValue;
        } else if (s.paymentMethod === 'misto' && s.paymentBreakdown) {
          const part = s.paymentBreakdown[method] || 0;
          if (part > 0) {
            count += 1;
            total += part;
          }
        }
      }
      return {
        method,
        label: PAYMENT_LABELS[method],
        count,
        total,
      };
    });
  }, [visibleSalesList]);

  // Customer CRM aggregation
  const customers = useMemo<CustomerProfileSummary[]>(() => {
    const map = new Map<string, CustomerProfileSummary>();
    for (const s of sales) {
      const cleanPhoneDigits = (s.customerPhone || '').replace(/\D/g, '');
      const cleanName = (s.customerName || '').trim();
      if (!cleanName && cleanPhoneDigits.length < 8) continue;

      const key =
        cleanPhoneDigits.length >= 8
          ? `phone:${cleanPhoneDigits}`
          : `name:${cleanName.toLocaleLowerCase('pt-BR')}`;
      const existing = map.get(key);
      if (existing) {
        existing.totalSpent += s.salePrice;
        existing.sales.push(s);
        if (!existing.phone && s.customerPhone) existing.phone = s.customerPhone;
        if (existing.name === 'Cliente' && cleanName) existing.name = formatTitleName(cleanName);
      } else {
        map.set(key, {
          key,
          name: cleanName ? formatTitleName(cleanName) : s.customerPhone || 'Cliente',
          phone: s.customerPhone,
          totalSpent: s.salePrice,
          sales: [s],
          reservedCount: 0,
        });
      }
    }

    for (const d of devices) {
      if (d.status !== 'reservado' || !d.reservation) continue;
      const cleanPhoneDigits = (d.reservation.customerPhone || '').replace(/\D/g, '');
      const cleanName = d.reservation.customerName.trim();
      const key =
        cleanPhoneDigits.length >= 8
          ? `phone:${cleanPhoneDigits}`
          : `name:${cleanName.toLocaleLowerCase('pt-BR')}`;
      const existing = map.get(key);
      if (existing) {
        existing.reservedCount += 1;
        if (!existing.phone && d.reservation.customerPhone) {
          existing.phone = d.reservation.customerPhone;
        }
      } else {
        map.set(key, {
          key,
          name: formatTitleName(cleanName),
          phone: d.reservation.customerPhone,
          totalSpent: 0,
          sales: [],
          reservedCount: 1,
        });
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => b.totalSpent - a.totalSpent || b.sales.length - a.sales.length
    );
  }, [sales, devices]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        c.sales.some(
          (s) =>
            s.model.toLowerCase().includes(q) ||
            (s.imei && s.imei.toLowerCase().includes(q))
        )
    );
  }, [customers, customerSearch]);

  const handleExportCsv = () => {
    if (visibleSalesList.length === 0) return;
    const escapeCsv = (val: string | number) => {
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };
    const headers = [
      'Data',
      'Modelo',
      'Armazenamento',
      'Cor',
      'Bateria (%)',
      'Condicao',
      'IMEI',
      'Pagamento',
      'Parcelas',
      'Troca',
      'Garantia (dias)',
      'Valor (R$)',
      'Cliente',
      'Telefone',
      'Vendedor',
    ];
    const rows = visibleSalesList.map((s) => {
      const payLabel =
        s.paymentMethod === 'misto' && s.paymentBreakdown
          ? `Misto (${formatPaymentBreakdown(s.paymentBreakdown)})`
          : PAYMENT_LABELS[s.paymentMethod];
      return [
        escapeCsv(formatTimestamp(s.createdAt, true)),
        escapeCsv(formatDeviceModelName(s.model)),
        escapeCsv(formatStorage(s.storageGb)),
        escapeCsv(formatTitleName(s.color)),
        escapeCsv(`${s.batteryHealth}%`),
        escapeCsv(s.condition === 'lacrado' ? 'Lacrado' : 'Seminovo'),
        escapeCsv(s.imei || '-'),
        escapeCsv(payLabel),
        escapeCsv(s.installments ? `${s.installments}x` : '1x'),
        escapeCsv(
          s.tradeIn
            ? `${formatDeviceModelName(s.tradeIn.model)} (-${formatBRL(s.tradeIn.tradeInValue)})`
            : '-'
        ),
        escapeCsv(
          String(
            s.warrantyDays ??
              (s.condition === 'lacrado'
                ? settings.warrantyDaysLacrado
                : settings.warrantyDaysSeminovo)
          )
        ),
        escapeCsv(s.salePrice.toFixed(2).replace('.', ',')),
        escapeCsv(s.customerName ? formatTitleName(s.customerName) : '-'),
        escapeCsv(s.customerPhone || '-'),
        escapeCsv(formatTitleName(s.sellerName)),
      ];
    });
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vendas-lucca-cell-${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 bg-[#121216] rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="h-44 bg-[#121216] border border-[#26262E] rounded-2xl animate-pulse" />
          <div className="h-44 bg-[#121216] border border-[#26262E] rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + SubTab / Period Selector */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-white">
              {subTab === 'resumo' ? 'Relatórios em Tempo Real' : 'Clientes e Garantias'}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              {subTab === 'resumo'
                ? 'Comparativo Lacrados vs. Seminovos e vendas por usuário'
                : 'Histórico de clientes, contato no WhatsApp e status de garantia'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1 p-1 bg-[#121216] border border-[#26262E] rounded-xl sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setSubTab('resumo')}
              className={`min-h-[40px] px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                subTab === 'resumo' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Vendas & Estoque
            </button>
            <button
              type="button"
              onClick={() => setSubTab('clientes')}
              className={`min-h-[40px] px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                subTab === 'clientes' ? 'bg-[#D4AF37] text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Clientes ({customers.length})
            </button>
          </div>
        </div>

        {subTab === 'resumo' && (
          <div className="grid grid-cols-4 gap-1 p-1 bg-[#121216] border border-[#26262E] rounded-xl sm:w-fit">
            {(
              [
                { id: 'hoje', label: 'Hoje' },
                { id: '7d', label: '7 dias' },
                { id: '30d', label: '30 dias' },
                { id: 'tudo', label: 'Tudo' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPeriod(item.id)}
                className={`min-h-[38px] px-2.5 sm:px-3.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  period === item.id ? 'bg-[#D4AF37] text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {subTab === 'clientes' ? (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Buscar por cliente, telefone, modelo ou IMEI..."
              className="w-full min-h-[46px] pl-10 pr-11 rounded-xl bg-[#121216] border border-[#26262E] text-white placeholder:text-zinc-500 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
            />
            {customerSearch && (
              <button
                type="button"
                onClick={() => setCustomerSearch('')}
                aria-label="Limpar busca"
                className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="bg-[#121216] border border-[#26262E] rounded-2xl p-8 text-center space-y-2">
              <UserCheck className="w-6 h-6 text-[#D4AF37] mx-auto" />
              <p className="font-display font-semibold text-white text-base">
                Nenhum cliente encontrado
              </p>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Informe o nome ou WhatsApp do cliente ao registrar uma venda ou reserva para montar sua base automaticamente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCustomers.map((customer) => {
                const greetingText = `Olá ${customer.name}! Aqui é da ${settings.storeName}.`;
                const waUrl = buildWhatsAppUrl(customer.phone, greetingText);
                return (
                  <article
                    key={customer.key}
                    className="bg-[#121216] border border-[#26262E] rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="font-display font-semibold text-base text-white truncate">
                          {customer.name}
                        </h2>
                        <p className="text-xs text-zinc-400 font-mono-tabular">
                          {customer.phone || 'Sem telefone'}
                          {customer.reservedCount > 0 && (
                            <span className="text-[#D4AF37] font-sans">
                              {' '}
                              · {customer.reservedCount}{' '}
                              {customer.reservedCount === 1 ? 'reserva ativa' : 'reservas ativas'}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono-tabular text-sm font-bold text-[#D4AF37] block">
                          {formatBRL(customer.totalSpent)}
                        </span>
                        <span className="text-[11px] text-zinc-400 font-mono-tabular">
                          {customer.sales.length}{' '}
                          {customer.sales.length === 1 ? 'compra' : 'compras'}
                        </span>
                      </div>
                    </div>

                    {customer.sales.length > 0 && (
                      <div className="pt-2 border-t border-[#202028] divide-y divide-[#1D1D24]">
                        {customer.sales.slice(0, 4).map((s) => {
                          const warranty = getWarrantyInfo(
                            s.createdAt,
                            s.warrantyDays ??
                              (s.condition === 'lacrado'
                                ? settings.warrantyDaysLacrado
                                : settings.warrantyDaysSeminovo)
                          );
                          return (
                            <div
                              key={s.id}
                              className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="min-w-0">
                                <p className="text-zinc-200 font-medium truncate">
                                  {formatDeviceModelName(s.model)} {formatStorage(s.storageGb)} ·{' '}
                                  {formatTitleName(s.color)}
                                </p>
                                <p className="text-[11px] font-mono-tabular text-zinc-400">
                                  {formatShortDate(s.createdAt)} ·{' '}
                                  <span
                                    className={
                                      warranty.isActive ? 'text-emerald-400' : 'text-zinc-500'
                                    }
                                  >
                                    {warranty.days > 0
                                      ? warranty.isActive
                                        ? `Garantia até ${warranty.formattedEnd}`
                                        : `Expirou em ${warranty.formattedEnd}`
                                      : 'Sem garantia'}
                                  </span>
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => onOpenWarranty(s)}
                                title="Abrir comprovante e garantia"
                                className="min-h-[36px] px-2.5 rounded-lg bg-[#1A1A20] hover:bg-[#24242C] text-[#D4AF37] text-[11px] font-semibold inline-flex items-center gap-1 shrink-0"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Garantia</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {waUrl && (
                      <div className="pt-2 border-t border-[#202028]">
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full min-h-[42px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Chamar no WhatsApp</span>
                        </a>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* SECTION 1: Comparativo Lacrados vs Seminovos em Estoque */}
          <section className="bg-[#121216] border border-[#26262E] rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Layers className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <h2 className="font-display font-semibold text-sm sm:text-base text-white">
                  Lacrados vs. Seminovos em Estoque
                </h2>
              </div>
              <span className="font-mono-tabular text-xs text-zinc-400 whitespace-nowrap">
                {stockComparison.totalCount} disponíveis
              </span>
            </div>

            {/* Visual Split Bar */}
            <div className="space-y-2">
              <div className="h-3 w-full rounded-full bg-[#09090B] overflow-hidden flex border border-[#26262E]">
                <div
                  className="h-full bg-[#D4AF37] transition-all duration-300"
                  style={{ width: `${stockComparison.lacradosPct}%` }}
                />
                <div
                  className="h-full bg-white transition-all duration-300"
                  style={{ width: `${stockComparison.seminovosPct}%` }}
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs text-zinc-400 font-mono-tabular">
                <div className="flex items-center justify-between sm:justify-start sm:gap-4">
                  <span>
                    Lacrados:{' '}
                    <strong className="text-[#D4AF37]">{stockComparison.lacradosPct}%</strong>
                  </span>
                  <span className="sm:hidden">
                    Seminovos:{' '}
                    <strong className="text-white">{stockComparison.seminovosPct}%</strong>
                  </span>
                </div>
                <span>
                  Total em estoque:{' '}
                  <strong className="text-white">{formatBRL(stockComparison.totalValue)}</strong>
                </span>
                <span className="hidden sm:inline">
                  Seminovos:{' '}
                  <strong className="text-white">{stockComparison.seminovosPct}%</strong>
                </span>
              </div>
            </div>

            {/* Side-by-side comparison metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#202028] pt-3 border-t border-[#202028]">
              <div className="pb-4 md:pb-0 md:pr-6 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#D4AF37]">Aparelhos Lacrados</span>
                  <span className="font-mono-tabular text-xs text-zinc-400 whitespace-nowrap">
                    {stockComparison.lacradosCount} un.
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-zinc-500">Valor em estoque</p>
                    <p className="font-mono-tabular text-sm sm:text-base font-bold text-white mt-0.5 whitespace-nowrap">
                      {formatBRL(stockComparison.lacradosValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Preço médio</p>
                    <p className="font-mono-tabular text-sm sm:text-base font-semibold text-zinc-200 mt-0.5 whitespace-nowrap">
                      {formatBRL(stockComparison.lacradosAvg)}
                    </p>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-[#1D1D24] flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                    <span className="text-zinc-400">Vendidos no período</span>
                    <span className="font-mono-tabular font-semibold text-white whitespace-nowrap">
                      {salesConditionSummary.lacradosCount} un. (
                      {formatBRL(salesConditionSummary.lacradosRevenue)})
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 md:pt-0 md:pl-6 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-white">Aparelhos Seminovos</span>
                  <span className="font-mono-tabular text-xs text-zinc-400 whitespace-nowrap">
                    {stockComparison.seminovosCount} un.
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-zinc-500">Valor em estoque</p>
                    <p className="font-mono-tabular text-sm sm:text-base font-bold text-white mt-0.5 whitespace-nowrap">
                      {formatBRL(stockComparison.seminovosValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Preço médio</p>
                    <p className="font-mono-tabular text-sm sm:text-base font-semibold text-zinc-200 mt-0.5 whitespace-nowrap">
                      {formatBRL(stockComparison.seminovosAvg)}
                    </p>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-[#1D1D24] flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                    <span className="text-zinc-400">Vendidos no período</span>
                    <span className="font-mono-tabular font-semibold text-white whitespace-nowrap">
                      {salesConditionSummary.seminovosCount} un. (
                      {formatBRL(salesConditionSummary.seminovosRevenue)})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: Desempenho por Usuário em Tempo Real */}
          <section className="bg-[#121216] border border-[#26262E] rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-[#D4AF37]" />
                <h2 className="font-display font-semibold text-base text-white">
                  {isAdmin ? 'Vendas por Usuário' : 'Seu Desempenho em Tempo Real'}
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono-tabular">
                <TrendingUp className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>
                  {salesConditionSummary.totalCount} vendas ·{' '}
                  <strong className="text-white">
                    {formatBRL(salesConditionSummary.totalRevenue)}
                  </strong>
                </span>
              </div>
            </div>

            {sellerBreakdown.length === 0 ? (
              <p className="text-sm text-zinc-400 py-4 text-center">
                Nenhuma venda registrada no período selecionado.
              </p>
            ) : (
              <div className="divide-y divide-[#202028] pt-1 border-t border-[#202028]">
                {sellerBreakdown.map((seller) => {
                  const barWidth = Math.max(
                    seller.revenue > 0 ? 4 : 0,
                    Math.round((seller.revenue / maxSellerRevenue) * 100)
                  );
                  const avgTicket = seller.count > 0 ? seller.revenue / seller.count : 0;

                  return (
                    <div key={seller.sellerId} className="py-3.5 first:pt-3 last:pb-0 space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-medium text-sm text-white truncate min-w-0">
                          {formatTitleName(seller.sellerName)}
                        </p>
                        <span className="font-mono-tabular text-sm font-bold text-[#D4AF37] whitespace-nowrap shrink-0">
                          {formatBRL(seller.revenue)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs text-zinc-400 font-mono-tabular">
                        <span>
                          {seller.count} {seller.count === 1 ? 'venda' : 'vendas'} · {seller.lacrados}{' '}
                          lac. · {seller.seminovos} sem.
                        </span>
                        <span>Ticket {formatBRL(avgTicket)}</span>
                      </div>

                      <div className="h-1.5 w-full bg-[#1C1C24] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#D4AF37] rounded-full transition-all duration-300"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* SECTION 3: Resumo por Forma de Pagamento */}
          <section className="bg-[#121216] border border-[#26262E] rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Wallet className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <h2 className="font-display font-semibold text-base text-white">
                  Fechamento por Forma de Pagamento
                </h2>
              </div>
              {mixedSalesCount > 0 && (
                <span className="text-xs text-zinc-400 font-mono-tabular whitespace-nowrap">
                  Inclui {mixedSalesCount} {mixedSalesCount === 1 ? 'venda mista' : 'vendas mistas'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-[#202028]">
              {paymentSummary.map((item) => (
                <div key={item.method} className="pt-3 space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-zinc-400 font-medium">{item.label}</span>
                    <span className="font-mono-tabular text-zinc-500 whitespace-nowrap">
                      {item.count} {item.count === 1 ? 'pag.' : 'pags.'}
                    </span>
                  </div>
                  <p className="font-mono-tabular text-base font-bold text-white whitespace-nowrap">
                    {formatBRL(item.total)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 4: Histórico Detalhado de Vendas */}
          <section className="bg-[#121216] border border-[#26262E] rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <h2 className="font-display font-semibold text-base text-white">
                  Histórico Detalhado de Vendas
                </h2>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {isAdmin && sellerBreakdown.length > 0 && (
                  <select
                    aria-label="Filtrar por vendedor"
                    value={selectedSellerId}
                    onChange={(e) => setSelectedSellerId(e.target.value)}
                    className="w-full sm:w-auto min-h-[44px] px-3 rounded-xl bg-[#09090B] border border-[#26262E] text-base sm:text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="todos">Todos os vendedores</option>
                    {sellerBreakdown.map((s) => (
                      <option key={s.sellerId} value={s.sellerId}>
                        {formatTitleName(s.sellerName)}
                      </option>
                    ))}
                  </select>
                )}

                {visibleSalesList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="min-h-[44px] px-3.5 rounded-xl bg-[#1A1A20] hover:bg-[#24242C] text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                    <span>Exportar CSV</span>
                  </button>
                )}
              </div>
            </div>

            {visibleSalesList.length === 0 ? (
              <p className="text-sm text-zinc-400 py-4 text-center">
                Nenhuma venda encontrada para este filtro.
              </p>
            ) : (
              <div className="divide-y divide-[#202028]">
                {visibleSalesList.map((sale) => (
                  <div
                    key={sale.id}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <DeviceThumbnail model={sale.model} color={sale.color} size="xs" />

                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-white truncate">
                            {formatDeviceModelName(sale.model)}
                          </span>
                          <span className="text-xs text-zinc-500">·</span>
                          <span
                            className={`text-xs font-medium shrink-0 ${
                              sale.condition === 'lacrado' ? 'text-[#D4AF37]' : 'text-zinc-300'
                            }`}
                          >
                            {sale.condition === 'lacrado' ? 'Lacrado' : 'Seminovo'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 font-mono-tabular truncate">
                          {formatStorage(sale.storageGb)} · {formatTitleName(sale.color)} ·{' '}
                          {sale.paymentMethod === 'misto' && sale.paymentBreakdown
                            ? `Misto (${formatPaymentBreakdown(sale.paymentBreakdown)})`
                            : sale.installments && sale.installments > 1
                              ? `${PAYMENT_LABELS[sale.paymentMethod]} ${sale.installments}x`
                              : PAYMENT_LABELS[sale.paymentMethod]}
                          {sale.tradeIn
                            ? ` · Troca ${formatDeviceModelName(sale.tradeIn.model)} (-${formatBRL(sale.tradeIn.tradeInValue)})`
                            : ''}
                          {sale.customerName ? ` · ${formatTitleName(sale.customerName)}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex flex-col items-end justify-center gap-0.5">
                        <span className="font-mono-tabular text-sm font-bold text-white whitespace-nowrap">
                          {formatBRL(sale.salePrice)}
                        </span>
                        <span className="text-[11px] sm:text-xs text-zinc-400 font-mono-tabular whitespace-nowrap">
                          {formatTitleName(sale.sellerName)} · {formatShortDate(sale.createdAt)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenWarranty(sale)}
                        aria-label={`Comprovante e garantia de ${sale.model}`}
                        title="Comprovante e Garantia"
                        className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-[#1A1A20] hover:bg-[#24242C] text-[#D4AF37] transition-colors shrink-0"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
