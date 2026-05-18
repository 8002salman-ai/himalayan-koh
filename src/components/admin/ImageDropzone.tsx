import { useRef, useState } from 'react';
import { GripVertical, Image as ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';

interface ImageDropzoneProps {
  images: string[];
  thumbnail: string;
  uploading?: boolean;
  onUpload: (files: FileList | null) => void;
  onRemove: (index: number) => void;
  onSetThumbnail: (url: string) => void;
  onReorder: (images: string[]) => void;
}

export default function ImageDropzone({
  images,
  thumbnail,
  uploading,
  onUpload,
  onRemove,
  onSetThumbnail,
  onReorder,
}: ImageDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const safeImages = Array.isArray(images) ? images.filter(Boolean) : [];

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files?.length) {
      onUpload(event.dataTransfer.files);
    }
  };

  const handleReorderDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...safeImages];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    onReorder(next);
    setDragIndex(null);
  };

  return (
    <div className="space-y-5">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => onUpload(e.target.files)}
        className="hidden"
      />

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          dragOver ? 'border-himalayan bg-himalayan/10' : 'border-gray-200 hover:border-himalayan/50 hover:bg-himalayan/5'
        }`}
      >
        {uploading ? (
          <Loader2 size={32} className="animate-spin text-himalayan mx-auto mb-2" />
        ) : (
          <Upload size={32} className="text-gray-300 mx-auto mb-2" />
        )}
        <p className="text-charcoal font-medium">Drag & drop images here</p>
        <p className="text-sm text-charcoal-light mt-1">or click to browse · PNG, JPG, WebP</p>
      </div>

      {safeImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {safeImages.map((image, index) => (
            <div
              key={`${image}-${index}`}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleReorderDrop(index); }}
              className={`relative group aspect-square rounded-xl overflow-hidden border-2 ${
                thumbnail === image ? 'border-himalayan' : 'border-gray-200'
              } ${dragIndex === index ? 'opacity-60' : ''}`}
            >
              <div className="absolute top-2 left-2 z-10 p-1 bg-white/90 rounded-md cursor-grab active:cursor-grabbing">
                <GripVertical size={14} className="text-charcoal-light" />
              </div>
              <img src={image} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onSetThumbnail(image); }}
                  className={`p-2 rounded-lg ${
                    thumbnail === image ? 'bg-himalayan text-white' : 'bg-white text-charcoal hover:bg-gray-100'
                  }`}
                  title="Set as thumbnail"
                >
                  <ImageIcon size={16} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRemove(index); }}
                  className="p-2 bg-white text-red-600 rounded-lg hover:bg-red-50"
                  title="Remove image"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {thumbnail === image && (
                <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-himalayan text-white text-xs rounded-full">
                  Thumbnail
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
