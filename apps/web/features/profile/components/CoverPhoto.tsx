"use client";

import { ChangeEvent, MouseEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { Camera, Crop, Loader2, AlertCircle } from "lucide-react";
import { ImageViewer } from "@/components/ImageViewer/ImageViewer";
import { Dialog } from "@/components/Dialog/Dialog";
import { Button } from "@/components/Button";
import { ImageCropper } from "./ImageCropper";
import { resolvePublicMediaUrl } from "@/lib/utils/r2Media";
import { cn } from "@/lib/utils/cn";
import { Area } from "react-easy-crop";
import getCroppedImg, {
  canDecodeImage,
  convertHeicToJpeg,
  normalizeImageContentType,
} from "@/lib/utils/imageUtils";
import { useQueryClient } from "@tanstack/react-query";
import { presignProfileMediaUpload, uploadToPresignedUrl } from "../api/mediaApi";
import { updateCurrentProfile } from "../api/profileApi";
import { authKeys } from "@/features/auth/hooks/queryKeys";
import { profileKeys } from "../hooks/queryKeys";
import { DEFAULT_PROFILE_COVER_URL } from "@/lib/constants/profileMedia";

const COVER_ASPECT_RATIO = 16 / 6;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

interface CoverPhotoProps {
  isOwnProfile?: boolean;
  coverUrl?: string | null;
  onUploadComplete?: (coverUrl: string | null) => void;
}

export function CoverPhoto(props: CoverPhotoProps) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  var isOwnProfile = props.isOwnProfile === true;
  var [viewerOpen, setViewerOpen] = useState(false);
  var [localCoverUrl, setLocalCoverUrl] = useState<string | null>(null);
  var [image, setImage] = useState<string | null>(null);
  var [isCropping, setIsCropping] = useState(false);
  var [selectedImageType, setSelectedImageType] = useState("image/jpeg");
  var [isPreparingReposition, setIsPreparingReposition] = useState(false);
  var [isUploading, setIsUploading] = useState(false);
  var [uploadProgress, setUploadProgress] = useState(0);
  var [errorMessage, setErrorMessage] = useState<string | null>(null);
  var [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  var fileInputRef = useRef<HTMLInputElement>(null);
  var canViewCover = isOwnProfile === false && Boolean(localCoverUrl);

  useEffect(function () {
    var isCancelled = false;
    if (!props.coverUrl) {
      setLocalCoverUrl(null);
      return;
    }

    resolvePublicMediaUrl(props.coverUrl).then(function (nextCoverUrl) {
      if (!isCancelled) setLocalCoverUrl(nextCoverUrl);
    });

    return function () {
      isCancelled = true;
    };
  }, [props.coverUrl]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    var file = event.target.files[0];
    var normalizedContentType = normalizeImageContentType(file.type, file.name);
    if (!normalizedContentType) {
      setErrorMessage("Please choose an image file.");
      return;
    }
    setSelectedImageType(normalizedContentType);
    if (file.size > MAX_IMAGE_BYTES) {
      setErrorMessage("Cover photo must be 12MB or less.");
      return;
    }

    setErrorMessage(null);
    var isHeicUpload =
      normalizedContentType === "image/heic" || normalizedContentType === "image/heif";
    if (isHeicUpload) {
      setSelectedImageType("image/jpeg");
    } else {
      setSelectedImageType(normalizedContentType);
    }

    void (async function () {
      try {
        var fileForCrop: File | Blob = file;
        if (isHeicUpload) {
          fileForCrop = await convertHeicToJpeg(file);
        }
        var imageDataUrl = await canDecodeImage(fileForCrop);
        setImage(imageDataUrl);
        setIsCropping(true);
      } catch (_error) {
        if (isHeicUpload) {
          setErrorMessage("Could not convert HEIC image for crop. Try an older format like JPG or PNG.");
          return;
        }
        setErrorMessage("Could not decode image for cropping.");
      }
    })();
  };

  const closeCropper = function () {
    setIsCropping(false);
    setImage(null);
    setCroppedAreaPixels(null);
    setErrorMessage(null);
    blurActiveElement();
  };

  function blurActiveElement() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  const handleUpload = async () => {
    if (!image) return;
    if (!croppedAreaPixels) {
      setErrorMessage("Cover preview is still loading. Please try again.");
      return;
    }
    setIsUploading(true);
    setUploadProgress(10);
    setErrorMessage(null);

    try {
      var croppedImage = await getCroppedImg(image, croppedAreaPixels);
      if (!croppedImage) throw new Error("Could not crop image.");
      if (croppedImage.size <= 0) throw new Error("Cropped image is empty.");
      if (croppedImage.size > MAX_IMAGE_BYTES) throw new Error("Cover photo must be 12MB or less.");

      setUploadProgress(35);

      var token = await getToken();
      var presign = await presignProfileMediaUpload(
        {
          kind: "cover",
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
          coverUrl: presign.publicUrl,
        },
        token
      );

      setLocalCoverUrl(profile.coverUrl);
      props.onUploadComplete?.(profile.coverUrl);
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
      setUploadProgress(100);
      setIsCropping(false);
      setImage(null);
      setErrorMessage(null);
      blurActiveElement();
      setTimeout(function () {
        setUploadProgress(0);
      }, 350);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not upload cover photo.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  function handleCoverTrigger(event: MouseEvent<HTMLButtonElement>) {
    fileInputRef.current?.click();
    event.currentTarget.blur();
  }

  async function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }
        reject(new Error("Could not read image data."));
      };
      reader.onerror = function () {
        reject(new Error("Could not read image data."));
      };
      reader.readAsDataURL(blob);
    });
  }

  async function prepareImageForReposition(sourceUrl: string): Promise<string> {
    var response = await fetch(sourceUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Could not load cover photo for repositioning.");
    }
    var blob = await response.blob();
    return blobToDataUrl(blob);
  }

  function handleRepositionTrigger(event: MouseEvent<HTMLButtonElement>) {
    event.currentTarget.blur();
    if (!localCoverUrl) return;
    if (isPreparingReposition || isUploading) return;

    setIsPreparingReposition(true);
    setErrorMessage(null);
    setCroppedAreaPixels(null);
    void (async function () {
      try {
        var preparedImage = await prepareImageForReposition(localCoverUrl);
        setImage(preparedImage);
        setIsCropping(true);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not open reposition tool right now."
        );
      } finally {
        setIsPreparingReposition(false);
      }
    })();
  }

    return (
    <>
      <div
        className={cn(
          "relative w-full overflow-hidden bg-sunken-2",
          "max-md:rounded-none max-md:border-0",
          "md:rounded-t-xl md:rounded-b-none md:border md:border-border",
          "shadow-[0_1px_2px_rgb(15_23_42/6%)]",
          "min-h-[176px] h-[clamp(11rem,32vw,20.75rem)]",
          isOwnProfile ? "group/cover" : "cursor-pointer"
        )}
        role={isOwnProfile ? undefined : "button"}
        tabIndex={isOwnProfile ? undefined : 0}
        onClick={
          isOwnProfile || !localCoverUrl
            ? undefined
            : function () {
                setViewerOpen(true);
              }
        }
        onKeyDown={
          isOwnProfile
            ? undefined
            : function (e) {
                if (!canViewCover) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setViewerOpen(true);
                }
              }
        }
        aria-label={isOwnProfile ? undefined : "View cover photo"}
      >
        {localCoverUrl ? (
          <Image
            src={localCoverUrl}
            alt="Cover"
            fill
            className="object-cover object-[50%_40%]"
            sizes="(min-width: 1280px) min(1348px, 92vw), (min-width: 768px) 92vw, 100vw"
          />
        ) : (
          <Image
            src={DEFAULT_PROFILE_COVER_URL}
            alt="Default cover"
            fill
            className="object-cover"
            sizes="(min-width: 1280px) min(1348px, 92vw), (min-width: 768px) 92vw, 100vw"
          />
        )}
        {isOwnProfile ? (
          <div
            className={cn(
              "absolute bottom-3 right-3 z-[1] flex gap-2 transition-opacity duration-150",
              localCoverUrl
                ? "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:pointer-events-none [@media(hover:hover)]:group-hover/cover:opacity-100 [@media(hover:hover)]:group-hover/cover:pointer-events-auto [@media(hover:hover)]:has-[:focus-visible]:opacity-100 [@media(hover:hover)]:has-[:focus-visible]:pointer-events-auto"
                : null
            )}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCoverTrigger}
              disabled={isUploading || isPreparingReposition}
              className="h-auto border border-white/30 bg-black/45 px-3 py-1.5 text-[12px] font-medium text-white shadow-none backdrop-blur-md hover:border-white/45 hover:bg-black/55 hover:text-white"
            >
              <span className="inline-flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5" strokeWidth={1.7} />
                {localCoverUrl ? "Edit cover" : "Add cover"}
              </span>
            </Button>
            {localCoverUrl ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRepositionTrigger}
                disabled={isUploading || isPreparingReposition}
                className="h-auto border border-white/30 bg-black/45 px-3 py-1.5 text-[12px] font-medium text-white shadow-none backdrop-blur-md hover:border-white/45 hover:bg-black/55 hover:text-white"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Crop className="h-3.5 w-3.5" strokeWidth={1.7} />
                  {isPreparingReposition ? "Preparing..." : "Reposition"}
                </span>
              </Button>
            ) : null}
          </div>
        ) : null}

        {isUploading ? (
          <div className="absolute inset-0 bg-black/50 z-10 flex flex-col items-center justify-center">
            <div className="relative w-12 h-12">
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
            <span className="text-[10px] text-white mt-1 font-bold">{uploadProgress}%</span>
          </div>
        ) : null}

        {!isUploading && errorMessage ? (
          <div className="absolute inset-0 bg-black/55 z-10 flex items-center justify-center px-3 pointer-events-none">
            <div className="max-w-[92%] text-center">
              <AlertCircle className="w-4 h-4 text-white mx-auto mb-1" />
              <p className="text-[11px] text-white leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        ) : null}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />

      <Dialog open={isCropping} onClose={closeCropper} title="Crop cover photo" description="Adjust the crop for a wide header view.">
        {image ? (
          <ImageCropper
            image={image}
            onCropComplete={setCroppedAreaPixels}
            onCancel={closeCropper}
            onSave={handleUpload}
            aspect={COVER_ASPECT_RATIO}
            cropShape="rect"
          />
        ) : null}
      </Dialog>

      {canViewCover ? (
        <ImageViewer
          open={viewerOpen}
          onClose={function () {
            setViewerOpen(false);
          }}
          src={localCoverUrl ?? ""}
          alt="Cover photo"
        />
      ) : null}
    </>
  );
}
