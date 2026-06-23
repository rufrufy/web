// Compress a canvas photo to under maxBytes by lowering JPEG quality, then dimensions.
// Accepts the source canvas directly (no async image decode). Returns a JPEG dataURL.
const MAX_DIMENSION = 1280;
const MIN_DIMENSION = 480;
const MIN_QUALITY = 0.6;
const MAX_QUALITY = 0.9;

export function compressCanvas(
  source: HTMLCanvasElement | HTMLVideoElement,
  maxBytes = 500 * 1024
): string {
  const srcW = "videoWidth" in source ? source.videoWidth : source.width;
  const srcH = "videoHeight" in source ? source.videoHeight : source.height;
  const { width, height } = fitWithin(srcW || 640, srcH || 480, MAX_DIMENSION);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.drawImage(source, 0, 0, width, height);

  let quality = MAX_QUALITY;
  let result = canvas.toDataURL("image/jpeg", quality);

  while (dataUrlSize(result) > maxBytes && quality > MIN_QUALITY) {
    quality -= 0.15;
    result = canvas.toDataURL("image/jpeg", quality);
  }

  let w = width;
  let h = height;
  while (dataUrlSize(result) > maxBytes && w > MIN_DIMENSION) {
    w = Math.round(w * 0.75);
    h = Math.round(h * 0.75);
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(source, 0, 0, w, h);
    result = canvas.toDataURL("image/jpeg", quality);
  }

  return result;
}

function fitWithin(
  width: number,
  height: number,
  max: number
): { width: number; height: number } {
  if (width <= max && height <= max) return { width, height };
  const ratio = width > height ? max / width : max / height;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
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
