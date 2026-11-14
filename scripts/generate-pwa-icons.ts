import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Pure-Node PNG encoder for crisp AccessPath PWA icons (no external native deps needed)
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const combined = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function renderIconPNG(size: number, maskable: boolean): Buffer {
  const raw = Buffer.alloc(size * (1 + size * 4));
  const bg = [18, 59, 86, 255]; // #123B56 Deep Navy
  const white = [255, 255, 255, 255];
  const teal = [45, 184, 154, 255]; // #2DB89A Accent Teal
  const padScale = maskable ? 0.72 : 0.88;

  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0; // filter type 0
    for (let x = 0; x < size; x++) {
      const nx = ((x / size) - 0.5) / padScale + 0.5;
      const ny = ((y / size) - 0.5) / padScale + 0.5;
      let color = bg;

      if (nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1) {
        // Teal waypoint circle at top
        const dxDot = nx - 0.5;
        const dyDot = ny - 0.2;
        if (dxDot * dxDot + dyDot * dyDot <= 0.055 * 0.055) {
          color = teal;
        }
        // Stylized 'A' path triangle
        const inOuterA =
          ny >= 0.28 &&
          ny <= 0.72 &&
          Math.abs(nx - 0.5) <= 0.05 + (ny - 0.28) * 0.42;
        const inInnerCutout =
          ny >= 0.39 &&
          ny <= 0.55 &&
          Math.abs(nx - 0.5) <= (ny - 0.39) * 0.38;
        const inBottomCutout =
          ny >= 0.63 &&
          ny <= 0.72 &&
          Math.abs(nx - 0.5) <= 0.095 + (ny - 0.63) * 0.38;

        if (inOuterA && !inInnerCutout && !inBottomCutout) {
          color = white;
        }
        // Accessible ramp arc below 'A'
        const arcY = 0.80 - 0.05 * Math.cos((nx - 0.5) * Math.PI * 2.2);
        if (nx >= 0.2 && nx <= 0.8 && Math.abs(ny - arcY) <= 0.025) {
          color = teal;
        }
      }

      const px = rowStart + 1 + x * 4;
      raw[px] = color[0];
      raw[px + 1] = color[1];
      raw[px + 2] = color[2];
      raw[px + 3] = color[3];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw, { level: 6 });
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const publicDir = path.resolve(process.cwd(), 'public');
fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), renderIconPNG(192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), renderIconPNG(512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), renderIconPNG(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), renderIconPNG(180, false));
console.log('Generated PWA PNG icons in public/');
