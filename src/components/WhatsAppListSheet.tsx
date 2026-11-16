import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, RotateCcw, Share2, X } from 'lucide-react';
import type { DeviceCondition, DeviceItem, StoreSettings } from '../types';
import {
  calculateInstallment,
  formatBRL,
  formatDeviceModelName,
  formatStorage,
  formatTitleName,
  getAvailableColorVariants,
} from '../utils/formatters';

interface WhatsAppListSheetProps {
  open: boolean;
  devices: DeviceItem[];
  settings: StoreSettings;
  onClose: () => void;
  onNotify: (type: 'success' | 'error' | 'info', text: string) => void;
}

type ListConditionScope = 'todos' | DeviceCondition;
type ListSort = 'modelo' | 'menor_preco' | 'maior_preco';

function formatCurrentDatePtBr(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());
}

function formatDeviceWhatsAppLine(
  device: DeviceItem,
  includeBattery: boolean,
  includeInstallments: boolean,
  settings: StoreSettings
): string {
  const model = formatDeviceModelName(device.model);
  const storage = formatStorage(device.storageGb);
  const price = formatBRL(device.price);
  const availColors = getAvailableColorVariants(device);
  const inst = includeInstallments
    ? calculateInstallment(
        device.price,
        12,
        settings.installmentRates,
        settings.passCardFeeToCustomer,
        settings.cardFeeCalculationMode || 'infinitepay_repasse'
      )
    : null;
  const instSuffix = inst ? `\n  ou 12x de ${formatBRL(inst.installmentValue)}` : '';

  if (device.condition === 'lacrado') {
    const colorNames = availColors.map((v) => v.color);
    if (colorNames.length > 1) {
      return `• *${model} ${storage}* — *${price}*${instSuffix}\n  Cores: ${colorNames.join(', ')}`;
    }
    const singleColor = colorNames[0] || formatTitleName(device.color);
    return `• *${model} ${storage}* (${singleColor}) — *${price}*${instSuffix}`;
  }

  const color = formatTitleName(device.color);
  const specs = includeBattery ? `${color} · Bat. ${device.batteryHealth}%` : color;
  return `• *${model} ${storage}* (${specs}) — *${price}*${instSuffix}`;
}

