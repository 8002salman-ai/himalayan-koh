import { useEffect, useRef, useState } from 'react';
import { Check, FlipHorizontal, Loader2, Minus, Plus, RotateCcw, RotateCw, Wand2, X, ZoomIn, ZoomOut } from 'lucide-react';
import type { AdminProductImage } from './productImageTypes';

interface Props {
  image: AdminProductImage | null;
  onClose: () => void;
  onApply: (file: File) => Promise<void> | void;
}

type Adjustments = {
  zoom: number;
  rotation: number;
  flipX: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  cleanBackground: boolean;
};

const defaults: Adjustments = {
  zoom: 1,
  rotation: 0,
  flipX: false,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  cleanBackground: false,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Removes edge-connected pixels resembling any corner colour. It is intentionally
 * conservative and works best for simple studio or outdoor backgrounds. */
function cleanSimpleBackground(context: CanvasRenderingContext2D, width: number, height: number) {
  const image = context.getImageData(0, 0, width, height);
  const { data } = image;
  const read = (index: number) => [data[index], data[index + 1], data[index + 2]] as const;
  const corners = [
    read(0), read((width - 1) * 4), read((height - 1) * width * 4), read(((height * width) - 1) * 4),
  ];
  const seen = new Uint8Array(width * height);
  const queue: number[] = [];

  for (let x = 0; x < width; x += 1) queue.push(x, (height - 1) * width + x);
  for (let y = 1; y < height - 1; y += 1) queue.push(y * width, y * width + width - 1);

  const similarToCorner = (pixel: number) => {
    const offset = pixel * 4;
    return corners.some(([red, green, blue]) =>
      Math.abs(data[offset] - red) + Math.abs(data[offset + 1] - green) + Math.abs(data[offset + 2] - blue) < 100
    );
  };

  while (queue.length) {
    const pixel = queue.pop() as number;
    if (seen[pixel] || !similarToCorner(pixel)) continue;
    seen[pixel] = 1;
    data[pixel * 4 + 3] = 0;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x > 0) queue.push(pixel - 1);
    if (x < width - 1) queue.push(pixel + 1);
    if (y > 0) queue.push(pixel - width);
    if (y < height - 1) queue.push(pixel + width);
  }

  context.putImageData(image, 0, 0);
}

