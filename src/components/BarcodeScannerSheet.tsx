import React, { useEffect, useRef, useState } from 'react';
import { Camera, Keyboard, ScanLine, X } from 'lucide-react';
import { formatImei } from '../utils/formatters';
import { SCHEMA_LIMITS } from '../types';

interface BarcodeScannerSheetProps {
  open: boolean;
  title?: string;
  onDetected: (code: string) => void;
  onClose: () => void;
}

interface DetectedBarcode {
  rawValue?: string;
}

interface BarcodeDetectorLike {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
}

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

export function BarcodeScannerSheet({
  open,
  title = 'Escanear IMEI / Serial',
  onDetected,
  onClose,
}: BarcodeScannerSheetProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannerSupported, setScannerSupported] = useState<boolean>(true);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    if (!open) return;
    setCameraError(null);
    setManualCode('');

    const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!ctor || !navigator.mediaDevices?.getUserMedia) {
      setScannerSupported(false);
      return;
    }
    setScannerSupported(true);

    let cancelled = false;
    let rafId = 0;
    let detector: BarcodeDetectorLike | null = null;
    try {
      detector = new ctor({
        formats: ['code_128', 'ean_13', 'ean_8', 'code_39', 'itf', 'qr_code'],
      });
    } catch {
      detector = new ctor();
    }

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }

        let lastScan = 0;
        const loop = async (ts: number) => {
          if (cancelled) return;
          if (
            detector &&
            videoRef.current &&
            videoRef.current.readyState >= 2 &&
            ts - lastScan >= 180
          ) {
            lastScan = ts;
            try {
              const results = await detector.detect(videoRef.current);
              const hit = results.find((r) => r.rawValue && r.rawValue.trim().length >= 4);
              if (hit?.rawValue) {
                const cleaned = formatImei(hit.rawValue);
                if (cleaned.length >= 4) {
                  onDetected(cleaned);
                  onClose();
                  return;
                }
              }
            } catch {
              // Ignore transient frame read failures
            }
          }
          rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
      } catch {
        if (!cancelled) {
          setCameraError(
            'Não foi possível acessar a câmera. Verifique as permissões do navegador ou digite o IMEI abaixo.'
          );
        }
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [open, onDetected, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = formatImei(manualCode);
    if (!cleaned) return;
    onDetected(cleaned);
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scanner-sheet-title"
    >
      <div className="w-full sm:max-w-md bg-[#121216] border-t sm:border border-[#26262E] rounded-t-3xl sm:rounded-2xl max-h-[90dvh] flex flex-col overflow-hidden">
        <div className="sm:hidden w-10 h-1.5 bg-zinc-700 rounded-full mx-auto mt-3 shrink-0" />

        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[#26262E] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <ScanLine className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <h2 id="scanner-sheet-title" className="font-display text-base sm:text-lg font-bold text-white truncate">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar leitor"
            className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center text-zinc-400 hover:text-white rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {scannerSupported && !cameraError ? (
            <div className="relative rounded-2xl overflow-hidden bg-black border border-[#26262E] aspect-[4/3]">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-[260px] h-24 rounded-xl border-2 border-[#D4AF37]/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] flex items-center justify-center">
                  <div className="w-full h-0.5 bg-[#D4AF37]/80" />
                </div>
                <span className="mt-3 text-xs font-medium text-white bg-black/75 px-3 py-1 rounded-lg">
                  Aponte para o código de barras da caixa ou *#06#
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#09090B] border border-[#26262E] p-4 space-y-1.5 text-center">
              <Camera className="w-6 h-6 text-[#D4AF37] mx-auto" />
              <p className="text-sm font-medium text-white">
                {cameraError
                  ? 'Câmera indisponível'
                  : 'Leitor nativo indisponível neste navegador'}
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {cameraError ||
                  'Use o campo abaixo para digitar ou colar o IMEI / Serial manualmente.'}
              </p>
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="space-y-2.5">
            <label
              htmlFor="manual-imei-input"
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-400"
            >
              <Keyboard className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Digitar ou colar IMEI / Serial</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                id="manual-imei-input"
                type="text"
                maxLength={SCHEMA_LIMITS.IMEI_MAX}
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ex: 356985114829012"
                className="flex-1 min-w-0 min-h-[46px] px-3.5 rounded-xl bg-[#09090B] border border-[#26262E] text-white font-mono-tabular uppercase placeholder:text-zinc-600 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="min-h-[46px] px-4 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] disabled:opacity-45 text-black font-semibold text-sm whitespace-nowrap transition-colors"
              >
                Usar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
