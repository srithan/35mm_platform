"use client";

import { useRef, useCallback, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/Icon/Icon";

interface ImageAttachmentsProps {
  images: File[];
  onImagesChange: (files: File[]) => void;
  onDropZoneToggle?: (show: boolean) => void;
  showDropZone: boolean;
}

export function ImageAttachments({
  images,
  onImagesChange,
  showDropZone,
  onDropZoneToggle,
}: ImageAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const addPreviews = useCallback((newFiles: File[]) => {
    const urls = newFiles.map((f) => URL.createObjectURL(f));
    setPreviewUrls((prev) => [...prev, ...urls]);
  }, []);

  const removeImage = useCallback(
    (index: number) => {
      const url = previewUrls[index];
      if (url) URL.revokeObjectURL(url);
      setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
      onImagesChange(images.filter((_, i) => i !== index));
    },
    [images, onImagesChange, previewUrls]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length > 0) {
        onImagesChange([...images, ...files]);
        addPreviews(files);
        onDropZoneToggle?.(false);
      }
    },
    [images, onImagesChange, addPreviews, onDropZoneToggle]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) {
        onImagesChange([...images, ...files]);
        addPreviews(files);
        onDropZoneToggle?.(false);
      }
      e.target.value = "";
    },
    [images, onImagesChange, addPreviews, onDropZoneToggle]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-[2px] rounded-[6px] overflow-hidden">
          {images.map((_, index) => {
            const src = previewUrls[index];
            return (
              <div
                key={src ?? index}
                className="group relative aspect-video bg-sunken overflow-hidden"
              >
                {src && (
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-opacity opacity-0 group-hover:opacity-100"
                  aria-label="Remove image"
                >
                  <Icon name="x" className="w-[8px] h-[8px]" strokeWidth={2.5} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showDropZone && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-[6px] p-6 text-center cursor-pointer transition-all border-border",
            isDragging
              ? "border-fg bg-sunken"
              : "hover:border-fg-faint hover:bg-sunken"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileInput}
          />
          <Icon name="image" className="mx-auto mb-2 text-[#a8a8a8] w-[22px] h-[22px]" strokeWidth={1.5} />
          <p className="text-xs text-fg-muted">
            Drop images or{" "}
            <span className="text-fg font-medium underline underline-offset-2">
              browse
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
