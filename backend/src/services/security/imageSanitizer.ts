import fs from 'node:fs';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';

export type SupportedImageMime = 'image/png' | 'image/jpeg' | 'image/webp';

export interface SanitizedImageResult {
  buffer: Buffer;
  mimeType: SupportedImageMime;
  ext: 'png' | 'jpg' | 'webp';
  width: number;
  height: number;
  metadataStripped: boolean;
}

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function detectImageSignature(buffer: Buffer): SupportedImageMime | null {
  if (buffer.length < 12) return null;
  if (buffer.subarray(0, 8).equals(PNG_SIG)) {
    return 'image/png';
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

/**
 * Strips EXIF / XMP / ICCP chunks from a WEBP RIFF container while preserving image bitstream chunks (VP8 / VP8L / VP8X / ALPH / ANIM).
 */
function stripWebpMetadata(buffer: Buffer): Buffer {
  const signature = buffer.subarray(0, 4).toString('ascii');
  const format = buffer.subarray(8, 12).toString('ascii');
  if (signature !== 'RIFF' || format !== 'WEBP') {
    throw new Error('Invalid WEBP container');
  }

  const keptChunks: Buffer[] = [];
  let offset = 12;
  let hasImageChunk = false;

  while (offset + 8 <= buffer.length) {
    const fourCC = buffer.subarray(offset, offset + 4).toString('ascii');
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const paddedSize = chunkSize + (chunkSize % 2);
    const chunkEnd = offset + 8 + paddedSize;
    if (offset + 8 + chunkSize > buffer.length) {
      throw new Error('Corrupted WEBP chunk bounds');
    }

    if (fourCC === 'VP8 ' || fourCC === 'VP8L' || fourCC === 'VP8X' || fourCC === 'ALPH') {
      hasImageChunk = true;
    }

    // Drop EXIF, XMP, ICCP metadata chunks to scrub GPS / camera EXIF
    if (fourCC !== 'EXIF' && fourCC !== 'XMP ' && fourCC !== 'ICCP') {
      const sliceEnd = Math.min(chunkEnd, buffer.length);
      const rawChunk = Buffer.from(buffer.subarray(offset, sliceEnd));
      // Clear EXIF / XMP / ICC flags in VP8X extended header byte if present
      if (fourCC === 'VP8X' && rawChunk.length >= 12) {
        // Bit flags in byte 8: bit 2 = ICCP (0x20), bit 3 = Alpha (0x10), bit 4 = EXIF (0x08), bit 5 = XMP (0x04)
        // Only keep Alpha (0x10) & Animation (0x02) bits
        rawChunk[8] = rawChunk[8] & (0x10 | 0x02);
      }
      keptChunks.push(rawChunk);
    }

    offset = chunkEnd;
  }

  if (!hasImageChunk || keptChunks.length === 0) {
    throw new Error('WEBP file contains no valid image bitstream chunks');
  }

  const payload = Buffer.concat(keptChunks);
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(4 + payload.length, 4);
  header.write('WEBP', 8, 'ascii');
  return Buffer.concat([header, payload]);
}

/**
 * Validates magic bytes, decodes pixels (PNG/JPEG) or validates bitstream (WEBP),
 * and re-encodes into clean bytes without EXIF, GPS, or embedded scripts.
 */
export function sanitizeAndReencodeImage(buffer: Buffer): SanitizedImageResult {
  const detected = detectImageSignature(buffer);
  if (!detected) {
    throw new Error('Unsupported or spoofed image binary content. Only real PNG, JPEG, and WEBP images are allowed.');
  }

  if (detected === 'image/png') {
    const decoded = PNG.sync.read(buffer);
    if (!decoded.width || !decoded.height || decoded.width > 8000 || decoded.height > 8000) {
      throw new Error('Invalid PNG dimensions');
    }
    const cleanPng = new PNG({ width: decoded.width, height: decoded.height });
    decoded.data.copy(cleanPng.data);
    const encoded = PNG.sync.write(cleanPng);
    return {
      buffer: encoded,
      mimeType: 'image/png',
      ext: 'png',
      width: decoded.width,
      height: decoded.height,
      metadataStripped: true,
    };
  }

  if (detected === 'image/jpeg') {
    const decoded = jpeg.decode(buffer, { useTArray: true, maxMemoryUsageInMB: 128 });
    if (!decoded.width || !decoded.height || decoded.width > 8000 || decoded.height > 8000) {
      throw new Error('Invalid JPEG dimensions');
    }
    const encoded = jpeg.encode(
      {
        data: decoded.data,
        width: decoded.width,
        height: decoded.height,
      },
      88
    );
    return {
      buffer: Buffer.from(encoded.data),
      mimeType: 'image/jpeg',
      ext: 'jpg',
      width: decoded.width,
      height: decoded.height,
      metadataStripped: true,
    };
  }

  // WEBP
  const cleanWebp = stripWebpMetadata(buffer);
  return {
    buffer: cleanWebp,
    mimeType: 'image/webp',
    ext: 'webp',
    width: 0,
    height: 0,
    metadataStripped: true,
  };
}

export function safeUnlink(filePath?: string): void {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // ignore cleanup failure
  }
}
