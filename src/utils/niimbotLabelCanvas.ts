import type { DeviceItem, LabelPresetId, LabelStyleId } from '../types';
import { formatBRL, formatDeviceModelName, formatStorage, formatTitleName } from './formatters';
import { encodeCode128B } from './barcode';

export type { LabelStyleId, LabelPresetId };

export interface LabelStyleOption {
  id: LabelStyleId;
  name: string;
  subtitle: string;
}

export const LABEL_STYLES: LabelStyleOption[] = [
  { id: 'boutique', name: 'Boutique Tarja', subtitle: 'Moldura e topo preto' },
  { id: 'vitrine', name: 'Vitrine Preço', subtitle: 'Valor em destaque' },
  { id: 'ficha', name: 'Ficha Técnica', subtitle: 'Grade de specs' },
  { id: 'minimal', name: 'Minimalista', subtitle: 'Limpo e clássico' },
];

export interface LabelPreset {
  id: LabelPresetId;
  label: string;
  modelHint: string;
  widthMm: number;
  heightMm: number;
  compact: boolean;
}

export const NIIMBOT_PRESETS: LabelPreset[] = [
  {
    id: '30x20',
    label: '30 × 20 mm',
    modelHint: 'B1 / B21 / B3S (Mini 30×20)',
    widthMm: 30,
    heightMm: 20,
    compact: false,
  },
  {
    id: '50x30',
    label: '50 × 30 mm',
    modelHint: 'B1 / B21 / B3S (Padrão)',
    widthMm: 50,
    heightMm: 30,
    compact: false,
  },
  {
    id: '40x30',
    label: '40 × 30 mm',
    modelHint: 'B1 / B21 (Compacta)',
    widthMm: 40,
    heightMm: 30,
    compact: false,
  },
  {
    id: '60x40',
    label: '60 × 40 mm',
    modelHint: 'B21 / B3S (Grande)',
    widthMm: 60,
    heightMm: 40,
    compact: false,
  },
  {
    id: '50x15',
    label: '50 × 15 mm',
    modelHint: 'D11 / D110 (Tira)',
    widthMm: 50,
    heightMm: 15,
    compact: true,
  },
  {
    id: '40x12',
    label: '40 × 12 mm',
    modelHint: 'D11 / D110 (Fina)',
    widthMm: 40,
    heightMm: 12,
    compact: true,
  },
];

export interface LabelRenderOptions {
  styleId: LabelStyleId;
  showStore: boolean;
  showPrice: boolean;
  showBarcode: boolean;
  storeName?: string;
  labelPrefix?: string;
}

export function getDeviceShortCode(device: DeviceItem, prefix = 'LC'): string {
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'LC';
  return `${cleanPrefix}-${device.id.slice(0, 6).toUpperCase()}`;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  let out = text;
  while (ctx.measureText(out).width > maxWidth && out.length > 3) {
    out = `${out.slice(0, -2)}…`;
  }
  return out;
}

