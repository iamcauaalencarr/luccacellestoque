import React, { useEffect, useRef, useState } from 'react';
import { Smartphone } from 'lucide-react';
import { resolveAppleDeviceImage } from '../utils/appleImages';

type ThumbnailSize = 'xs' | 'sm' | 'md' | 'lg';

interface DeviceThumbnailProps {
  model: string;
  color?: string;
  size?: ThumbnailSize;
  className?: string;
}

const SIZE_CLASSES: Record<ThumbnailSize, string> = {
  xs: 'w-10 h-12 rounded-lg p-1',
  sm: 'w-12 h-14 rounded-xl p-1',
  md: 'w-14 h-[68px] rounded-xl p-1.5',
  lg: 'w-16 h-20 rounded-2xl p-1.5',
};

const ICON_SIZE_CLASSES: Record<ThumbnailSize, string> = {
  xs: 'w-4 h-4',
  sm: 'w-5 h-5',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export function DeviceThumbnail({
  model,
  color,
  size = 'md',
  className = '',
}: DeviceThumbnailProps) {
  const resolved = resolveAppleDeviceImage(model, color);
  const [srcStage, setSrcStage] = useState<'primary' | 'fallback' | 'error'>('primary');
  const imgRef = useRef<HTMLImageElement | null>(null);

  const primaryUrl = resolved?.primaryUrl || '';
  const fallbackUrl = resolved?.fallbackUrl || '';

  useEffect(() => {
    setSrcStage('primary');
  }, [primaryUrl]);

  const activeUrl =
    srcStage === 'primary' ? primaryUrl : srcStage === 'fallback' ? fallbackUrl : '';

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0 && activeUrl) {
      if (srcStage === 'primary' && fallbackUrl) {
        setSrcStage('fallback');
      } else {
        setSrcStage('error');
      }
    }
  }, [activeUrl, srcStage, fallbackUrl]);

  if (!resolved || !activeUrl || srcStage === 'error') {
    return (
      <div
        className={`${SIZE_CLASSES[size]} bg-[#1A1A20] border border-[#26262E] text-[#D4AF37] flex items-center justify-center shrink-0 ${className}`}
        aria-hidden="true"
      >
        <Smartphone className={ICON_SIZE_CLASSES[size]} />
      </div>
    );
  }

  return (
    <div
      className={`${SIZE_CLASSES[size]} relative bg-white ring-1 ring-white/15 flex items-center justify-center overflow-hidden shrink-0 ${className}`}
    >
      <img
        ref={imgRef}
        key={activeUrl}
        src={activeUrl}
        alt={`${model}${color ? ` na cor ${color}` : ''}`}
        decoding="async"
        onError={() => {
          if (srcStage === 'primary' && fallbackUrl) {
            setSrcStage('fallback');
          } else {
            setSrcStage('error');
          }
        }}
        className="w-full h-full object-contain select-none"
      />
    </div>
  );
}
