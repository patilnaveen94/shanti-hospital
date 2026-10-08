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

/* =====================================================================
   Document capture — prescriptions and other scanned pages
   =====================================================================

   Separate from the avatar path above because the requirements invert.
   An avatar renders at 56px and is small enough to inline as a data URL.
   A prescription page must stay legible under pinch-zoom, so it is an
   order of magnitude larger and goes to object storage as a Blob.

   Returning a Blob rather than a data URL matters: base64 inflates the
   payload by about a third, and uploading 33% more bytes over hospital
   4G for no benefit is a real cost.
   ===================================================================== */

/** Long edge, in CSS pixels, per use. */
export const IMAGE_PROFILES = {
  /** Existing testimonial avatars. */
  avatar: { maxDimension: 320, quality: 0.82, maxBytes: 120 * 1024 },
  /**
   * A prescription page. 1600px keeps handwriting readable when zoomed
   * while turning a 4 MB phone photo into roughly 350 KB.
   */
  document: { maxDimension: 1600, quality: 0.82, maxBytes: 1200 * 1024 },
  /** History-list thumbnail. Loaded in bulk, so it has to be tiny. */
  thumb: { maxDimension: 400, quality: 0.75, maxBytes: 80 * 1024 },
};

export const DOCUMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

/**
 * Decode a File into a bitmap with EXIF rotation already applied.
 *
 * `imageOrientation: 'from-image'` is the load-bearing part. Phone cameras
 * record orientation in EXIF rather than rotating pixels; drawing the raw
 * pixels to a canvas yields a sideways prescription, which is useless to
 * read and not obvious until someone tries. The `<img>` fallback covers
 * browsers without createImageBitmap options — most apply EXIF to <img>
 * themselves, which is why it is an acceptable second choice.
 */
async function decodeOriented(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* fall through */
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file does not look like an image.'));
    };
    img.src = url;
  });
}

/** Draw a bitmap into a canvas scaled to fit `maxDimension`. */
function fitToCanvas(bitmap, maxDimension) {
  const sw = bitmap.width;
  const sh = bitmap.height;
  const scale = Math.min(1, maxDimension / Math.max(sw, sh));
  const width = Math.max(1, Math.round(sw * scale));
  const height = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not process that image.');

  // White backdrop: JPEG has no alpha channel, so a transparent PNG would
  // otherwise composite onto black and lose the text entirely.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);

  return { canvas, width, height };
}

/** Promise wrapper for canvas.toBlob. */
function toBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode that image.'))),
      'image/jpeg',
      quality
    );
  });
}

/** Encode, stepping quality down until the result fits `maxBytes`. */
async function encodeWithinBudget(canvas, { quality, maxBytes }) {
  let q = quality;
  let blob = await toBlob(canvas, q);

  while (blob.size > maxBytes && q > 0.4) {
    q = Math.round((q - 0.1) * 100) / 100;
    blob = await toBlob(canvas, q);
  }

  return { blob, quality: q };
}

/**
 * sha256 of a Blob, hex encoded.
 *
 * Used to spot the same photograph being attached twice — easy to do when
 * a staff member is unsure whether the first upload succeeded. Returns
 * null where SubtleCrypto is unavailable (insecure origin), because a
 * missing checksum is a lost nicety rather than a failure.
 */
export async function sha256Hex(blob) {
  const subtle = typeof window !== 'undefined' && window.crypto && window.crypto.subtle;
  if (!subtle) return null;
  try {
    const buffer = await blob.arrayBuffer();
    const digest = await subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

/**
 * Prepare one captured page for upload.
 *
 * Produces the full page and its thumbnail from a single decode, so a
 * phone does the expensive work once. The thumbnail is what the history
 * list loads; without it, opening a patient with twelve past visits
 * would pull several megabytes.
 *
 * @returns {Promise<{
 *   full:  { blob: Blob, width: number, height: number, bytes: number },
 *   thumb: { blob: Blob, width: number, height: number, bytes: number },
 *   checksum: string|null,
 *   sourceName: string,
 *   sourceBytes: number
 * }>}
 */
export async function prepareDocumentImage(file) {
  if (!file) throw new Error('No file selected.');
  if (!DOCUMENT_TYPES.includes(file.type)) {
    throw new Error('Please choose a JPG, PNG or WebP image.');
  }
  // Guard before decoding: a 50 MP image would otherwise be decompressed
  // into memory on a low-end phone before we ever check its size.
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('That image is too large. Please choose one under 25 MB.');
  }

  const bitmap = await decodeOriented(file);

  try {
    const page = fitToCanvas(bitmap, IMAGE_PROFILES.document.maxDimension);
    const small = fitToCanvas(bitmap, IMAGE_PROFILES.thumb.maxDimension);

    const [fullOut, thumbOut] = await Promise.all([
      encodeWithinBudget(page.canvas, IMAGE_PROFILES.document),
      encodeWithinBudget(small.canvas, IMAGE_PROFILES.thumb),
    ]);

    if (fullOut.blob.size > IMAGE_PROFILES.document.maxBytes) {
      throw new Error('Could not compress that image enough. Please retake the photo.');
    }

    return {
      full: {
        blob: fullOut.blob,
        width: page.width,
        height: page.height,
        bytes: fullOut.blob.size,
      },
      thumb: {
        blob: thumbOut.blob,
        width: small.width,
        height: small.height,
        bytes: thumbOut.blob.size,
      },
      checksum: await sha256Hex(fullOut.blob),
      sourceName: file.name || 'page.jpg',
      sourceBytes: file.size,
    };
  } finally {
    // Free the decoded bitmap promptly; these are large on a phone.
    if (typeof bitmap.close === 'function') bitmap.close();
  }
}

/** A Blob as an object URL, for previewing before upload. */
export function previewUrl(blob) {
  return URL.createObjectURL(blob);
}
