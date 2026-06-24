// Crop + compress a camera frame for SADEWA face attendance.
// secure-sadewa expects ≤100KB JPEG at exactly 300×400px. Larger photos
// (1280px/500KB) are silently rejected by the server.
// Performs a center-crop biased toward the upper-center (face region in
// selfie frames). Returns JPEG dataURL or "" on failure.

export const FACE_WIDTH = 300;
export const FACE_HEIGHT = 400;
const TARGET_BYTES = 100 * 1024;
const MIN_QUALITY = 0.45;
const MAX_QUALITY = 0.8;

export interface CropOptions {
  width?: number;
  height?: number;
  maxBytes?: number;
}

export function compressCanvas(
  source: HTMLCanvasElement | HTMLVideoElement,
  maxBytes: number = TARGET_BYTES
): string {
  return cropFace(source, { maxBytes });
}

export function cropFace(
  source: HTMLCanvasElement | HTMLVideoElement,
  opts: CropOptions = {}
): string {
  const outW = opts.width ?? FACE_WIDTH;
  const outH = opts.height ?? FACE_HEIGHT;
  const maxBytes = opts.maxBytes ?? TARGET_BYTES;

  const srcW =
    "videoWidth" in source ? source.videoWidth : (source as HTMLCanvasElement).width;
  const srcH =
    "videoHeight" in source
      ? source.videoHeight
      : (source as HTMLCanvasElement).height;

  if (!srcW || !srcH) return "";

  // Cover-crop: scale source to cover outW×outH, then crop the excess.
  const targetRatio = outW / outH;
  const srcRatio = srcW / srcH;

  let cropW: number;
  let cropH: number;
  if (srcRatio > targetRatio) {
    cropH = srcH;
    cropW = Math.round(srcH * targetRatio);
  } else {
    cropW = srcW;
    cropH = Math.round(srcW / targetRatio);
  }

  // Center horizontally; bias vertically upward (selfie face sits above center).
  const cropX = Math.round((srcW - cropW) / 2);
  const faceBias = 0.35;
  const cropY = Math.max(
    0,
    Math.min(Math.round((srcH - cropH) * faceBias), srcH - cropH)
  );

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

  let quality = MAX_QUALITY;
  let result = canvas.toDataURL("image/jpeg", quality);

  while (dataUrlSize(result) > maxBytes && quality > MIN_QUALITY) {
    quality -= 0.1;
    result = canvas.toDataURL("image/jpeg", quality);
  }

  return result;
}

function dataUrlSize(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return 0;
  const base64 = dataUrl.slice(comma + 1);
  return Math.floor((base64.length * 3) / 4);
}

export async function dataUrlToFile(
  dataUrl: string,
  filename: string
): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: "image/jpeg" });
}
