"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Point, Area } from "react-easy-crop";
import { Button } from "@/components/Button";
import { ZoomIn, ZoomOut, RotateCw } from "lucide-react";

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedAreaPixels: Area) => void;
  onCancel: () => void;
  onSave: () => void;
  aspect?: number;
  cropShape?: "rect" | "round";
}

export function ImageCropper({
  image,
  onCropComplete,
  onCancel,
  onSave,
  aspect = 1,
  cropShape = "round",
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const onCropChange = (crop: Point) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteHandler = useCallback(
    (_: Area, croppedAreaPixels: Area) => {
      onCropComplete(croppedAreaPixels);
    },
    [onCropComplete]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="relative w-full h-[400px] bg-black/20 rounded-xl overflow-hidden border border-border">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect}
          cropShape={cropShape}
          showGrid={cropShape === "rect"}
          onCropChange={onCropChange}
          onCropComplete={onCropCompleteHandler}
          onZoomChange={onZoomChange}
        />
      </div>

      <div className="flex flex-col gap-4">
        {/* Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <ZoomOut className="w-4 h-4 text-fg-muted" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-1 bg-border rounded-lg appearance-none cursor-pointer accent-fg"
            />
            <ZoomIn className="w-4 h-4 text-fg-muted" />
          </div>
          
          <button
            onClick={() => setRotation((prev) => (prev + 90) % 360)}
            className="p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-hover transition-colors"
            title="Rotate"
          >
            <RotateCw className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-3 mt-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={onSave}
          >
            Save Photo
          </Button>
        </div>
      </div>
    </div>
  );
}
