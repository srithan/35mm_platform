"use client";

import { useState, useRef, ChangeEvent, MouseEvent } from "react";
import { useAuth } from "@clerk/nextjs";
import { Dialog } from "@/components/Dialog/Dialog";
import { ImageCropper } from "./ImageCropper";
import getCroppedImg, {
  canDecodeImage,
  convertHeicToJpeg,
  normalizeImageContentType,
} from "@/lib/utils/imageUtils";
import { Area } from "react-easy-crop";
import { Camera, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useQueryClient } from "@tanstack/react-query";
import { presignProfileMediaUpload, uploadToPresignedUrl } from "../api/mediaApi";
import { updateCurrentProfile } from "../api/profileApi";
import { authKeys } from "@/features/auth/hooks/queryKeys";
import { profileKeys } from "../hooks/queryKeys";

interface ProfilePictureUploadProps {
  children: React.ReactNode;
  onUploadComplete?: (imageUrl: string | null) => void;
  className?: string;
}

export function ProfilePictureUpload({
  children,
  onUploadComplete,
  className,
}: ProfilePictureUploadProps) {
  const queryClient = useQueryClient();
  const [image, setImage] = useState<string | null>(null);
  const [selectedImageType, setSelectedImageType] = useState<string>("image/jpeg");
  const [isCropping, setIsCropping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { getToken } = useAuth();

  const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > MAX_IMAGE_BYTES) {
        setErrorMessage("Profile photo must be 12MB or less.");
        return;
      }
      const normalizedContentType = normalizeImageContentType(file.type, file.name);
      if (!normalizedContentType) {
        setErrorMessage("Please choose an image file.");
        return;
      }
      setSelectedImageType(normalizedContentType);
      setErrorMessage(null);

      const isHeicUpload =
        normalizedContentType === "image/heic" || normalizedContentType === "image/heif";

      try {
        var fileForCrop: File | Blob = file;
        if (isHeicUpload) {
          fileForCrop = await convertHeicToJpeg(file);
          setSelectedImageType("image/jpeg");
        }
        var imageDataUrl = await canDecodeImage(fileForCrop);
        setImage(imageDataUrl);
        setIsCropping(true);
      } catch (_error) {
        if (isHeicUpload) {
          setErrorMessage(
            "Could not convert HEIC image for crop. Try an older format like JPG or PNG."
          );
          return;
        }
        setErrorMessage("Could not decode image for cropping.");
      }
    }
  };

  const handleUpload = async () => {
    if (!image || !croppedAreaPixels) return;

    try {
      setIsUploading(true);
      setIsCropping(false);
      setUploadProgress(10);
      setErrorMessage(null);

      // 1. Process crop
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      if (!croppedImage) throw new Error("Could not crop image");

      if (croppedImage.size <= 0) {
        throw new Error("Cropped image is empty.");
      }

      if (croppedImage.size > MAX_IMAGE_BYTES) {
        throw new Error("Profile photo must be 12MB or less after processing.");
      }

      setUploadProgress(33);

      const token = await getToken();
      const presign = await presignProfileMediaUpload(
        {
          kind: "avatar",
          contentType: croppedImage.type || selectedImageType,
          contentLength: croppedImage.size,
        },
        token
      );

      setUploadProgress(65);

      await uploadToPresignedUrl({
        uploadUrl: presign.uploadUrl,
        contentType: presign.contentType,
        blob: croppedImage,
      });
      const profile = await updateCurrentProfile(
        {
          avatarUrl: presign.publicUrl,
        },
        token
      );

      setUploadProgress(95);

      onUploadComplete?.(profile.avatarUrl);
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
      setIsUploading(false);
      setImage(null);
      setCroppedAreaPixels(null);
      setErrorMessage(null);
      setUploadProgress(0);
    } catch (error) {
      setUploadProgress(0);
      console.error("Upload failed:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Could not upload profile photo."
      );
      setIsUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleTriggerMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const closeCropper = () => {
    setIsCropping(false);
    setImage(null);
    setCroppedAreaPixels(null);
    setErrorMessage(null);
  };

  return (
    <div className={cn("relative group", className)}>
      <button
        type="button"
        onMouseDown={handleTriggerMouseDown}
        onClick={handleClick}
        aria-label="Change profile photo"
        className="profile-photo-trigger relative inline-flex shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0 outline-none [-webkit-tap-highlight-color:transparent] focus:outline-none focus-visible:outline-none"
      >
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

        {!isUploading && errorMessage ? (
          <div className="absolute inset-0 bg-black/55 rounded-full flex items-center justify-center z-10 backdrop-blur-[2px]">
            <div className="max-w-[92%] text-center px-3">
              <AlertCircle className="w-4 h-4 text-white mx-auto mb-1" />
              <div className="text-[10px] text-white leading-relaxed">{errorMessage}</div>
            </div>
          </div>
        ) : null}
      </button>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <Dialog
        open={isCropping}
        onClose={closeCropper}
        title="Crop Profile Photo"
        description="Drag to reposition and use the slider to zoom."
      >
        {image && (
          <ImageCropper
            image={image}
            onCropComplete={setCroppedAreaPixels}
            onCancel={closeCropper}
            onSave={handleUpload}
            aspect={1}
          />
        )}
      </Dialog>
    </div>
  );
}
