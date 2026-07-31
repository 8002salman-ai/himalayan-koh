import { useRef, useState } from 'react';
import { AlertCircle, GripVertical, Image as ImageIcon, Loader2, Pencil, RefreshCw, Trash2, Upload } from 'lucide-react';
import { MAX_PRODUCT_IMAGES } from '../../lib/images/productImageConstants';
import type { AdminProductImage } from './productImageTypes';

interface ImageDropzoneProps {
  images: AdminProductImage[];
  thumbnail: string;
  uploading?: boolean;
  uploadProgress?: { completed: number; total: number };
  validationMessage?: string;
  onUpload: (files: FileList | null) => void;
  onRemove: (id: string) => void;
  onReplace: (id: string, file: File) => void;
  onRetry: (id: string) => void;
  onSetThumbnail: (url: string) => void;
  onReorder: (images: AdminProductImage[]) => void;
  onEdit: (image: AdminProductImage) => void;
}

export default function ImageDropzone({
  images,
  thumbnail,
  uploading,
  uploadProgress,
  validationMessage,
  onUpload,
  onRemove,
  onReplace,
  onRetry,
  onSetThumbnail,
  onReorder,
  onEdit,
}: ImageDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);

  const slotsRemaining = Math.max(0, MAX_PRODUCT_IMAGES - images.length);
  const canAddMore = slotsRemaining > 0 && !uploading;

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    if (!canAddMore) return;
    if (event.dataTransfer.files?.length) {
      onUpload(event.dataTransfer.files);
    }
  };

  const handleReorderDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...images];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    onReorder(next);
    setDragIndex(null);
  };

  const openReplacePicker = (imageId: string) => {
    setReplaceTargetId(imageId);
    replaceInputRef.current?.click();
  };

  const handleReplaceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !replaceTargetId) return;
    onReplace(replaceTargetId, file);
    setReplaceTargetId(null);
  };

  const resolveThumbnailUrl = (image: AdminProductImage) =>
    image.storageUrl || image.previewUrl;

  return (
    <div className="space-y-5">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(e) => {
          onUpload(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleReplaceChange}
        className="hidden"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-charcoal-light">
        <span>{images.length} / {MAX_PRODUCT_IMAGES} images</span>
        {slotsRemaining > 0 ? (
          <span>{slotsRemaining} slot{slotsRemaining === 1 ? '' : 's'} remaining</span>
        ) : (
          <span className="text-amber-700">Maximum reached</span>
        )}
      </div>

      {validationMessage && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <p>{validationMessage}</p>
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (canAddMore) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => canAddMore && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all ${
          canAddMore ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
        } ${
          dragOver ? 'border-himalayan bg-himalayan/10' : 'border-gray-200 hover:border-himalayan/50 hover:bg-himalayan/5'
        }`}
      >
        {uploading ? (
          <div className="space-y-2">
            <Loader2 size={32} className="animate-spin text-himalayan mx-auto" />
            <p className="text-charcoal font-medium">Uploading images...</p>
            {uploadProgress && uploadProgress.total > 0 && (
              <p className="text-sm text-charcoal-light">
                {uploadProgress.completed} of {uploadProgress.total} complete
              </p>
            )}
          </div>
        ) : (
          <>
            <Upload size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-charcoal font-medium">Drag & drop or tap to add images</p>
            <p className="text-sm text-charcoal-light mt-1">
              JPG, PNG, WebP, GIF · up to 5 MB each · max {MAX_PRODUCT_IMAGES} images
            </p>
          </>
        )}
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {images.map((image, index) => {
            const displayUrl = image.previewUrl;
            const persistedUrl = resolveThumbnailUrl(image);
            const isThumbnail = thumbnail === persistedUrl || thumbnail === displayUrl;
            const isBusy = image.status === 'uploading';
            const hasError = image.status === 'error';

            return (
              <div
                key={image.id}
                draggable={!isBusy}
                onDragStart={() => !isBusy && setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleReorderDrop(index);
                }}
                className={`relative group aspect-square rounded-xl overflow-hidden border-2 ${
                  isThumbnail ? 'border-himalayan' : hasError ? 'border-red-300' : 'border-gray-200'
                } ${dragIndex === index ? 'opacity-60' : ''}`}
              >
                <div className="absolute top-2 left-2 z-10 p-1 bg-white/90 rounded-md cursor-grab active:cursor-grabbing">
                  <GripVertical size={14} className="text-charcoal-light" />
                </div>

                <img
                  src={displayUrl}
                  alt={`Product ${index + 1}`}
                  className={`w-full h-full object-cover ${isBusy ? 'opacity-70' : ''}`}
                />

                {isBusy && (
                  <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin text-himalayan" />
                    <span className="text-xs font-medium text-charcoal">Uploading...</span>
                  </div>
                )}

                {hasError && (
                  <div className="absolute inset-x-0 bottom-0 bg-red-600/90 text-white text-[11px] px-2 py-1.5 line-clamp-2">
                    {image.error || 'Upload failed'}
                  </div>
                )}

                {!hasError && !isBusy && image.optimization && (
                  <div className="absolute inset-x-0 bottom-0 bg-black/65 text-white text-[11px] px-2 py-1 truncate sm:group-hover:opacity-0 transition-opacity">
                    {image.optimization}
                  </div>
                )}

                <div className="absolute inset-0 bg-black/45 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 sm:gap-2 p-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(image);
                    }}
                    disabled={isBusy}
                    className="p-2 bg-white text-charcoal rounded-lg hover:bg-gray-100 disabled:opacity-40"
                    title="Edit image"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetThumbnail(persistedUrl);
                    }}
                    disabled={isBusy}
                    className={`p-2 rounded-lg disabled:opacity-40 ${
                      isThumbnail ? 'bg-himalayan text-white' : 'bg-white text-charcoal hover:bg-gray-100'
                    }`}
                    title="Set as thumbnail"
                  >
                    <ImageIcon size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openReplacePicker(image.id);
                    }}
                    disabled={isBusy}
                    className="p-2 bg-white text-charcoal rounded-lg hover:bg-gray-100 disabled:opacity-40"
                    title="Replace image"
                  >
                    <RefreshCw size={16} />
                  </button>
                  {hasError && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRetry(image.id);
                      }}
                      className="p-2 bg-white text-himalayan rounded-lg hover:bg-gray-100"
                      title="Retry upload"
                    >
                      <RefreshCw size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(image.id);
                    }}
                    className="p-2 bg-white text-red-600 rounded-lg hover:bg-red-50"
                    title="Remove image"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {isThumbnail && (
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-himalayan text-white text-xs rounded-full">
                    Thumbnail
                  </span>
                )}

                {image.status === 'local' && !isBusy && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 text-white text-[10px] rounded-full">
                    Preview
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
