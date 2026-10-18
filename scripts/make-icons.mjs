// Sugeneruoja PWA ir apple-touch ikonas iš pagrindinės vedlės – pelėdos Onos (peleda_happy) su kreminiu fonu.
import sharp from 'sharp';

const SRC = 'public/assets/characters/peleda_happy.webp';
const BG = '#FBF6EE';
// Apkerpame į galvą ir sparnus, kad ikona būtų aiški mažame dydyje.
const CROP = { left: 50, top: 50, width: 924, height: 924 };

async function make(size, file, pad = 0.08) {
  const inner = Math.round(size * (1 - pad * 2));
  const art = await sharp(SRC).extract(CROP).resize(inner, inner).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: art, gravity: 'center' }])
    .flatten({ background: BG })
    .png()
    .toFile(file);
  console.log('✓', file);
}

await make(180, 'public/icons/apple-touch-icon.png');
await make(192, 'public/icons/icon-192.png');
await make(512, 'public/icons/icon-512.png');
// Maskable: daugiau tuščios vietos saugiai zonai.
await make(512, 'public/icons/icon-512-maskable.png', 0.18);
