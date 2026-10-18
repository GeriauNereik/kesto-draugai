// Veikėjų portretai iš rig dalių (tas pats piešinys kaip gyvas veikėjas):
// public/assets/characters/portraits/{veikejas}.webp – avatarams, porų kortelėms, profiliams.
// Paleisti po rig'ų pakeitimo: npm run portraits
import sharp from 'sharp';
import { readFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const RIGS = 'public/assets/rigs';
const OUT = 'public/assets/characters/portraits';
const SIZE = 512;
const PAD = 0.04; // tuščio krašto dalis aplink veikėją

mkdirSync(OUT, { recursive: true });

for (const id of readdirSync(RIGS)) {
  const cfgFile = `src/rigs/${id}.json`;
  if (id.startsWith('_') || !existsSync(cfgFile)) continue;
  const cfg = JSON.parse(readFileSync(cfgFile, 'utf8'));
  // Ramybės būsena: atmerktos akys, šypsena.
  const files = cfg.layers
    .map((l) => l.file || l.files?.[l.id === 'mouth' ? 'smile' : 'open'] || Object.values(l.files || {})[0])
    .filter((f) => f && existsSync(join(RIGS, id, f)));
  const canvas = cfg.canvas || 1024;
  const flat = await sharp({ create: { width: canvas, height: canvas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(files.map((f) => ({ input: join(RIGS, id, f) })))
    .png()
    .toBuffer();
  const trimmed = await sharp(flat).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = trimmed.info;
  const side = Math.round(Math.max(w, h) * (1 + 2 * PAD));
  // sharp visada daro resize prieš composite, todėl kvadratą sudedam atskirai.
  const square = await sharp({ create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: trimmed.data, left: Math.round((side - w) / 2), top: Math.round((side - h) / 2) }])
    .png()
    .toBuffer();
  await sharp(square)
    .resize(SIZE, SIZE)
    .webp({ quality: 88 })
    .toFile(join(OUT, `${id}.webp`));
  console.log(`${id}: ${files.length} dalys -> ${OUT}/${id}.webp`);
}
