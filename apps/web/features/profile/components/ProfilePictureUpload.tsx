"use client";

import { useState, useRef, ChangeEvent } from "react";
import { Dialog } from "@/components/Dialog/Dialog";
import { ImageCropper } from "./ImageCropper";
import getCroppedImg from "@/lib/utils/imageUtils";
import { Area } from "react-easy-crop";
import { Loader2, Camera } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ProfilePictureUploadProps {
  children: React.ReactNode;
  onUploadComplete?: (imageUrl: string) => void;
  className?: string;
}

export function ProfilePictureUpload({
  children,
  onUploadComplete,
  className,
}: ProfilePictureUploadProps) {
  const [image, setImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImage(reader.result as string);
        setIsCropping(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!image || !croppedAreaPixels) return;

    try {
      setIsUploading(true);
      setIsCropping(false);
      setUploadProgress(10);

      // 1. Process crop
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      if (!croppedImage) throw new Error("Could not crop image");
      
      setUploadProgress(40);

      // 2. Simulate Upload Progress
      const simulateUpload = async () => {
        for (let i = 40; i <= 90; i += 10) {
          setUploadProgress(i);
          await new Promise((r) => setTimeout(r, 200));
        }
      };

      await simulateUpload();

      // 3. Finalize
      const imageUrl = URL.createObjectURL(croppedImage);
      setUploadProgress(100);
      
      await new Promise((r) => setTimeout(r, 400)); // Show 100% briefly
      
      onUploadComplete?.(imageUrl);
      setIsUploading(false);
      setImage(null);
      setUploadProgress(0);
    } catch (error) {
      console.error("Upload failed:", error);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn("relative group", className)}>
      <div onClick={handleClick} className="cursor-pointer relative">
        {children}
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Camera className="w-6 h-6 text-white" strokeWidth={1.5} />
        </div>

        {/* Uploading State Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center z-10 backdrop-blur-[2px]">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-white/20"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={125.6}
                  strokeDashoffset={125.6 - (125.6 * uploadProgress) / 100}
                  className="text-white transition-all duration-300"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </div>
            </div>
            <span className="text-[10px] text-white mt-1 font-bold">
              {uploadProgress}%
            </span>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <Dialog
        open={isCropping}
        onClose={() => setIsCropping(false)}
        title="Crop Profile Photo"
        description="Drag to reposition and use the slider to zoom."
      >
        {image && (
          <ImageCropper
            image={image}
            onCropComplete={setCroppedAreaPixels}
            onCancel={() => setIsCropping(false)}
            onSave={handleUpload}
          />
        )}
      </Dialog>
    </div>
  );
}
