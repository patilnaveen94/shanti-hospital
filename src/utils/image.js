/**
 * Client-side image downscaling for testimonial photos.
 *
 * Why not upload to object storage: a testimonial avatar renders at about 56px.
 * Downscaling in the browser to a small JPEG data URL means no storage bucket to
 * configure, no signed-URL plumbing, and it works identically in local mode.
 * The database policy caps the column at 200 KB so this cannot become a
 * general-purpose file dump.
 *
 * For anything larger than an avatar — reports, scans — use Supabase Storage
 * instead. Base64 in a column does not scale past this.
 */

export const MAX_DIMENSION = 320;
export const MAX_BYTES = 120 * 1024;
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Rough byte size of a data URL payload. */
export function dataUrlBytes(dataUrl) {
  if (!dataUrl) return 0;
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return 0;
  const base64 = dataUrl.slice(comma + 1);
  // 4 base64 chars encode 3 bytes; trailing '=' padding is not data.
  const padding = (base64.match(/=+$/) || [''])[0].length;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/**
 * Read a File, downscale it and return a JPEG data URL.
 *
 * Quality steps down until the result fits MAX_BYTES, so an 8 MP phone photo
 * still ends up as a small avatar rather than being rejected.
 *
 * @returns {Promise<{dataUrl: string, bytes: number}>}
 */
export function downscaleImage(file, { maxDimension = MAX_DIMENSION, maxBytes = MAX_BYTES } = {}) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file selected.'));
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      reject(new Error('Please choose a JPG, PNG or WebP image.'));
      return;
    }
    // Guard before decoding: a 50 MB file would otherwise be read into memory.
    if (file.size > 12 * 1024 * 1024) {
      reject(new Error('That image is too large. Please choose one under 12 MB.'));
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Could not read that file.'));

    reader.onload = () => {
      const img = new Image();

      img.onerror = () => reject(new Error('That file does not look like an image.'));

      img.onload = () => {
        try {
          const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
          const width = Math.max(1, Math.round(img.width * scale));
          const height = Math.max(1, Math.round(img.height * scale));

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Your browser could not process that image.'));
            return;
          }

          // White backdrop: JPEG has no alpha, and transparent PNGs would
          // otherwise composite onto black.
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          let quality = 0.82;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);

          while (dataUrlBytes(dataUrl) > maxBytes && quality > 0.35) {
            quality -= 0.12;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          const bytes = dataUrlBytes(dataUrl);
          if (bytes > maxBytes) {
            reject(new Error('Could not compress that image enough. Please try a different photo.'));
            return;
          }

          resolve({ dataUrl, bytes });
        } catch (error) {
          reject(new Error('Could not process that image.'));
        }
      };

      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}

/** `24576` → `24 KB` */
export function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  return `${Math.round(bytes / 1024)} KB`;
}
