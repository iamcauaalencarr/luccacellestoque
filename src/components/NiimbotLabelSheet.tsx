import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, Printer, Share2, X } from 'lucide-react';
import type { DeviceItem, LabelPresetId, LabelStyleId, StoreSettings } from '../types';
import {
  formatBRL,
  formatDeviceModelName,
  formatStorage,
  formatTitleName,
  getAvailableColorVariants,
} from '../utils/formatters';
import { encodeCode128B } from '../utils/barcode';
import {
  getDeviceShortCode,
  LABEL_STYLES,
  type LabelPreset,
  NIIMBOT_PRESETS,
  renderLabelToCanvas,
} from '../utils/niimbotLabelCanvas';

interface NiimbotLabelSheetProps {
  device: DeviceItem | null;
  settings: StoreSettings;
  onClose: () => void;
  onNotify: (type: 'success' | 'error' | 'info', text: string) => void;
}

interface LabelMarkupProps {
  device: DeviceItem;
  preset: LabelPreset;
  styleId: LabelStyleId;
  storeHeading: string;
  showStore: boolean;
  showPrice: boolean;
  showBarcode: boolean;
  shortCode: string;
  barcodeBars: { x: number; w: number }[];
  totalUnits: number;
  isPrintMode?: boolean;
}

function ThermalLabelMarkup({
  device,
  preset,
  styleId,
  storeHeading,
  showStore,
  showPrice,
  showBarcode,
  shortCode,
  barcodeBars,
  totalUnits,
  isPrintMode = false,
}: LabelMarkupProps) {
  const formattedModel = formatDeviceModelName(device.model);
  const formattedColor = formatTitleName(device.color);
  const conditionText = device.condition === 'lacrado' ? 'LACRADO' : 'SEMINOVO';
  const specsText = `${formatStorage(device.storageGb)} · ${formattedColor} · Bat. ${device.batteryHealth}%`;
  const priceText = formatBRL(device.price);
  const isMini = !preset.compact && preset.widthMm <= 35;

  const BarcodeSvg = ({ heightClass }: { heightClass: string }) => (
    <svg
      viewBox={`0 0 ${totalUnits} 24`}
      preserveAspectRatio="none"
      className={`w-full ${heightClass}`}
    >
      {barcodeBars.map((b, idx) => (
        <rect key={idx} x={b.x} y={0} width={b.w} height={24} fill="#000000" />
      ))}
    </svg>
  );

  // 1. Compact strip (D11 / D110)
  if (preset.compact) {
    const hasBorder = styleId === 'boutique' || styleId === 'ficha';
    return (
      <div
        className={`w-full h-full flex flex-col justify-between text-black bg-white ${
          hasBorder ? 'border-[1.5px] border-black rounded-md px-2 py-1' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-1.5">
          <span
            className={`font-display font-extrabold leading-none truncate ${
              isPrintMode ? 'text-[8pt]' : 'text-xs'
            }`}
          >
            {formattedModel}
          </span>
          <span
            className={`font-mono-tabular font-extrabold leading-none whitespace-nowrap ${
              styleId === 'vitrine' ? 'bg-black text-white px-1.5 py-0.5 rounded' : ''
            } ${isPrintMode ? 'text-[7.5pt]' : 'text-[11px]'}`}
          >
            {showPrice ? priceText : conditionText}
          </span>
        </div>

        <p
          className={`font-medium text-zinc-900 leading-none truncate ${
            isPrintMode ? 'text-[6pt]' : 'text-[10px]'
          }`}
        >
          {specsText}
          {showPrice ? ` · ${conditionText}` : ` · ${shortCode}`}
        </p>

        {showBarcode && <BarcodeSvg heightClass={isPrintMode ? 'h-[3mm]' : 'h-3.5'} />}
      </div>
    );
  }

  // 2. Boutique Tarja (Full-width black header banner + outer rounded border)
  if (styleId === 'boutique') {
    return (
      <div className="w-full h-full border-[1.5px] border-black rounded-lg overflow-hidden flex flex-col justify-between bg-white text-black">
        <div
          className={`bg-black text-white flex items-center justify-between gap-1 ${
            isMini ? 'px-2 py-1' : 'px-3 py-1.5'
          }`}
        >
          <span
            className={`font-display font-extrabold tracking-tight leading-none ${
              isPrintMode ? (isMini ? 'text-[5.5pt]' : 'text-[7pt]') : isMini ? 'text-[10px]' : 'text-[11px]'
            }`}
          >
            {showStore ? storeHeading : shortCode}
          </span>
          <span
            className={`font-bold leading-none ${
              isPrintMode ? (isMini ? 'text-[5pt]' : 'text-[6.2pt]') : isMini ? 'text-[9px]' : 'text-[10px]'
            }`}
          >
            {conditionText}
          </span>
        </div>

        <div
          className={`flex-1 flex flex-col justify-between ${
            isMini ? 'px-2 py-1' : 'px-3 py-1.5'
          }`}
        >
          <div>
            <p
              className={`font-display font-extrabold leading-tight truncate ${
                isPrintMode ? (isMini ? 'text-[7.5pt]' : 'text-[9.5pt]') : isMini ? 'text-xs' : 'text-sm'
              }`}
            >
              {formattedModel}
            </p>
            <p
              className={`font-medium leading-tight truncate ${
                isPrintMode ? (isMini ? 'text-[5.2pt]' : 'text-[6.8pt]') : isMini ? 'text-[10px]' : 'text-[11px]'
              }`}
            >
              {specsText}
            </p>
          </div>

          {showPrice && (
            <div className="flex items-baseline justify-between gap-1">
              <span
                className={`font-mono-tabular font-extrabold leading-none ${
                  isPrintMode ? (isMini ? 'text-[8pt]' : 'text-[10.5pt]') : isMini ? 'text-sm' : 'text-base'
                }`}
              >
                {priceText}
              </span>
              {device.notes && (
                <span
                  className={`truncate max-w-[45%] ${
                    isPrintMode ? 'text-[4.8pt]' : 'text-[9px]'
                  }`}
                >
                  {device.notes}
                </span>
              )}
            </div>
          )}

          {showBarcode && (
            <div className="flex flex-col items-center">
              <BarcodeSvg
                heightClass={isPrintMode ? (isMini ? 'h-[3mm]' : 'h-[4.6mm]') : isMini ? 'h-4' : 'h-6'}
              />
              <span
                className={`font-mono-tabular font-semibold leading-none mt-0.5 ${
                  isPrintMode ? 'text-[4.5pt]' : 'text-[8.5px]'
                }`}
              >
                {shortCode}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Vitrine Preço (Inverted high-impact black price pill)
  if (styleId === 'vitrine') {
    return (
      <div
        className={`w-full h-full border-[1.5px] border-black rounded-lg flex flex-col justify-between bg-white text-black ${
          isMini ? 'p-2' : 'p-2.5'
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <span
            className={`font-display font-extrabold tracking-tight leading-none ${
              isPrintMode ? (isMini ? 'text-[5.2pt]' : 'text-[6.8pt]') : isMini ? 'text-[10px]' : 'text-[11px]'
            }`}
          >
            {showStore ? storeHeading : shortCode}
          </span>
          <span
            className={`font-bold leading-none ${
              isPrintMode ? (isMini ? 'text-[5pt]' : 'text-[6.2pt]') : isMini ? 'text-[9px]' : 'text-[10px]'
            }`}
          >
            {conditionText}
          </span>
        </div>

        <div>
          <p
            className={`font-display font-extrabold leading-tight truncate ${
              isPrintMode ? (isMini ? 'text-[7.5pt]' : 'text-[9.5pt]') : isMini ? 'text-xs' : 'text-sm'
            }`}
          >
            {formattedModel}
          </p>
          <p
            className={`font-medium leading-tight truncate ${
              isPrintMode ? (isMini ? 'text-[5.2pt]' : 'text-[6.6pt]') : isMini ? 'text-[10px]' : 'text-[11px]'
            }`}
          >
            {specsText}
          </p>
        </div>

        <div className="flex items-stretch justify-between gap-2">
          {showBarcode && (
            <div
              className={`flex flex-col items-center justify-center ${
                showPrice ? 'w-[45%]' : 'w-full'
              }`}
            >
              <BarcodeSvg
                heightClass={isPrintMode ? (isMini ? 'h-[3.2mm]' : 'h-[4.8mm]') : isMini ? 'h-5' : 'h-6'}
              />
              <span
                className={`font-mono-tabular font-semibold leading-none mt-0.5 ${
                  isPrintMode ? 'text-[4.4pt]' : 'text-[8px]'
                }`}
              >
                {shortCode}
              </span>
            </div>
          )}

          {showPrice && (
            <div
              className={`bg-black text-white rounded-md flex items-center justify-center px-2 ${
                showBarcode ? 'flex-1' : 'w-full py-1.5'
              }`}
            >
              <span
                className={`font-mono-tabular font-extrabold leading-none whitespace-nowrap ${
                  isPrintMode ? (isMini ? 'text-[7.8pt]' : 'text-[10pt]') : isMini ? 'text-xs' : 'text-sm'
                }`}
              >
                {priceText}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4. Ficha Técnica (Structured 3-column spec table)
  if (styleId === 'ficha') {
    return (
      <div
        className={`w-full h-full border-[1.5px] border-black rounded-lg flex flex-col justify-between bg-white text-black ${
          isMini ? 'p-1.5' : 'p-2.5'
        }`}
      >
        <div>
          <div className="flex items-center justify-between gap-1">
            <span
              className={`font-display font-extrabold leading-none ${
                isPrintMode ? (isMini ? 'text-[5pt]' : 'text-[6.6pt]') : isMini ? 'text-[9.5px]' : 'text-[11px]'
              }`}
            >
              {showStore ? storeHeading : shortCode}
            </span>
            <span
              className={`font-mono-tabular font-semibold leading-none ${
                isPrintMode ? 'text-[4.8pt]' : 'text-[9px]'
              }`}
            >
              {shortCode}
            </span>
          </div>

          <p
            className={`font-display font-extrabold leading-tight truncate mt-0.5 ${
              isPrintMode ? (isMini ? 'text-[7.2pt]' : 'text-[9.2pt]') : isMini ? 'text-xs' : 'text-sm'
            }`}
          >
            {formattedModel}
          </p>
        </div>

        {/* 3-Column Technical Grid */}
        <div className="grid grid-cols-3 border border-black rounded divide-x divide-black text-center">
          <div className={isMini ? 'py-0.5 px-0.5' : 'py-1 px-1'}>
            <p
              className={`font-bold leading-none ${
                isPrintMode ? 'text-[4.2pt]' : isMini ? 'text-[7px]' : 'text-[8px]'
              }`}
            >
              MEMÓRIA
            </p>
            <p
              className={`font-mono-tabular font-extrabold leading-tight mt-0.5 ${
                isPrintMode ? (isMini ? 'text-[5.5pt]' : 'text-[7pt]') : isMini ? 'text-[10px]' : 'text-xs'
              }`}
            >
              {formatStorage(device.storageGb)}
            </p>
          </div>
          <div className={isMini ? 'py-0.5 px-0.5' : 'py-1 px-1'}>
            <p
              className={`font-bold leading-none ${
                isPrintMode ? 'text-[4.2pt]' : isMini ? 'text-[7px]' : 'text-[8px]'
              }`}
            >
              BATERIA
            </p>
            <p
              className={`font-mono-tabular font-extrabold leading-tight mt-0.5 ${
                isPrintMode ? (isMini ? 'text-[5.5pt]' : 'text-[7pt]') : isMini ? 'text-[10px]' : 'text-xs'
              }`}
            >
              {device.batteryHealth}%
            </p>
          </div>
          <div className={isMini ? 'py-0.5 px-0.5' : 'py-1 px-1'}>
            <p
              className={`font-bold leading-none ${
                isPrintMode ? 'text-[4.2pt]' : isMini ? 'text-[7px]' : 'text-[8px]'
              }`}
            >
              ESTADO
            </p>
            <p
              className={`font-mono-tabular font-extrabold leading-tight mt-0.5 truncate ${
                isPrintMode ? (isMini ? 'text-[5pt]' : 'text-[6.5pt]') : isMini ? 'text-[9px]' : 'text-[11px]'
              }`}
            >
              {conditionText}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p
              className={`font-semibold leading-none truncate ${
                isPrintMode ? (isMini ? 'text-[4.8pt]' : 'text-[6.2pt]') : isMini ? 'text-[9px]' : 'text-[10px]'
              }`}
            >
              Cor: {formattedColor}
            </p>
            {showPrice && (
              <p
                className={`font-mono-tabular font-extrabold leading-none mt-0.5 ${
                  isPrintMode ? (isMini ? 'text-[7.5pt]' : 'text-[9.5pt]') : isMini ? 'text-xs' : 'text-sm'
                }`}
              >
                {priceText}
              </p>
            )}
          </div>

          {showBarcode && (
            <div className="w-[46%] shrink-0">
              <BarcodeSvg
                heightClass={isPrintMode ? (isMini ? 'h-[3.5mm]' : 'h-[5mm]') : isMini ? 'h-5' : 'h-6'}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // 5. Minimalista (Classic clean thermal)
  return (
    <div className="w-full h-full flex flex-col justify-between text-black bg-white">
      <div>
        <div className="flex items-center justify-between gap-1 pb-0.5 border-b border-black">
          <span
            className={`font-display font-extrabold tracking-tight ${
              isPrintMode ? (isMini ? 'text-[5.5pt]' : 'text-[7pt]') : isMini ? 'text-[10px]' : 'text-[11px]'
            }`}
          >
            {showStore ? storeHeading : shortCode}
          </span>
          <span
            className={`font-bold px-1 py-0.5 rounded ${
              isPrintMode ? (isMini ? 'text-[5pt]' : 'text-[6.2pt] px-1.5') : isMini ? 'text-[9px]' : 'text-[10px] px-1.5'
            } ${
              device.condition === 'lacrado'
                ? 'bg-black text-white'
                : 'border border-black text-black'
            }`}
          >
            {conditionText}
          </span>
        </div>

        <p
          className={`font-display font-extrabold leading-tight mt-0.5 truncate ${
            isPrintMode ? (isMini ? 'text-[7.5pt]' : 'text-[9.5pt] mt-1') : isMini ? 'text-xs' : 'text-sm mt-1'
          }`}
        >
          {formattedModel}
        </p>
        <p
          className={`font-medium leading-tight truncate ${
            isPrintMode ? (isMini ? 'text-[5.4pt]' : 'text-[6.8pt] mt-0.5') : isMini ? 'text-[10px]' : 'text-[11px] mt-0.5'
          }`}
        >
          {specsText}
        </p>
      </div>

      {showPrice && (
        <div className="flex items-baseline justify-between gap-1">
          <span
            className={`font-mono-tabular font-extrabold leading-none ${
              isPrintMode ? (isMini ? 'text-[8.2pt]' : 'text-[10.5pt]') : isMini ? 'text-sm' : 'text-base'
            }`}
          >
            {priceText}
          </span>
          {device.notes && (
            <span className={`truncate max-w-[45%] ${isPrintMode ? 'text-[4.8pt]' : 'text-[10px]'}`}>
              {device.notes}
            </span>
          )}
        </div>
      )}

      {showBarcode && (
        <div className="flex flex-col items-center">
          <BarcodeSvg
            heightClass={isPrintMode ? (isMini ? 'h-[3.3mm]' : 'h-[5mm]') : isMini ? 'h-4' : 'h-6'}
          />
          <span
            className={`font-mono-tabular font-semibold leading-none mt-0.5 ${
              isPrintMode ? (isMini ? 'text-[4.6pt]' : 'text-[5.5pt]') : 'text-[9px]'
            }`}
          >
            {shortCode}
          </span>
        </div>
      )}
    </div>
  );
}

export function NiimbotLabelSheet({ device, settings, onClose, onNotify }: NiimbotLabelSheetProps) {
  const [presetId, setPresetId] = useState<LabelPresetId>(settings.defaultLabelPresetId);
  const [styleId, setStyleId] = useState<LabelStyleId>(settings.defaultLabelStyleId);
  const [showStore, setShowStore] = useState(settings.labelShowStore);
  const [showPrice, setShowPrice] = useState(settings.labelShowPrice);
  const [showBarcode, setShowBarcode] = useState(settings.labelShowBarcode);
  const [selectedColor, setSelectedColor] = useState('');
  const [copied, setCopied] = useState(false);

  const availableColors = useMemo(
    () => (device ? getAvailableColorVariants(device) : []),
    [device]
  );

  useEffect(() => {
    if (!device) return;
    setPresetId(settings.defaultLabelPresetId);
    setStyleId(settings.defaultLabelStyleId);
    setShowStore(settings.labelShowStore);
    setShowPrice(settings.labelShowPrice);
    setSelectedColor(availableColors[0]?.color || formatTitleName(device.color));
    setShowBarcode(
      settings.defaultLabelPresetId === '50x15' || settings.defaultLabelPresetId === '40x12'
        ? false
        : settings.labelShowBarcode
    );
  }, [device, settings, availableColors]);

  useEffect(() => {
    if (!device) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [device, onClose]);

  const preset = useMemo(
    () => NIIMBOT_PRESETS.find((p) => p.id === presetId) || NIIMBOT_PRESETS[0],
    [presetId]
  );

  const effectiveDevice = useMemo(() => {
    if (!device) return null;
    return {
      ...device,
      color: selectedColor || availableColors[0]?.color || formatTitleName(device.color),
    };
  }, [device, selectedColor, availableColors]);

  const storeHeading = (settings.storeName || 'Lucca Cell').trim().toUpperCase() || 'LUCCA CELL';
  const shortCode = effectiveDevice ? getDeviceShortCode(effectiveDevice, settings.labelPrefix) : '';
  const barcodeData = useMemo(() => encodeCode128B(shortCode || 'LUCCACELL'), [shortCode]);

  if (!effectiveDevice) return null;

  const canShareFiles =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleSelectPreset = (nextPreset: LabelPreset) => {
    setPresetId(nextPreset.id);
    if (nextPreset.compact) {
      setShowBarcode(false);
    } else {
      setShowBarcode(settings.labelShowBarcode);
    }
  };

  const handleDownloadPng = async () => {
    try {
      const canvas = renderLabelToCanvas(effectiveDevice, preset, {
        styleId,
        showStore,
        showPrice,
        showBarcode,
        storeName: settings.storeName,
        labelPrefix: settings.labelPrefix,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const slug = effectiveDevice.model.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      link.download = `etiqueta-niimbot-${slug}-${styleId}-${preset.id}.png`;
      link.href = dataUrl;
      link.click();
      onNotify('success', 'Imagem PNG da etiqueta baixada! Abra no app NIIMBOT para imprimir.');
    } catch {
      onNotify('error', 'Não foi possível gerar a imagem da etiqueta.');
    }
  };

  const handleShareToNiimbot = async () => {
    try {
      const canvas = renderLabelToCanvas(effectiveDevice, preset, {
        styleId,
        showStore,
        showPrice,
        showBarcode,
        storeName: settings.storeName,
        labelPrefix: settings.labelPrefix,
      });
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (!blob) throw new Error('Falha ao gerar PNG');

      const file = new File([blob], `etiqueta-${shortCode}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Etiqueta ${effectiveDevice.model}`,
          files: [file],
        });
      } else {
        await handleDownloadPng();
      }
    } catch (err) {
      if ((err as { name?: string })?.name !== 'AbortError') {
        await handleDownloadPng();
      }
    }
  };

  const handleDirectPrint = () => {
    window.print();
  };

  const handleCopyText = async () => {
    const condLabel = effectiveDevice.condition === 'lacrado' ? 'LACRADO' : 'SEMINOVO';
    const lines = [
      showStore ? storeHeading : null,
      `${formatDeviceModelName(effectiveDevice.model)} (${condLabel})`,
      `${formatStorage(effectiveDevice.storageGb)} · ${formatTitleName(effectiveDevice.color)} · Bat. ${effectiveDevice.batteryHealth}%`,
      showPrice ? formatBRL(effectiveDevice.price) : null,
      effectiveDevice.notes ? effectiveDevice.notes : null,
      `Cód: ${shortCode}`,
    ].filter(Boolean);

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      onNotify('success', 'Texto da etiqueta copiado.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onNotify('error', 'Não foi possível copiar o texto.');
    }
  };

  let svgX = 0;
  const barcodeBars: { x: number; w: number }[] = [];
  for (const mod of barcodeData.modules) {
    if (mod.isBar) {
      barcodeBars.push({ x: svgX, w: mod.width });
    }
    svgX += mod.width;
  }

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: ${preset.widthMm}mm ${preset.heightMm}mm;
            margin: 0;
          }
        }
      `}</style>

      {/* Printable Hidden-On-Screen Thermal Node */}
      <div
        id="niimbot-print-area"
        aria-hidden="true"
        className="hidden print:flex print:items-center print:justify-center bg-white text-black"
        style={{
          width: `${preset.widthMm}mm`,
          height: `${preset.heightMm}mm`,
          padding:
            styleId === 'minimal'
              ? preset.compact
                ? '1.2mm 2mm'
                : preset.widthMm <= 35
                  ? '1.4mm 1.8mm'
                  : '2.2mm 2.6mm'
              : '0.8mm',
        }}
      >
        <ThermalLabelMarkup
          device={effectiveDevice}
          preset={preset}
          styleId={styleId}
          storeHeading={storeHeading}
          showStore={showStore}
          showPrice={showPrice}
          showBarcode={showBarcode}
          shortCode={shortCode}
          barcodeBars={barcodeBars}
          totalUnits={barcodeData.totalUnits}
          isPrintMode
        />
      </div>

      {/* Screen Modal / Bottom Sheet */}
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="print:hidden fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="niimbot-sheet-title"
      >
        <div className="w-full sm:max-w-lg bg-[#121216] border-t sm:border border-[#26262E] rounded-t-3xl sm:rounded-2xl max-h-[90dvh] flex flex-col overflow-hidden">
          <div className="sm:hidden w-10 h-1.5 bg-zinc-700 rounded-full mx-auto mt-3 shrink-0" />

          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[#26262E] shrink-0">
            <div className="min-w-0">
              <h2 id="niimbot-sheet-title" className="font-display text-lg font-bold text-white">
                Etiqueta NIIMBOT
              </h2>
              <p className="text-xs text-zinc-400 truncate">
                Prévia térmica · {preset.label} · {preset.modelHint}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center text-zinc-400 hover:text-white rounded-xl shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-4">
            {/* Live Monochrome Thermal Label Preview */}
            <div className="bg-[#09090B] rounded-2xl p-3.5 sm:p-5 flex items-center justify-center overflow-hidden">
              <div
                className="bg-white text-black rounded-lg shadow-md border border-zinc-300 overflow-hidden transition-all max-w-full"
                style={{
                  width: `${Math.min(284, preset.widthMm * (preset.widthMm <= 35 ? 8.2 : 5.4))}px`,
                  height: `${Math.max(78, preset.heightMm * (preset.widthMm <= 35 ? 8.2 : 5.4))}px`,
                  padding:
                    styleId === 'minimal'
                      ? preset.compact
                        ? '8px 12px'
                        : preset.widthMm <= 35
                          ? '10px 12px'
                          : '12px 14px'
                      : '6px',
                }}
              >
                <ThermalLabelMarkup
                  device={effectiveDevice}
                  preset={preset}
                  styleId={styleId}
                  storeHeading={storeHeading}
                  showStore={showStore}
                  showPrice={showPrice}
                  showBarcode={showBarcode}
                  shortCode={shortCode}
                  barcodeBars={barcodeBars}
                  totalUnits={barcodeData.totalUnits}
                />
              </div>
            </div>

            {availableColors.length > 1 && (
              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-zinc-400">
                  Cor impressa na etiqueta
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {availableColors.map((v) => {
                    const active = effectiveDevice.color === v.color;
                    return (
                      <button
                        key={v.color}
                        type="button"
                        onClick={() => setSelectedColor(v.color)}
                        className={`min-h-[40px] px-2.5 rounded-xl text-xs font-semibold border transition-colors truncate ${
                          active
                            ? 'bg-white text-black border-white'
                            : 'bg-[#09090B] text-zinc-300 border-[#26262E] hover:border-zinc-500'
                        }`}
                      >
                        {v.color}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Visual Style Selector (4 Templates) */}
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-zinc-400">
                Modelo Visual da Etiqueta
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {LABEL_STYLES.map((st) => {
                  const active = styleId === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStyleId(st.id)}
                      className={`min-h-[48px] px-3 py-2 rounded-xl text-left border transition-colors ${
                        active
                          ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                          : 'bg-[#09090B] text-white border-[#26262E] hover:border-zinc-500'
                      }`}
                    >
                      <span className="block text-xs font-bold leading-tight">{st.name}</span>
                      <span
                        className={`block text-[11px] leading-tight mt-0.5 ${
                          active ? 'text-black/80' : 'text-zinc-400'
                        }`}
                      >
                        {st.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Label Size Presets */}
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-zinc-400">
                Tamanho da Etiqueta NIIMBOT
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {NIIMBOT_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`min-h-[44px] px-2 rounded-xl text-xs font-mono-tabular font-semibold border transition-colors whitespace-nowrap ${
                      presetId === p.id
                        ? 'bg-white text-black border-white'
                        : 'bg-[#09090B] text-zinc-300 border-[#26262E] hover:border-zinc-500'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Toggles */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setShowStore((v) => !v)}
                className={`min-h-[44px] px-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
                  showStore
                    ? 'bg-white text-black border-white'
                    : 'bg-[#09090B] text-zinc-400 border-[#26262E]'
                }`}
              >
                Nome Loja
              </button>
              <button
                type="button"
                onClick={() => setShowPrice((v) => !v)}
                className={`min-h-[44px] px-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
                  showPrice
                    ? 'bg-white text-black border-white'
                    : 'bg-[#09090B] text-zinc-400 border-[#26262E]'
                }`}
              >
                Mostrar R$
              </button>
              <button
                type="button"
                onClick={() => setShowBarcode((v) => !v)}
                className={`min-h-[44px] px-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
                  showBarcode
                    ? 'bg-white text-black border-white'
                    : 'bg-[#09090B] text-zinc-400 border-[#26262E]'
                }`}
              >
                Cód. Barras
              </button>
            </div>
          </div>

          {/* Sticky Action Footer */}
          <div className="px-4 sm:px-5 py-3.5 pb-safe border-t border-[#26262E] bg-[#121216] space-y-2 shrink-0">
            <div className="grid grid-cols-2 gap-2">
              {canShareFiles ? (
                <button
                  type="button"
                  onClick={handleShareToNiimbot}
                  className="min-h-[48px] px-3 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-black font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Share2 className="w-4 h-4 shrink-0" />
                  <span className="truncate">App NIIMBOT</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="min-h-[48px] px-3 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-black font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span className="truncate">Baixar PNG</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDirectPrint}
                className="min-h-[48px] px-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span className="truncate">Imprimir</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {canShareFiles && (
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="min-h-[44px] px-3 rounded-xl bg-[#1A1A20] hover:bg-[#24242C] text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  Baixar PNG
                </button>
              )}
              <button
                type="button"
                onClick={handleCopyText}
                className={`min-h-[44px] px-3 rounded-xl bg-[#1A1A20] hover:bg-[#24242C] text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  canShareFiles ? '' : 'col-span-2'
                }`}
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="truncate">{copied ? 'Copiado' : 'Copiar texto'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