export function WhatsAppListSheet({
  open,
  devices,
  settings,
  onClose,
  onNotify,
}: WhatsAppListSheetProps) {
  const [conditionScope, setConditionScope] = useState<ListConditionScope>('todos');
  const [sortBy, setSortBy] = useState<ListSort>('modelo');
  const [groupByCondition, setGroupByCondition] = useState(true);
  const [includeBattery, setIncludeBattery] = useState(true);
  const [includeInstallments, setIncludeInstallments] = useState(true);
  const [includePhone, setIncludePhone] = useState(true);
  const [customDraft, setCustomDraft] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setConditionScope('todos');
    setSortBy('modelo');
    setGroupByCondition(true);
    setIncludeBattery(true);
    setIncludeInstallments(true);
    setIncludePhone(true);
    setCustomDraft(null);
    setCopied(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const filteredDevices = useMemo(() => {
    const available = devices.filter((d) => {
      if (d.status !== 'disponivel') return false;
      if (conditionScope !== 'todos' && d.condition !== conditionScope) return false;
      return true;
    });

    return [...available].sort((a, b) => {
      if (sortBy === 'menor_preco') return a.price - b.price;
      if (sortBy === 'maior_preco') return b.price - a.price;
      const modelCmp = formatDeviceModelName(a.model).localeCompare(
        formatDeviceModelName(b.model),
        'pt-BR',
        { numeric: true }
      );
      if (modelCmp !== 0) return modelCmp;
      return a.storageGb - b.storageGb;
    });
  }, [devices, conditionScope, sortBy]);

  const generatedMessage = useMemo(() => {
    const dateStr = formatCurrentDatePtBr();
    const storeTitle = formatTitleName(settings.storeName || 'Lucca Cell');
    const lines: string[] = [`*${storeTitle}* — Lista Atualizada (${dateStr})`];

    if (settings.storeTagline.trim()) {
      lines.push(settings.storeTagline.trim());
    }

    if (filteredDevices.length === 0) {
      lines.push('', 'Nenhum aparelho disponível para este filtro no momento.');
      return lines.join('\n');
    }

    const lacrados = filteredDevices.filter((d) => d.condition === 'lacrado');
    const seminovos = filteredDevices.filter((d) => d.condition === 'seminovo');

    if (groupByCondition && conditionScope === 'todos' && lacrados.length > 0 && seminovos.length > 0) {
      lines.push('', '*LACRADOS*');
      for (const d of lacrados) {
        lines.push(formatDeviceWhatsAppLine(d, includeBattery, includeInstallments, settings));
      }
      lines.push('', '*SEMINOVOS*');
      for (const d of seminovos) {
        lines.push(formatDeviceWhatsAppLine(d, includeBattery, includeInstallments, settings));
      }
    } else {
      lines.push('');
      if (conditionScope === 'lacrado') {
        lines.push('*LACRADOS*');
      } else if (conditionScope === 'seminovo') {
        lines.push('*SEMINOVOS*');
      }
      for (const d of filteredDevices) {
        lines.push(formatDeviceWhatsAppLine(d, includeBattery, includeInstallments, settings));
      }
    }

    if (settings.whatsappListFooter?.trim()) {
      lines.push('', settings.whatsappListFooter.trim());
    }

    if (includePhone && (settings.storePhone.trim() || settings.storeAddress?.trim())) {
      const contactParts: string[] = [];
      if (settings.storePhone.trim()) {
        contactParts.push(`Atendimento WhatsApp: ${settings.storePhone.trim()}`);
      }
      if (settings.storeAddress?.trim()) {
        contactParts.push(`Endereço: ${settings.storeAddress.trim()}`);
      }
      lines.push('', ...contactParts);
    }

    return lines.join('\n');
  }, [
    filteredDevices,
    settings,
    groupByCondition,
    conditionScope,
    includeBattery,
    includeInstallments,
    includePhone,
  ]);

  if (!open) return null;

  const activeText = customDraft !== null ? customDraft : generatedMessage;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopyList = async () => {
    if (filteredDevices.length === 0 && customDraft === null) {
      onNotify('info', 'Não há aparelhos disponíveis neste filtro para copiar.');
      return;
    }
    try {
      await navigator.clipboard.writeText(activeText);
      setCopied(true);
      onNotify('success', 'Lista copiada! Agora é só colar no WhatsApp do cliente.');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onNotify('error', 'Não foi possível copiar automaticamente. Selecione o texto acima.');
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: `${formatTitleName(settings.storeName || 'Lucca Cell')} — Lista do Dia`,
        text: activeText,
      });
    } catch (err) {
      if ((err as { name?: string })?.name !== 'AbortError') {
        await handleCopyList();
      }
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whatsapp-list-title"
    >
      <div className="w-full sm:max-w-lg bg-[#121216] border-t sm:border border-[#26262E] rounded-t-3xl sm:rounded-2xl max-h-[90dvh] flex flex-col overflow-hidden">
        <div className="sm:hidden w-10 h-1.5 bg-zinc-700 rounded-full mx-auto mt-3 shrink-0" />

        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[#26262E] shrink-0">
          <div className="min-w-0">
            <h2 id="whatsapp-list-title" className="font-display text-lg font-bold text-white">
              Lista para WhatsApp
            </h2>
            <p className="text-xs text-zinc-400 font-mono-tabular truncate">
              {formatCurrentDatePtBr()} · {filteredDevices.length}{' '}
              {filteredDevices.length === 1 ? 'aparelho listado' : 'aparelhos listados'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center text-zinc-400 hover:text-white rounded-xl shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-4">
          {/* Scope & Sort Controls */}
          <div className="space-y-2.5">
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#09090B] border border-[#26262E] rounded-xl">
              {(
                [
                  { id: 'todos', label: 'Todos' },
                  { id: 'lacrado', label: 'Lacrados' },
                  { id: 'seminovo', label: 'Seminovos' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setConditionScope(item.id);
                    setCustomDraft(null);
                  }}
                  className={`min-h-[40px] px-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    conditionScope === item.id
                      ? 'bg-[#D4AF37] text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <select
                aria-label="Ordenação da lista"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as ListSort);
                  setCustomDraft(null);
                }}
                className="min-h-[40px] px-3 rounded-xl bg-[#09090B] border border-[#26262E] text-xs font-medium text-white focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="modelo">Ordem: Modelo (A-Z)</option>
                <option value="menor_preco">Ordem: Menor preço</option>
                <option value="maior_preco">Ordem: Maior preço</option>
              </select>

              {conditionScope === 'todos' && (
                <button
                  type="button"
                  onClick={() => {
                    setGroupByCondition((v) => !v);
                    setCustomDraft(null);
                  }}
                  className={`min-h-[40px] px-3 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
                    groupByCondition
                      ? 'bg-white text-black border-white'
                      : 'bg-[#09090B] text-zinc-300 border-[#26262E]'
                  }`}
                >
                  Separar Lacrados/Seminovos
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIncludeBattery((v) => !v);
                  setCustomDraft(null);
                }}
                className={`min-h-[40px] px-3 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
                  includeBattery
                    ? 'bg-white text-black border-white'
                    : 'bg-[#09090B] text-zinc-300 border-[#26262E]'
                }`}
              >
                Bateria (Seminovos)
              </button>

              <button
                type="button"
                onClick={() => {
                  setIncludeInstallments((v) => !v);
                  setCustomDraft(null);
                }}
                className={`min-h-[40px] px-3 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
                  includeInstallments
                    ? 'bg-white text-black border-white'
                    : 'bg-[#09090B] text-zinc-300 border-[#26262E]'
                }`}
              >
                Parcelas 12x
              </button>

              {settings.storePhone.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setIncludePhone((v) => !v);
                    setCustomDraft(null);
                  }}
                  className={`min-h-[40px] px-3 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
                    includePhone
                      ? 'bg-white text-black border-white'
                      : 'bg-[#09090B] text-zinc-300 border-[#26262E]'
                  }`}
                >
                  Telefone
                </button>
              )}
            </div>
          </div>

          {/* Editable WhatsApp Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="whatsapp-list-preview" className="text-xs font-medium text-zinc-400">
                Prévia da mensagem (você pode editar antes de copiar)
              </label>
              {customDraft !== null && (
                <button
                  type="button"
                  onClick={() => setCustomDraft(null)}
                  className="text-xs text-[#D4AF37] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restaurar lista
                </button>
              )}
            </div>
            <textarea
              id="whatsapp-list-preview"
              rows={11}
              value={activeText}
              onChange={(e) => setCustomDraft(e.target.value)}
              className="w-full rounded-xl bg-[#09090B] border border-[#26262E] p-3.5 text-sm sm:text-xs text-zinc-100 leading-relaxed focus:outline-none focus:border-[#D4AF37] resize-y"
            />
          </div>
        </div>

        {/* Sticky Bottom CTA */}
        <div className="px-4 sm:px-5 py-3.5 pb-safe border-t border-[#26262E] bg-[#121216] flex items-center gap-2.5 shrink-0">
          {canShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="min-h-[48px] px-4 rounded-xl bg-[#1A1A20] hover:bg-[#24242C] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Share2 className="w-4 h-4 shrink-0" />
              <span>Enviar</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleCopyList}
            className="flex-1 min-h-[48px] px-4 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-black font-semibold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 shrink-0" />
                <span>Lista Copiada!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 shrink-0" />
                <span>Copiar Lista para WhatsApp</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
