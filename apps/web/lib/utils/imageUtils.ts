import heic2any from "heic2any";

export function normalizeImageContentType(
  value?: string,
  fileName?: string
): string | null {
  const candidate = typeof value === "string" ? value.toLowerCase().trim() : "";
  if (candidate === "image/jpg") return "image/jpeg";
  if (
    candidate === "image/jpeg" ||
    candidate === "image/png" ||
    candidate === "image/webp" ||
    candidate === "image/gif" ||
    candidate === "image/avif" ||
    candidate === "image/heic" ||
    candidate === "image/heif"
  ) {
    return candidate;
  }

  if (typeof fileName === "string") {
    const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
    const extension = match ? match[1] : "";
    if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
    if (extension === "png") return "image/png";
    if (extension === "webp") return "image/webp";
    if (extension === "gif") return "image/gif";
    if (extension === "avif") return "image/avif";
    if (extension === "heic") return "image/heic";
    if (extension === "heif") return "image/heif";
  }

  return null;
}

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () =>
      reject(new Error("Could not decode image for cropping"))
    );
    image.setAttribute("crossOrigin", "anonymous"); // needed to avoid cross-origin issues
    image.src = url;
  });

export async function convertHeicToJpeg(file: Blob): Promise<Blob> {
  const converted = (await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.9,
  })) as Blob | Blob[];

  const output = Array.isArray(converted) ? converted[0] : converted;
  if (!(output instanceof Blob)) {
    throw new Error("Could not convert HEIC image.");
  }

  return output;
}

export async function readImageFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function () {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read image file"));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = function () {
      reject(new Error("Could not read image file"));
    };
    reader.readAsDataURL(file);
  });
}

export async function canDecodeImage(file: Blob): Promise<string> {
  const dataUrl = await readImageFileAsDataUrl(file);
  await createImage(dataUrl);
  return dataUrl;
}

export function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the rotated size of the image.
 */
export function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * This function was adapted from the one in the react-easy-crop project
 */
export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
  flip = { horizontal: false, vertical: false }
): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return null;
  }

  const rotRad = getRadianAngle(rotation);

  // calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  // set canvas size to match the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // translate canvas context to a central point to allow rotating and flipping around the center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  // draw rotated image
  ctx.drawImage(image, 0, 0);

  // croppedAreaPixels values are bounding box relative
  // extract the cropped image using these values
  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  );

  // set canvas width to final desired crop size - this will clear existing context
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // paste generated rotate image with the correct offsets for x,y crop values.
  ctx.putImageData(data, 0, 0);

  // As Base64 string
  // return canvas.toDataURL('image/jpeg');

  // As a blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((file) => {
      if (!file) {
        reject(new Error("Could not create cropped image blob"));
        return;
      }
      resolve(file);
    }, "image/jpeg");
  });
}
