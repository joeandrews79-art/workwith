/** Client-side image helpers (no server-only). */

/** Read a File as a data URL. */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = () => rej(new Error("Could not read that file."));
    fr.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Could not open that image."));
    i.src = src;
  });
}

/**
 * Center-crop an image to a square and return a small JPEG data URL, suitable
 * for a profile avatar. Keeps the payload tiny so it can live in the database.
 */
export async function resizeToSquareDataUrl(file: File, size = 160, quality = 0.85): Promise<string> {
  const img = await loadImage(await readAsDataUrl(file));
  const min = Math.min(img.width, img.height);
  const sx = (img.width - min) / 2;
  const sy = (img.height - min) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas.getContext("2d")!.drawImage(img, sx, sy, min, min, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", quality);
}
