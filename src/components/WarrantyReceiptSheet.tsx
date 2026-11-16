import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Printer,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { SaleRecord, StoreSettings } from '../types';
import {
  buildWhatsAppUrl,
  formatBRL,
  formatDeviceModelName,
  formatPaymentBreakdown,
  formatStorage,
  formatTimestamp,
  formatTitleName,
  getWarrantyInfo,
  PAYMENT_LABELS,
} from '../utils/formatters';

interface WarrantyReceiptSheetProps {
  sale: SaleRecord | null;
  settings: StoreSettings;
  justCompleted?: boolean;
  onClose: () => void;
  onNotify: (type: 'success' | 'error' | 'info', text: string) => void;
}

function buildWarrantyText(sale: SaleRecord, settings: StoreSettings): string {
  const store = formatTitleName(settings.storeName || 'Lucca Cell');
  const model = formatDeviceModelName(sale.model);
  const warranty = getWarrantyInfo(
    sale.createdAt,
    sale.warrantyDays ??
      (sale.condition === 'lacrado'
        ? settings.warrantyDaysLacrado
        : settings.warrantyDaysSeminovo)
  );
  const paymentStr =
    sale.paymentMethod === 'misto' && sale.paymentBreakdown
      ? `Misto (${formatPaymentBreakdown(sale.paymentBreakdown)})`
      : sale.installments && sale.installments > 1
        ? `${PAYMENT_LABELS[sale.paymentMethod]} (${sale.installments}x)`
        : PAYMENT_LABELS[sale.paymentMethod];

  const termsText =
    settings.warrantyTerms?.trim() ||
    'Cobre defeitos de fabricação/funcionamento em condições normais de uso. Não cobre mau uso, quedas, umidade ou violação de selo.';

  const lines = [
    `*COMPROVANTE DE COMPRA E GARANTIA*`,
    `*${store}*${settings.storePhone ? ` · ${settings.storePhone}` : ''}`,
    settings.storeDocument ? `CPF/CNPJ: ${settings.storeDocument}` : null,
    settings.storeAddress ? `Endereço: ${settings.storeAddress}` : null,
    `Data: ${formatTimestamp(sale.createdAt)}`,
    sale.customerName ? `Cliente: ${formatTitleName(sale.customerName)}` : null,
    ``,
    `*Aparelho:* ${model} · ${formatStorage(sale.storageGb)}`,
    `*Cor:* ${formatTitleName(sale.color)} · *Condição:* ${sale.condition === 'lacrado' ? 'Lacrado' : `Seminovo (Bat. ${sale.batteryHealth}%)`}`,
    sale.imei ? `*IMEI / Serial:* ${sale.imei}` : null,
    `*Valor Total:* ${formatBRL(sale.salePrice)}`,
    sale.tradeIn
      ? `*Aparelho na Troca:* ${formatDeviceModelName(sale.tradeIn.model)} ${formatStorage(sale.tradeIn.storageGb)} (-${formatBRL(sale.tradeIn.tradeInValue)})`
      : null,
    `*Pagamento:* ${paymentStr}`,
    `*Vendedor:* ${formatTitleName(sale.sellerName)}`,
    ``,
    warranty.days > 0
      ? `*Garantia:* ${warranty.days} dias (válida até *${warranty.formattedEnd}*)`
      : `*Garantia:* Sem garantia adicional registrada`,
    termsText,
  ].filter((line) => line !== null);

  return lines.join('\n');
}

