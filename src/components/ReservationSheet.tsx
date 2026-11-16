import React, { useEffect, useState } from 'react';
import { BookmarkCheck, Unlock, X } from 'lucide-react';
import { SCHEMA_LIMITS, type DeviceItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { releaseReservation, reserveDevice } from '../services/storeService';
import {
  formatBRL,
  formatDeviceModelName,
  formatPhoneBR,
  formatStorage,
  formatTimestamp,
  formatTitleName,
  getAvailableColorVariants,
} from '../utils/formatters';
import { DeviceThumbnail } from './DeviceThumbnail';
import { getAppleColorHex } from '../utils/appleImages';

interface ReservationSheetProps {
  device: DeviceItem | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export function ReservationSheet({
  device,
  onClose,
  onSuccess,
  onError,
}: ReservationSheetProps) {
  const { profile } = useAuth();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [reservedColor, setReservedColor] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!device) return;
    const colors = getAvailableColorVariants(device);
    setCustomerName(device.reservation?.customerName || '');
    setCustomerPhone(device.reservation?.customerPhone || '');
    setDepositAmount(
      device.reservation?.depositAmount ? String(device.reservation.depositAmount) : ''
    );
    setReservedColor(
      device.reservation?.reservedColor || colors[0]?.color || formatTitleName(device.color)
    );
    setNotes(device.reservation?.notes || '');
  }, [device]);

  useEffect(() => {
    if (!device) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [device, saving, onClose]);

  if (!device || !profile) return null;

  const isReserved = device.status === 'reservado';
  const canRelease =
    profile.role === 'admin' || device.reservation?.reservedBy === profile.uid;
  const availableColors = getAvailableColorVariants(device);
  const showColorSelector =
    device.condition === 'lacrado' && availableColors.length > 1 && !isReserved;
  const activeColor = reservedColor || availableColors[0]?.color || formatTitleName(device.color);

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedName = formatTitleName(customerName);
    if (formattedName.length < 2) {
      onError('Informe o nome do cliente para reservar.');
      return;
    }

    const parsedDeposit = depositAmount.trim()
      ? Number(depositAmount.replace(',', '.'))
      : undefined;
    if (
      parsedDeposit !== undefined &&
      (!Number.isFinite(parsedDeposit) || parsedDeposit < 0 || parsedDeposit > device.price)
    ) {
      onError('O sinal deve ser menor ou igual ao valor do aparelho.');
      return;
    }

    setSaving(true);
    try {
      await reserveDevice(
        {
          device,
          customerName: formattedName,
          customerPhone: customerPhone.trim(),
          depositAmount: parsedDeposit,
          reservedColor: activeColor,
          notes: notes.trim(),
        },
        {
          uid: profile.uid,
          displayName: profile.displayName,
          role: profile.role,
        }
      );
      onSuccess(`${formatDeviceModelName(device.model)} reservado para ${formattedName}.`);
      onClose();
    } catch {
      onError('Não foi possível reservar este aparelho.');
    } finally {
      setSaving(false);
    }
  };

  const handleRelease = async () => {
    if (!canRelease) return;
    setSaving(true);
    try {
      await releaseReservation(device, {
        uid: profile.uid,
        displayName: profile.displayName,
        role: profile.role,
      });
      onSuccess(`Reserva de ${formatDeviceModelName(device.model)} liberada.`);
      onClose();
    } catch {
      onError('Sem permissão para cancelar esta reserva.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reservation-sheet-title"
    >
      <div className="w-full sm:max-w-md bg-[#121216] border-t sm:border border-[#26262E] rounded-t-3xl sm:rounded-2xl max-h-[90dvh] flex flex-col overflow-hidden">
        <div className="sm:hidden w-10 h-1.5 bg-zinc-700 rounded-full mx-auto mt-3 shrink-0" />

        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[#26262E] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <BookmarkCheck className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <h2 id="reservation-sheet-title" className="font-display text-lg font-bold text-white truncate">
              {isReserved ? 'Detalhes da Reserva' : 'Reservar Aparelho'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center text-zinc-400 hover:text-white rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-4">
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
                <span className="font-sans text-zinc-200">{activeColor}</span> ·{' '}
                <span className="font-sans">
                  {device.condition === 'lacrado' ? 'Lacrado' : 'Seminovo'}
                </span>
              </p>
            </div>
          </div>

          {isReserved && device.reservation ? (
            <div className="space-y-3 bg-[#09090B] border border-[#26262E] rounded-2xl p-4 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-400">Cliente</span>
                <span className="text-white font-semibold text-sm">
                  {device.reservation.customerName}
                </span>
              </div>
              {device.reservation.customerPhone && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-400">WhatsApp</span>
                  <span className="text-zinc-200 font-mono-tabular">
                    {device.reservation.customerPhone}
                  </span>
                </div>
              )}
              {device.reservation.depositAmount !== undefined &&
                device.reservation.depositAmount > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-400">Sinal pago</span>
                    <span className="text-emerald-400 font-mono-tabular font-semibold">
                      {formatBRL(device.reservation.depositAmount)}
                    </span>
                  </div>
                )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-400">Reservado por</span>
                <span className="text-zinc-200">{device.reservation.reservedByName}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-400">Data da reserva</span>
                <span className="text-zinc-400 font-mono-tabular">
                  {formatTimestamp(device.reservation.reservedAt)}
                </span>
              </div>
              {device.reservation.notes && (
                <p className="pt-2 border-t border-[#1D1D24] text-zinc-300 leading-relaxed">
                  {device.reservation.notes}
                </p>
              )}
            </div>
          ) : (
            <form id="reservation-form" onSubmit={handleReserve} className="space-y-3.5">
              {showColorSelector && (
                <div className="space-y-1.5">
                  <span className="block text-xs font-medium text-zinc-400">Cor reservada</span>
                  <div className="grid grid-cols-2 gap-2">
                    {availableColors.map((variant) => {
                      const isSelected = activeColor === variant.color;
                      const hex = getAppleColorHex(variant.color, device.model);
                      return (
                        <button
                          key={variant.color}
                          type="button"
                          onClick={() => setReservedColor(variant.color)}
                          className={`min-h-[42px] px-3 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-2 ${
                            isSelected
                              ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                              : 'bg-[#09090B] text-zinc-300 border-[#26262E] hover:border-zinc-500'
                          }`}
                        >
                          {hex && (
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-white/25 shrink-0"
                              style={{ backgroundColor: hex }}
                              aria-hidden="true"
                            />
                          )}
                          <span className="truncate">{variant.color}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="res-customer" className="block text-xs font-medium text-zinc-400">
                  Nome do Cliente
                </label>
                <input
                  id="res-customer"
                  type="text"
                  autoCapitalize="words"
                  maxLength={SCHEMA_LIMITS.CUSTOMER_MAX}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  onBlur={() => setCustomerName((v) => formatTitleName(v))}
                  placeholder="Ex: Lucas Pereira"
                  className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="res-phone" className="block text-xs font-medium text-zinc-400">
                    WhatsApp (opcional)
                  </label>
                  <input
                    id="res-phone"
                    type="tel"
                    inputMode="tel"
                    maxLength={SCHEMA_LIMITS.PHONE_MAX}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    onBlur={() => setCustomerPhone((v) => formatPhoneBR(v))}
                    placeholder="(11) 99999-9999"
                    className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="res-deposit" className="block text-xs font-medium text-zinc-400">
                    Sinal recebido R$ (opcional)
                  </label>
                  <input
                    id="res-deposit"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    max={device.price}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="res-notes" className="block text-xs font-medium text-zinc-400">
                  Observação da reserva (opcional)
                </label>
                <input
                  id="res-notes"
                  type="text"
                  maxLength={SCHEMA_LIMITS.NOTES_MAX}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Retira amanhã às 15h"
                  className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </form>
          )}
        </div>

        <div className="px-4 sm:px-5 py-3.5 pb-safe border-t border-[#26262E] bg-[#121216] flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[48px] px-4 rounded-xl bg-[#1A1A20] hover:bg-[#24242C] text-zinc-200 font-semibold text-sm transition-colors"
          >
            Fechar
          </button>
          {isReserved ? (
            canRelease && (
              <button
                type="button"
                disabled={saving}
                onClick={handleRelease}
                className="flex-[1.5] min-h-[48px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-black font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Unlock className="w-4 h-4" />
                {saving ? 'Liberando...' : 'Liberar Reserva'}
              </button>
            )
          ) : (
            <button
              type="submit"
              form="reservation-form"
              disabled={saving}
              className="flex-[1.5] min-h-[48px] px-4 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] disabled:opacity-60 text-black font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <BookmarkCheck className="w-4 h-4" />
              {saving ? 'Reservando...' : 'Confirmar Reserva'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
