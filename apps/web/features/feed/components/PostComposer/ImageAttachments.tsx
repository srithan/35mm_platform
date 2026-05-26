"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/Icon/Icon";

interface ImageAttachmentsProps {
  images: File[];
  onImagesChange: (files: File[]) => void;
  onDropZoneToggle?: (show: boolean) => void;
  showDropZone: boolean;
}

function fileIdentity(file: File) {
  return file.name + ":" + file.size + ":" + file.lastModified;
}

function gridClassName(count: number) {
  if (count === 1) return "grid-cols-1";
  if (count >= 5) return "grid-cols-4 gap-1";
  return "grid-cols-2 gap-1.5";
}

function cellClassName(count: number, index: number) {
  if (count >= 5) {
    return "aspect-square";
  }
  if (count === 1) {
    return "aspect-[16/10] max-h-[280px]";
  }
  if (count === 3 && index === 0) {
    return "col-span-2 aspect-[2/1]";
  }
  if (count === 3 || count === 4) {
    return "aspect-square";
  }
  return "aspect-[4/3]";
}

export function ImageAttachments({
  images,
  onImagesChange,
  showDropZone,
  onDropZoneToggle,
}: ImageAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlMapRef = useRef<Map<string, string>>(new Map());
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const imageCount = images.length;

  useEffect(
    function () {
      var map = previewUrlMapRef.current;
      var nextUrls: string[] = [];
      var activeKeys = new Set<string>();

      images.forEach(function (file) {
        var key = fileIdentity(file);
        activeKeys.add(key);
        if (!map.has(key)) {
          map.set(key, URL.createObjectURL(file));
        }
        nextUrls.push(map.get(key) as string);
      });

      map.forEach(function (url, key) {
        if (!activeKeys.has(key)) {
          URL.revokeObjectURL(url);
          map.delete(key);
        }
      });

      setPreviewUrls(nextUrls);
    },
    [images]
  );

  useEffect(function () {
    return function () {
      previewUrlMapRef.current.forEach(function (url) {
        URL.revokeObjectURL(url);
      });
      previewUrlMapRef.current.clear();
    };
  }, []);

  const reorderImages = useCallback(
    function (from: number, to: number) {
      if (from === to || from < 0 || to < 0 || from >= images.length || to >= images.length) {
        return;
      }
      var next = images.slice();
      var moved = next.splice(from, 1)[0];
      next.splice(to, 0, moved);
      onImagesChange(next);
    },
    [images, onImagesChange]
  );

  const removeImage = useCallback(
    function (index: number) {
      onImagesChange(
        images.filter(function (_, i) {
          return i !== index;
        })
      );
    },
    [images, onImagesChange]
  );

  const handleDrop = useCallback(
    function (e: React.DragEvent) {
      e.preventDefault();
      setIsDragging(false);
      var files = Array.from(e.dataTransfer.files).filter(function (f) {
        return f.type.startsWith("image/");
      });
      if (files.length > 0) {
        onImagesChange([...images, ...files].slice(0, 9));
        onDropZoneToggle?.(false);
      }
    },
    [images, onImagesChange, onDropZoneToggle]
  );

  const handleFileInput = useCallback(
    function (e: React.ChangeEvent<HTMLInputElement>) {
      var files = Array.from(e.target.files ?? []);
      if (files.length > 0) {
        onImagesChange([...images, ...files].slice(0, 9));
        onDropZoneToggle?.(false);
      }
      e.target.value = "";
    },
    [images, onImagesChange, onDropZoneToggle]
  );

  const handleDragOver = useCallback(function (e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(function (e: React.DragEvent) {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  return (
    <div className={cn(showDropZone && images.length > 0 && "space-y-2")}>
      {images.length > 0 && (
        <div
          className={cn("grid overflow-hidden rounded-lg", gridClassName(imageCount))}
          role="list"
          aria-label="Attached images"
        >
          {images.map(function (file, index) {
            var src = previewUrls[index];
            var isDropTarget = dropIndex === index && dragIndex !== null && dragIndex !== index;
            return (
              <div
                key={fileIdentity(file) + ":" + index}
                role="listitem"
                draggable={images.length > 1}
                onDragStart={function () {
                  setDragIndex(index);
                }}
                onDragEnd={function () {
                  setDragIndex(null);
                  setDropIndex(null);
                }}
                onDragOver={function (e) {
                  e.preventDefault();
                  if (dragIndex !== null && dragIndex !== index) {
                    setDropIndex(index);
                  }
                }}
                onDragLeave={function () {
                  setDropIndex(null);
                }}
                onDrop={function (e) {
                  e.preventDefault();
                  if (dragIndex !== null) {
                    reorderImages(dragIndex, index);
                  }
                  setDragIndex(null);
                  setDropIndex(null);
                }}
                className={cn(
                  "group relative overflow-hidden rounded bg-sunken",
                  cellClassName(imageCount, index),
                  images.length > 1 && "cursor-grab active:cursor-grabbing",
                  isDropTarget && "ring-2 ring-accent ring-inset",
                  dragIndex === index && "opacity-60"
                )}
              >
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt=""
                    draggable={false}
                    className="block h-full w-full object-cover"
                  />
                ) : null}

                <button
                  type="button"
                  onClick={function () {
                    removeImage(index);
                  }}
                  className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white shadow-sm transition-colors hover:bg-black/80"
                  aria-label={"Remove image " + String(index + 1)}
                >
                  <Icon name="x" className="h-[11px] w-[11px]" strokeWidth={2.5} />
                </button>

                {images.length > 1 ? (
                  <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-1 bg-black/50 py-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={function () {
                        reorderImages(index, index - 1);
                      }}
                      className="flex h-5 w-5 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15 disabled:pointer-events-none disabled:opacity-30"
                      aria-label={"Move image " + String(index + 1) + " earlier"}
                    >
                      <Icon name="chevrons-left" className="h-3 w-3" strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      disabled={index === images.length - 1}
                      onClick={function () {
                        reorderImages(index, index + 1);
                      }}
                      className="flex h-5 w-5 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15 disabled:pointer-events-none disabled:opacity-30"
                      aria-label={"Move image " + String(index + 1) + " later"}
                    >
                      <Icon name="chevrons-right" className="h-3 w-3" strokeWidth={2.5} />
                    </button>
                  </div>
                ) : null}
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
          onClick={function () {
            fileInputRef.current?.click();
          }}
          className={cn(
            "cursor-pointer rounded-[6px] border-2 border-dashed p-6 text-center transition-all border-border",
            isDragging ? "border-fg bg-sunken" : "hover:border-fg-faint hover:bg-sunken"
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
          <Icon name="image" className="mx-auto mb-2 h-[22px] w-[22px] text-[#a8a8a8]" strokeWidth={1.5} />
          <p className="text-xs text-fg-muted">
            Drop images or{" "}
            <span className="font-medium text-fg underline underline-offset-2">browse</span>
          </p>
        </div>
      )}
    </div>
  );
}