function downloadWarrantyPng(sale: SaleRecord, settings: StoreSettings) {
  const width = 960;
  const height = 1160;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#09090B';
  ctx.fillRect(0, 0, width, height);

  // Card surface
  ctx.fillStyle = '#121216';
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(40, 40, width - 80, height - 80, 28);
  ctx.fill();
  ctx.stroke();

  // Header
  ctx.fillStyle = '#D4AF37';
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText(formatTitleName(settings.storeName || 'Lucca Cell').toUpperCase(), 88, 120);

  ctx.fillStyle = '#A1A1AA';
  ctx.font = '22px sans-serif';
  ctx.fillText('CERTIFICADO DIGITAL DE COMPRA E GARANTIA', 88, 158);
  if (settings.storePhone) {
    ctx.fillText(settings.storePhone, 88, 192);
  }

  ctx.strokeStyle = '#26262E';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(88, 224);
  ctx.lineTo(width - 88, 224);
  ctx.stroke();

  const warranty = getWarrantyInfo(
    sale.createdAt,
    sale.warrantyDays ??
      (sale.condition === 'lacrado'
        ? settings.warrantyDaysLacrado
        : settings.warrantyDaysSeminovo)
  );

  const rows: [string, string][] = [
    ['Data da Venda', formatTimestamp(sale.createdAt)],
    ['Cliente', sale.customerName ? formatTitleName(sale.customerName) : 'Não informado'],
    ['Aparelho', `${formatDeviceModelName(sale.model)} · ${formatStorage(sale.storageGb)}`],
    [
      'Cor / Condição',
      `${formatTitleName(sale.color)} · ${sale.condition === 'lacrado' ? 'Lacrado' : `Seminovo (${sale.batteryHealth}%)`}`,
    ],
    ['IMEI / Serial', sale.imei || 'Não registrado'],
    ['Valor Total', formatBRL(sale.salePrice)],
    [
      'Pagamento',
      sale.paymentMethod === 'misto' && sale.paymentBreakdown
        ? `Misto (${formatPaymentBreakdown(sale.paymentBreakdown)})`
        : sale.installments && sale.installments > 1
          ? `${PAYMENT_LABELS[sale.paymentMethod]} ${sale.installments}x`
          : PAYMENT_LABELS[sale.paymentMethod],
    ],
    ['Vendedor', formatTitleName(sale.sellerName)],
  ];

  if (sale.tradeIn) {
    rows.splice(6, 0, [
      'Troca Recebida',
      `${formatDeviceModelName(sale.tradeIn.model)} (-${formatBRL(sale.tradeIn.tradeInValue)})`,
    ]);
  }

  let y = 278;
  for (const [label, value] of rows) {
    ctx.fillStyle = '#A1A1AA';
    ctx.font = '22px sans-serif';
    ctx.fillText(label, 88, y);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(value.slice(0, 48), 88, y + 32);
    y += 78;
  }

  // Warranty Box
  ctx.fillStyle = '#18181F';
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(88, height - 245, width - 176, 155, 18);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#D4AF37';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(
    warranty.days > 0
      ? `GARANTIA DE ${warranty.days} DIAS · VÁLIDA ATÉ ${warranty.formattedEnd}`
      : 'SEM GARANTIA ADICIONAL REGISTRADA',
    118,
    height - 192
  );

  ctx.fillStyle = '#D4D4D8';
  ctx.font = '19px sans-serif';
  ctx.fillText(
    'Cobertura válida mediante este comprovante para defeitos de funcionamento.',
    118,
    height - 146
  );
  ctx.fillText(
    'Não cobre danos físicos, quedas, líquidos ou intervenção de terceiros.',
    118,
    height - 116
  );

  const link = document.createElement('a');
  link.download = `garantia-${sale.model.toLowerCase().replace(/\s+/g, '-')}-${sale.id.slice(0, 6)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function WarrantyReceiptSheet({
  sale,
  settings,
  justCompleted = false,
  onClose,
  onNotify,
}: WarrantyReceiptSheetProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sale) return;
    setCopied(false);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sale, onClose]);

  if (!sale) return null;

  const warranty = getWarrantyInfo(
    sale.createdAt,
    sale.warrantyDays ??
      (sale.condition === 'lacrado'
        ? settings.warrantyDaysLacrado
        : settings.warrantyDaysSeminovo)
  );
  const receiptText = buildWarrantyText(sale, settings);
  const whatsappUrl = buildWhatsAppUrl(sale.customerPhone, receiptText);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(receiptText);
      setCopied(true);
      onNotify('success', 'Comprovante de garantia copiado para o WhatsApp.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onNotify('error', 'Não foi possível copiar o comprovante.');
    }
  };

  return (
    <>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="print:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="warranty-sheet-title"
      >
        <div className="w-full sm:max-w-md bg-[#121216] border-t sm:border border-[#26262E] rounded-t-3xl sm:rounded-2xl max-h-[92dvh] flex flex-col overflow-hidden">
          <div className="sm:hidden w-10 h-1.5 bg-zinc-700 rounded-full mx-auto mt-3 shrink-0" />

          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[#26262E] shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-5 h-5 text-[#D4AF37] shrink-0" />
              <h2
                id="warranty-sheet-title"
                className="font-display text-base sm:text-lg font-bold text-white truncate"
              >
                {justCompleted ? 'Venda Concluída · Garantia' : 'Comprovante e Garantia'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar comprovante"
              className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center text-zinc-400 hover:text-white rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-4">
            {/* Digital Warranty Card Preview */}
            <div className="rounded-2xl bg-[#09090B] border border-[#D4AF37]/40 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#202028]">
                <div className="min-w-0">
                  <p className="font-display font-bold text-sm text-[#D4AF37] uppercase tracking-wide truncate">
                    {settings.storeName}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Certificado de Compra e Garantia
                    {settings.storeDocument ? ` · ${settings.storeDocument}` : ''}
                  </p>
                  {settings.storeAddress && (
                    <p className="text-[11px] text-zinc-500 truncate">{settings.storeAddress}</p>
                  )}
                </div>
                <span className="font-mono-tabular text-[11px] text-zinc-400 shrink-0">
                  #{sale.id.slice(0, 6).toUpperCase()}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-zinc-400">Aparelho</span>
                  <span className="text-white font-semibold text-right">
                    {formatDeviceModelName(sale.model)} · {formatStorage(sale.storageGb)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-zinc-400">Cor / Condição</span>
                  <span className="text-zinc-200 text-right">
                    {formatTitleName(sale.color)} ·{' '}
                    {sale.condition === 'lacrado'
                      ? 'Lacrado'
                      : `Seminovo (${sale.batteryHealth}%)`}
                  </span>
                </div>
                {sale.imei && (
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-zinc-400">IMEI / Serial</span>
                    <span className="text-zinc-200 font-mono-tabular">{sale.imei}</span>
                  </div>
                )}
                {sale.customerName && (
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-zinc-400">Cliente</span>
                    <span className="text-white font-medium text-right">
                      {formatTitleName(sale.customerName)}
                    </span>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-zinc-400">Valor</span>
                  <span className="text-[#D4AF37] font-mono-tabular font-bold text-sm">
                    {formatBRL(sale.salePrice)}
                  </span>
                </div>
                {sale.tradeIn && (
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-zinc-400">Troca abatida</span>
                    <span className="text-emerald-400 font-mono-tabular text-right">
                      {formatDeviceModelName(sale.tradeIn.model)} (-
                      {formatBRL(sale.tradeIn.tradeInValue)})
                    </span>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-zinc-400">Pagamento</span>
                  <span className="text-zinc-200 text-right">
                    {sale.paymentMethod === 'misto' && sale.paymentBreakdown
                      ? `Misto (${formatPaymentBreakdown(sale.paymentBreakdown)})`
                      : sale.installments && sale.installments > 1
                        ? `${PAYMENT_LABELS[sale.paymentMethod]} ${sale.installments}x`
                        : PAYMENT_LABELS[sale.paymentMethod]}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-zinc-400">Data</span>
                  <span className="text-zinc-300 font-mono-tabular">
                    {formatTimestamp(sale.createdAt)}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#202028] flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] text-zinc-400">Garantia da Loja</p>
                  <p className="text-xs font-semibold text-white font-mono-tabular">
                    {warranty.days > 0
                      ? `${warranty.days} dias · até ${warranty.formattedEnd}`
                      : 'Sem garantia registrada'}
                  </p>
                </div>
                {warranty.days > 0 && (
                  <span
                    className={`text-xs font-semibold ${
                      warranty.isActive ? 'text-emerald-400' : 'text-zinc-500'
                    }`}
                  >
                    {warranty.isActive ? 'Ativa' : 'Expirada'}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="min-h-[46px] px-3 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiado!' : 'Copiar p/ WhatsApp'}</span>
              </button>

              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[46px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Enviar no WhatsApp</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    downloadWarrantyPng(sale, settings);
                    onNotify('success', 'Imagem da garantia salva.');
                  }}
                  className="min-h-[46px] px-3 rounded-xl bg-[#1A1A20] hover:bg-[#24242C] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-4 h-4 text-[#D4AF37]" />
                  <span>Baixar PNG</span>
                </button>
              )}

              {whatsappUrl && (
                <button
                  type="button"
                  onClick={() => {
                    downloadWarrantyPng(sale, settings);
                    onNotify('success', 'Imagem da garantia salva.');
                  }}
                  className="min-h-[46px] px-3 rounded-xl bg-[#1A1A20] hover:bg-[#24242C] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-4 h-4 text-[#D4AF37]" />
                  <span>Baixar PNG</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => window.print()}
                className={`min-h-[46px] px-3 rounded-xl bg-[#1A1A20] hover:bg-[#24242C] text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                  whatsappUrl ? '' : 'col-span-2'
                }`}
              >
                <Printer className="w-4 h-4 text-zinc-400" />
                <span>Imprimir Via</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print-only thermal / A4 warranty view */}
      <div className="hidden print:block p-6 text-black bg-white font-sans max-w-md mx-auto">
        <div className="border-b-2 border-black pb-3 mb-3">
          <h1 className="text-xl font-bold uppercase">{settings.storeName}</h1>
          {settings.storeDocument && <p className="text-xs">CPF/CNPJ: {settings.storeDocument}</p>}
          {settings.storePhone && <p className="text-xs">{settings.storePhone}</p>}
          {settings.storeAddress && <p className="text-xs">{settings.storeAddress}</p>}
          <p className="text-xs mt-1">Comprovante de Compra e Garantia · #{sale.id.slice(0, 6).toUpperCase()}</p>
        </div>
        <div className="space-y-1.5 text-xs">
          <p><strong>Data:</strong> {formatTimestamp(sale.createdAt)}</p>
          {sale.customerName && <p><strong>Cliente:</strong> {formatTitleName(sale.customerName)}</p>}
          <p><strong>Aparelho:</strong> {formatDeviceModelName(sale.model)} · {formatStorage(sale.storageGb)}</p>
          <p><strong>Cor / Estado:</strong> {formatTitleName(sale.color)} · {sale.condition === 'lacrado' ? 'Lacrado' : `Seminovo (${sale.batteryHealth}%)`}</p>
          {sale.imei && <p><strong>IMEI / Serial:</strong> {sale.imei}</p>}
          <p><strong>Valor:</strong> {formatBRL(sale.salePrice)}</p>
          {sale.tradeIn && (
            <p><strong>Troca:</strong> {formatDeviceModelName(sale.tradeIn.model)} (-{formatBRL(sale.tradeIn.tradeInValue)})</p>
          )}
          <p><strong>Vendedor:</strong> {formatTitleName(sale.sellerName)}</p>
        </div>
        <div className="mt-4 pt-3 border-t border-black text-xs">
          <p className="font-bold">
            {warranty.days > 0
              ? `Garantia: ${warranty.days} dias (válida até ${warranty.formattedEnd})`
              : 'Sem garantia adicional'}
          </p>
          <p className="mt-1 text-[11px]">
            {settings.warrantyTerms?.trim() ||
              'Cobertura válida para defeitos de funcionamento. Não cobre quedas, líquidos ou violação.'}
          </p>
        </div>
      </div>
    </>
  );
}
