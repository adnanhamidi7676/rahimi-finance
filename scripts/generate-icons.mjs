// Generates the PWA PNG icons (solid brand background with a centred "R").
// Pure Node — no image deps. Run: node scripts/generate-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const BG = [15, 23, 42]; // #0f172a slate-900
const FG = [255, 255, 255];

// 7x7 bitmap of the letter "R".
const R = [
  "1111100",
  "1000010",
  "1000010",
  "1111100",
  "1001000",
  "1000100",
  "1000010",
];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function makePng(size) {
  const cells = 7;
  const cell = Math.floor(size * 0.62 / cells);
  const glyph = cell * cells;
  const offset = Math.floor((size - glyph) / 2);

  const raw = Buffer.alloc(size * (size * 4 + 1));
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      let color = BG;
      const gx = x - offset;
      const gy = y - offset;
      if (gx >= 0 && gy >= 0 && gx < glyph && gy < glyph) {
        const cx = Math.floor(gx / cell);
        const cy = Math.floor(gy / cell);
        if (R[cy] && R[cy][cx] === "1") color = FG;
      }
      raw[p++] = color[0];
      raw[p++] = color[1];
      raw[p++] = color[2];
      raw[p++] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return png;
}

mkdirSync(new URL("../public", import.meta.url), { recursive: true });
const out = (name) => new URL(`../public/${name}`, import.meta.url);

writeFileSync(out("icon-192x192.png"), makePng(192));
writeFileSync(out("icon-512x512.png"), makePng(512));
writeFileSync(out("icon-maskable-512x512.png"), makePng(512));
writeFileSync(out("apple-touch-icon.png"), makePng(180));
console.log("Generated PWA icons in public/");