export default function ProductImageEditor({ image, onClose, onApply }: Props) {
  const [adjustments, setAdjustments] = useState(defaults);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const sourceRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (image) {
      setAdjustments(defaults);
      setError('');
    }
  }, [image]);

  if (!image) return null;

  const update = (key: keyof Adjustments, value: number | boolean) =>
    setAdjustments((current) => ({ ...current, [key]: value }));

  const apply = async () => {
    const source = sourceRef.current;
    if (!source?.naturalWidth || !source.naturalHeight) {
      setError('Image is still loading. Please try again in a moment.');
      return;
    }

    setApplying(true);
    setError('');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = source.naturalWidth;
      canvas.height = source.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Your browser could not prepare the image editor.');

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.save();
      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate((adjustments.rotation * Math.PI) / 180);
      context.scale(adjustments.flipX ? -adjustments.zoom : adjustments.zoom, adjustments.zoom);
      context.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`;
      context.drawImage(source, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
      context.restore();

      if (adjustments.cleanBackground) cleanSimpleBackground(context, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.92));
      if (!blob) throw new Error('Could not export the edited image.');
      const baseName = image.file?.name || image.previewUrl.split('/').pop()?.split('?')[0] || 'product-image';
      const file = new File([blob], `${baseName.replace(/\.[^.]+$/, '')}-edited.webp`, { type: 'image/webp' });
      await onApply(file);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not apply image edits.');
    } finally {
      setApplying(false);
    }
  };

  const filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between border-b border-gray-100 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-himalayan">Product image editor</p>
            <h2 className="mt-1 text-xl font-bold text-charcoal">Crop, enhance and prepare your image</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100" aria-label="Close image editor"><X size={20} /></button>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_320px]">
          <div className="flex min-h-[320px] items-center justify-center overflow-hidden bg-slate-100 p-5">
            <div className="relative flex h-full w-full max-h-[56vh] min-h-[280px] items-center justify-center overflow-hidden rounded-xl bg-white shadow-inner">
              <img
                ref={sourceRef}
                src={image.previewUrl}
                crossOrigin="anonymous"
                alt="Editing preview"
                className="max-h-full max-w-full object-contain transition-transform duration-150"
                style={{ filter, transform: `rotate(${adjustments.rotation}deg) scale(${adjustments.flipX ? -adjustments.zoom : adjustments.zoom}, ${adjustments.zoom})` }}
              />
            </div>
          </div>

          <aside className="overflow-y-auto border-t border-gray-100 p-5 lg:border-l lg:border-t-0">
            <div className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm font-semibold text-charcoal"><span>Zoom / crop</span><span>{Math.round(adjustments.zoom * 100)}%</span></div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => update('zoom', clamp(adjustments.zoom - 0.1, 0.5, 3))} className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50"><ZoomOut size={16} /></button>
                  <input aria-label="Zoom" className="flex-1 accent-himalayan" type="range" min="0.5" max="3" step="0.05" value={adjustments.zoom} onChange={(event) => update('zoom', Number(event.target.value))} />
                  <button type="button" onClick={() => update('zoom', clamp(adjustments.zoom + 0.1, 0.5, 3))} className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50"><ZoomIn size={16} /></button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => update('rotation', adjustments.rotation - 90)} className="flex flex-col items-center gap-1 rounded-xl border border-gray-200 p-2 text-xs font-medium hover:bg-gray-50"><RotateCcw size={17} /> Rotate left</button>
                <button type="button" onClick={() => update('rotation', adjustments.rotation + 90)} className="flex flex-col items-center gap-1 rounded-xl border border-gray-200 p-2 text-xs font-medium hover:bg-gray-50"><RotateCw size={17} /> Rotate right</button>
                <button type="button" onClick={() => update('flipX', !adjustments.flipX)} className="flex flex-col items-center gap-1 rounded-xl border border-gray-200 p-2 text-xs font-medium hover:bg-gray-50"><FlipHorizontal size={17} /> Flip</button>
              </div>

              {([
                ['brightness', 'Brightness'],
                ['contrast', 'Contrast'],
                ['saturation', 'Colour'],
              ] as const).map(([key, label]) => (
                <label key={key} className="block text-sm font-medium text-charcoal">
                  <span className="flex justify-between"><span>{label}</span><span className="text-charcoal-light">{adjustments[key]}%</span></span>
                  <input className="mt-2 w-full accent-himalayan" type="range" min="50" max="150" value={adjustments[key]} onChange={(event) => update(key, Number(event.target.value))} />
                </label>
              ))}

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-himalayan/20 bg-himalayan/5 p-3 text-sm text-charcoal">
                <input type="checkbox" checked={adjustments.cleanBackground} onChange={(event) => update('cleanBackground', event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-himalayan focus:ring-himalayan" />
                <span><span className="flex items-center gap-1 font-semibold text-himalayan"><Wand2 size={15} /> Free background cleanup</span><span className="mt-1 block text-xs text-charcoal-light">Removes a simple edge background and exports on white. Best for clear product photos; review the preview before applying.</span></span>
              </label>

              <button type="button" onClick={() => setAdjustments(defaults)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-charcoal hover:bg-gray-50">Reset adjustments</button>
              {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <button type="button" onClick={apply} disabled={applying} className="flex w-full items-center justify-center gap-2 rounded-xl bg-himalayan px-4 py-3 font-semibold text-white hover:bg-himalayan-dark disabled:opacity-60">
                {applying ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} {applying ? 'Applying edits…' : 'Apply & replace image'}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