function drawBarcode(
  ctx: CanvasRenderingContext2D,
  shortCode: string,
  x: number,
  y: number,
  maxWidth: number,
  barHeight: number,
  showCodeLabel: boolean,
  codeFontSize: number
) {
  const { modules, totalUnits } = encodeCode128B(shortCode);
  const barTotalW = Math.min(maxWidth, totalUnits * 3.2);
  const unitW = barTotalW / totalUnits;
  let curX = x + (maxWidth - barTotalW) / 2;

  ctx.fillStyle = '#000000';
  for (const m of modules) {
    if (m.isBar) {
      ctx.fillRect(curX, y, m.width * unitW, barHeight);
    }
    curX += m.width * unitW;
  }

  if (showCodeLabel) {
    ctx.font = `600 ${codeFontSize}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(shortCode, x + maxWidth / 2, y + barHeight + 4);
    ctx.textAlign = 'left';
  }
}

export function renderLabelToCanvas(
  device: DeviceItem,
  preset: LabelPreset,
  options: LabelRenderOptions
): HTMLCanvasElement {
  // 16 px/mm = crisp 2x 203-DPI thermal printhead resolution
  const scale = 16;
  const width = Math.round(preset.widthMm * scale);
  const height = Math.round(preset.heightMm * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#000000';
  ctx.strokeStyle = '#000000';

  const formattedModel = formatDeviceModelName(device.model);
  const formattedColor = formatTitleName(device.color);
  const conditionText = device.condition === 'lacrado' ? 'LACRADO' : 'SEMINOVO';
  const specsText = `${formatStorage(device.storageGb)} · ${formattedColor} · Bat ${device.batteryHealth}%`;
  const priceText = formatBRL(device.price);
  const shortCode = getDeviceShortCode(device, options.labelPrefix);
  const storeHeading = (options.storeName || 'LUCCA CELL').trim().toUpperCase() || 'LUCCA CELL';
  const isMiniBox = !preset.compact && preset.widthMm <= 35;

  // 1. Compact strip layout (D11 / D110: 40x12mm or 50x15mm)
  if (preset.compact) {
    const frameInset = options.styleId === 'boutique' || options.styleId === 'ficha' ? 6 : 0;
    if (frameInset > 0) {
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, frameInset, frameInset, width - frameInset * 2, height - frameInset * 2, 10);
      ctx.stroke();
    }

    const pad = Math.round(frameInset > 0 ? 18 : 14);
    const innerW = width - pad * 2;
    const headerSize = Math.round(height * 0.21);
    const specSize = Math.round(height * 0.165);

    const rightText = options.showPrice ? priceText : conditionText;
    ctx.font = `800 ${headerSize}px "JetBrains Mono", monospace`;
    const rightWidth = ctx.measureText(rightText).width;

    if (options.styleId === 'vitrine') {
      const boxPadX = 12;
      const boxW = rightWidth + boxPadX * 2;
      const boxH = headerSize + 10;
      drawRoundedRect(ctx, width - pad - boxW, pad * 0.55, boxW, boxH, 8);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'right';
      ctx.fillText(rightText, width - pad - boxPadX, pad * 0.55 + 5);
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'left';

      ctx.font = `800 ${headerSize}px "Plus Jakarta Sans", Arial, sans-serif`;
      ctx.fillText(fitText(ctx, formattedModel, innerW - boxW - 12), pad, pad * 0.65);
    } else {
      ctx.font = `800 ${headerSize}px "Plus Jakarta Sans", Arial, sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(fitText(ctx, formattedModel, innerW - rightWidth - 14), pad, pad * 0.65);

      ctx.textAlign = 'right';
      ctx.font = `800 ${headerSize}px "JetBrains Mono", monospace`;
      ctx.fillText(rightText, width - pad, pad * 0.65);
      ctx.textAlign = 'left';
    }

    const secondY = pad * 0.65 + headerSize + Math.round(height * 0.09);
    ctx.font = `600 ${specSize}px "DM Sans", Arial, sans-serif`;
    const compactSub = options.showPrice
      ? `${specsText} · ${conditionText}`
      : `${specsText} · ${shortCode}`;
    ctx.fillText(fitText(ctx, compactSub, innerW), pad, secondY);

    if (options.showBarcode) {
      const barcodeTop = secondY + specSize + 8;
      const barcodeH = Math.max(22, height - barcodeTop - pad * 0.55);
      drawBarcode(ctx, shortCode, pad, barcodeTop, innerW, barcodeH, false, 12);
    }
    return canvas;
  }

  // 2. Boutique Tarja Style (Full-width black top banner + crisp outer frame)
  if (options.styleId === 'boutique') {
    const outer = isMiniBox ? 8 : 12;
    const radius = isMiniBox ? 14 : 18;
    const headerH = Math.round(height * 0.19);
    const padX = outer + (isMiniBox ? 12 : 18);
    const innerW = width - padX * 2;

    // Outer frame
    ctx.lineWidth = isMiniBox ? 3 : 4;
    drawRoundedRect(ctx, outer, outer, width - outer * 2, height - outer * 2, radius);
    ctx.stroke();

    // Solid black top banner clipped inside top rounded corners
    ctx.save();
    drawRoundedRect(ctx, outer, outer, width - outer * 2, height - outer * 2, radius);
    ctx.clip();
    ctx.fillStyle = '#000000';
    ctx.fillRect(outer, outer, width - outer * 2, headerH);
    ctx.restore();

    // Header text in white
    ctx.fillStyle = '#FFFFFF';
    const headerFont = Math.round(headerH * 0.54);
    ctx.font = `800 ${headerFont}px "Plus Jakarta Sans", Arial, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(options.showStore ? storeHeading : shortCode, padX, outer + headerH / 2 + 1);

    const tagFont = Math.round(headerH * 0.48);
    ctx.font = `700 ${tagFont}px "DM Sans", Arial, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(conditionText, width - padX, outer + headerH / 2 + 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#000000';

    let y = outer + headerH + Math.round(height * 0.045);

    // Model
    const modelFont = Math.round(height * 0.13);
    ctx.font = `800 ${modelFont}px "Plus Jakarta Sans", Arial, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(fitText(ctx, formattedModel, innerW), padX, y);
    y += modelFont + Math.round(height * 0.025);

    // Specs
    const specsFont = Math.round(height * 0.085);
    ctx.font = `600 ${specsFont}px "DM Sans", Arial, sans-serif`;
    ctx.fillText(fitText(ctx, specsText, innerW), padX, y);
    y += specsFont + Math.round(height * 0.035);

    // Price row
    if (options.showPrice) {
      const priceFont = Math.round(height * 0.14);
      ctx.font = `800 ${priceFont}px "JetBrains Mono", monospace`;
      ctx.fillText(priceText, padX, y);
      if (device.notes) {
        const priceW = ctx.measureText(priceText).width;
        const noteMaxW = innerW - priceW - 14;
        if (noteMaxW > 70) {
          const noteFont = Math.round(height * 0.068);
          ctx.font = `500 ${noteFont}px "DM Sans", Arial, sans-serif`;
          ctx.textAlign = 'right';
          ctx.fillText(fitText(ctx, device.notes, noteMaxW), width - padX, y + priceFont * 0.25);
          ctx.textAlign = 'left';
        }
      }
      y += priceFont + Math.round(height * 0.03);
    } else if (device.notes) {
      const noteFont = Math.round(height * 0.075);
      ctx.font = `500 ${noteFont}px "DM Sans", Arial, sans-serif`;
      ctx.fillText(fitText(ctx, device.notes, innerW), padX, y);
      y += noteFont + Math.round(height * 0.03);
    }

    if (options.showBarcode) {
      const codeFont = Math.round(height * 0.066);
      const bottomLimit = height - outer - (isMiniBox ? 8 : 12);
      const barcodeH = Math.max(isMiniBox ? 24 : 34, bottomLimit - y - codeFont - 4);
      drawBarcode(ctx, shortCode, padX, y, innerW, barcodeH, true, codeFont);
    }
    return canvas;
  }

  // 3. Vitrine Preço Style (Bold inverted price badge + compact info)
  if (options.styleId === 'vitrine') {
    const outer = isMiniBox ? 8 : 12;
    const radius = isMiniBox ? 14 : 18;
    const padX = outer + (isMiniBox ? 12 : 18);
    const innerW = width - padX * 2;

    ctx.lineWidth = isMiniBox ? 2.5 : 3.5;
    drawRoundedRect(ctx, outer, outer, width - outer * 2, height - outer * 2, radius);
    ctx.stroke();

    let y = outer + (isMiniBox ? 10 : 16);
    const topFont = Math.round(height * 0.092);
    ctx.font = `800 ${topFont}px "Plus Jakarta Sans", Arial, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(options.showStore ? storeHeading : shortCode, padX, y);

    ctx.textAlign = 'right';
    ctx.font = `700 ${Math.round(topFont * 0.92)}px "DM Sans", Arial, sans-serif`;
    ctx.fillText(conditionText, width - padX, y);
    ctx.textAlign = 'left';

    y += topFont + Math.round(height * 0.045);

    // Big Model
    const modelFont = Math.round(height * 0.135);
    ctx.font = `800 ${modelFont}px "Plus Jakarta Sans", Arial, sans-serif`;
    ctx.fillText(fitText(ctx, formattedModel, innerW), padX, y);
    y += modelFont + Math.round(height * 0.025);

    // Specs
    const specsFont = Math.round(height * 0.084);
    ctx.font = `600 ${specsFont}px "DM Sans", Arial, sans-serif`;
    ctx.fillText(fitText(ctx, specsText, innerW), padX, y);
    y += specsFont + Math.round(height * 0.045);

    // Bottom zone: Inverted Black Price Box (+ Barcode on left if enabled)
    const bottomLimit = height - outer - (isMiniBox ? 10 : 14);
    const bottomH = Math.max(48, bottomLimit - y);

    if (options.showPrice && options.showBarcode) {
      const priceBoxW = Math.round(innerW * 0.53);
      const barcodeZoneW = innerW - priceBoxW - (isMiniBox ? 10 : 16);

      // Left barcode
      const codeFont = Math.round(height * 0.062);
      const barH = Math.max(24, bottomH - codeFont - 4);
      drawBarcode(ctx, shortCode, padX, y, barcodeZoneW, barH, true, codeFont);

      // Right solid black price pill
      const boxX = width - padX - priceBoxW;
      ctx.fillStyle = '#000000';
      drawRoundedRect(ctx, boxX, y, priceBoxW, bottomH, isMiniBox ? 10 : 14);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      const priceFont = Math.round(bottomH * 0.36);
      ctx.font = `800 ${priceFont}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fitText(ctx, priceText, priceBoxW - 14), boxX + priceBoxW / 2, y + bottomH / 2);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#000000';
    } else if (options.showPrice) {
      ctx.fillStyle = '#000000';
      drawRoundedRect(ctx, padX, y, innerW, bottomH, isMiniBox ? 10 : 14);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      const priceFont = Math.round(bottomH * 0.44);
      ctx.font = `800 ${priceFont}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(priceText, width / 2, y + bottomH / 2);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#000000';
    } else if (options.showBarcode) {
      const codeFont = Math.round(height * 0.066);
      const barH = Math.max(26, bottomH - codeFont - 4);
      drawBarcode(ctx, shortCode, padX, y, innerW, barH, true, codeFont);
    }

    return canvas;
  }

  // 4. Ficha Técnica Style (Structured 3-column spec grid)
  if (options.styleId === 'ficha') {
    const outer = isMiniBox ? 8 : 12;
    const radius = isMiniBox ? 12 : 16;
    const padX = outer + (isMiniBox ? 10 : 16);
    const innerW = width - padX * 2;

    ctx.lineWidth = isMiniBox ? 2.5 : 3.5;
    drawRoundedRect(ctx, outer, outer, width - outer * 2, height - outer * 2, radius);
    ctx.stroke();

    let y = outer + (isMiniBox ? 10 : 14);
    const brandFont = Math.round(height * 0.088);
    ctx.font = `800 ${brandFont}px "Plus Jakarta Sans", Arial, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(options.showStore ? storeHeading : shortCode, padX, y);

    ctx.textAlign = 'right';
    ctx.font = `600 ${Math.round(brandFont * 0.9)}px "JetBrains Mono", monospace`;
    ctx.fillText(shortCode, width - padX, y);
    ctx.textAlign = 'left';

    y += brandFont + Math.round(height * 0.03);

    // Model
    const modelFont = Math.round(height * 0.125);
    ctx.font = `800 ${modelFont}px "Plus Jakarta Sans", Arial, sans-serif`;
    ctx.fillText(fitText(ctx, formattedModel, innerW), padX, y);
    y += modelFont + Math.round(height * 0.035);

    // 3-Cell Technical Spec Grid: [ Storage ] [ Battery ] [ Condition ]
    const gridH = Math.round(height * 0.21);
    const colW = innerW / 3;
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, padX, y, innerW, gridH, 8);
    ctx.stroke();

    // Vertical cell dividers
    ctx.fillRect(padX + colW - 1, y, 2, gridH);
    ctx.fillRect(padX + colW * 2 - 1, y, 2, gridH);

    const cells = [
      { label: 'MEMÓRIA', val: formatStorage(device.storageGb) },
      { label: 'BATERIA', val: `${device.batteryHealth}%` },
      { label: 'ESTADO', val: conditionText },
    ];

    const cellLabelFont = Math.round(gridH * 0.23);
    const cellValFont = Math.round(gridH * 0.34);

    cells.forEach((cell, idx) => {
      const cx = padX + colW * idx + colW / 2;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = `700 ${cellLabelFont}px "DM Sans", Arial, sans-serif`;
      ctx.fillText(cell.label, cx, y + Math.round(gridH * 0.14));
      ctx.font = `800 ${cellValFont}px "JetBrains Mono", monospace`;
      ctx.fillText(cell.val, cx, y + Math.round(gridH * 0.47));
    });
    ctx.textAlign = 'left';

    y += gridH + Math.round(height * 0.04);

    // Bottom zone: Color + Price + optional Barcode
    const colorFont = Math.round(height * 0.08);
    const priceFont = Math.round(height * 0.13);
    const bottomLimit = height - outer - (isMiniBox ? 8 : 12);

    if (options.showBarcode) {
      const leftW = Math.round(innerW * 0.48);
      const rightW = innerW - leftW - 12;

      ctx.font = `600 ${colorFont}px "DM Sans", Arial, sans-serif`;
      ctx.fillText(fitText(ctx, `Cor: ${formattedColor}`, leftW), padX, y);
      if (options.showPrice) {
        ctx.font = `800 ${priceFont}px "JetBrains Mono", monospace`;
        ctx.fillText(priceText, padX, y + colorFont + 4, leftW);
      }

      const barH = Math.max(24, bottomLimit - y - 2);
      drawBarcode(ctx, shortCode, width - padX - rightW, y, rightW, barH, false, 12);
    } else {
      ctx.font = `600 ${colorFont}px "DM Sans", Arial, sans-serif`;
      ctx.fillText(`Cor: ${formattedColor}`, padX, y);
      if (options.showPrice) {
        ctx.font = `800 ${priceFont}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'right';
        ctx.fillText(priceText, width - padX, y - 2);
        ctx.textAlign = 'left';
      }
    }

    return canvas;
  }

  // 5. Minimalista Style (Clean classic thermal layout)
  const pad = Math.round(isMiniBox ? 16 : 26);
  const innerW = width - pad * 2;
  let y = pad;
  const topH = Math.round(height * 0.11);

  if (options.showStore) {
    ctx.font = `800 ${topH}px "Plus Jakarta Sans", Arial, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(storeHeading, pad, y);
  }

  const tagFont = Math.round(topH * 0.84);
  ctx.font = `700 ${tagFont}px "DM Sans", Arial, sans-serif`;
  const tagPadX = isMiniBox ? 9 : 14;
  const tagPadY = isMiniBox ? 4 : 6;
  const tagTextW = ctx.measureText(conditionText).width;
  const tagW = tagTextW + tagPadX * 2;
  const tagH = tagFont + tagPadY * 2;
  const tagX = width - pad - tagW;

  if (device.condition === 'lacrado') {
    drawRoundedRect(ctx, tagX, y - 2, tagW, tagH, 8);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'top';
    ctx.fillText(conditionText, tagX + tagPadX, y + tagPadY - 2);
    ctx.fillStyle = '#000000';
  } else {
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, tagX, y - 2, tagW, tagH, 8);
    ctx.stroke();
    ctx.textBaseline = 'top';
    ctx.fillText(conditionText, tagX + tagPadX, y + tagPadY - 2);
  }

  y += Math.max(topH, tagH) + Math.round(height * 0.045);
  ctx.fillRect(pad, y, innerW, 2);
  y += Math.round(height * 0.045);

  const modelFont = Math.round(height * 0.13);
  ctx.font = `800 ${modelFont}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(fitText(ctx, formattedModel, innerW), pad, y);
  y += modelFont + Math.round(height * 0.03);

  const specsFont = Math.round(height * 0.085);
  ctx.font = `600 ${specsFont}px "DM Sans", Arial, sans-serif`;
  ctx.fillText(fitText(ctx, specsText, innerW), pad, y);
  y += specsFont + Math.round(height * 0.035);

  if (options.showPrice) {
    const priceFont = Math.round(height * 0.14);
    ctx.font = `800 ${priceFont}px "JetBrains Mono", monospace`;
    ctx.fillText(priceText, pad, y);
    if (device.notes) {
      const priceW = ctx.measureText(priceText).width;
      const noteMaxW = innerW - priceW - 18;
      if (noteMaxW > 80) {
        const noteFont = Math.round(height * 0.068);
        ctx.font = `500 ${noteFont}px "DM Sans", Arial, sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText(fitText(ctx, device.notes, noteMaxW), width - pad, y + priceFont * 0.25);
        ctx.textAlign = 'left';
      }
    }
    y += priceFont + Math.round(height * 0.03);
  } else if (device.notes) {
    const noteFont = Math.round(height * 0.075);
    ctx.font = `500 ${noteFont}px "DM Sans", Arial, sans-serif`;
    ctx.fillText(fitText(ctx, device.notes, innerW), pad, y);
    y += noteFont + Math.round(height * 0.04);
  }

  if (options.showBarcode) {
    const codeFont = Math.round(height * 0.068);
    const availableH = height - pad - y - codeFont - 8;
    const barcodeH = Math.max(isMiniBox ? 28 : 36, availableH);
    drawBarcode(ctx, shortCode, pad, y, innerW, barcodeH, true, codeFont);
  }

  return canvas;
}
