// Tangramo figūrų patikra: node scripts/brain/check-tangram.mjs [out.html]
// Tikrina, ar detalės nepersidengia ir figūra vientisa; nupiešia visas figūras peržiūrai.
import { writeFileSync } from 'node:fs';
import { TANGRAM_SHAPES } from '../../src/config/tangram-shapes.js';

const AREA = { ST: 1, MT: 2, LT: 4, SQ: 2, PA: 2 };
const inside = (pts, x, y) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const area = (pts) => Math.abs(pts.reduce((s, [x, y], i) => {
  const [x2, y2] = pts[(i + 1) % pts.length];
  return s + x * y2 - x2 * y;
}, 0)) / 2;

let bad = 0;
const svgs = TANGRAM_SHAPES.map((f, li) => {
  const all = f.pieces.flatMap((p) => p.pts);
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const problems = [];
  f.pieces.forEach((p, i) => {
    if (Math.abs(area(p.pts) - AREA[p.type]) > 1e-6) problems.push(`detalė ${i + 1} (${p.type}) plotas ${area(p.pts)}`);
  });
  // persidengimai ir vientisumas – tankiu tinkleliu
  const step = 0.1;
  const cov = new Map();
  let overlap = 0;
  const ny = Math.round((y1 - y0) / step);
  const nx = Math.round((x1 - x0) / step);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const x = x0 + (i + 0.5) * step;
      const y = y0 + (j + 0.5) * step;
      const n = f.pieces.filter((p) => inside(p.pts, x, y)).length;
      if (n > 1) overlap++;
      if (n) cov.set(`${i},${j}`, 1);
    }
  }
  if (overlap > 3) problems.push(`persidengia (${overlap} taškų)`);
  // Vientisumas pagal geometriją: detalės susijungusios, jei viena kitos viršūnė guli ant kitos kontūro
  // (bendra kraštinė arba prisilietimas kampu – kaip klasikiniame tangrame, pvz. žuvies uodega).
  const onSeg = ([px, py], [ax, ay], [bx, by]) =>
    Math.abs((bx - ax) * (py - ay) - (by - ay) * (px - ax)) < 1e-9 &&
    px >= Math.min(ax, bx) - 1e-9 && px <= Math.max(ax, bx) + 1e-9 && py >= Math.min(ay, by) - 1e-9 && py <= Math.max(ay, by) + 1e-9;
  const touches = (A, B) => A.pts.some((pt) => B.pts.some((_, i) => onSeg(pt, B.pts[i], B.pts[(i + 1) % B.pts.length])));
  const linked = new Set([0]);
  for (let changed = true; changed; ) {
    changed = false;
    f.pieces.forEach((p, i) => {
      if (linked.has(i)) return;
      if ([...linked].some((j) => touches(p, f.pieces[j]) || touches(f.pieces[j], p))) linked.add(i), (changed = true);
    });
  }
  if (linked.size < f.pieces.length) problems.push(`atskiros detalės: ${f.pieces.map((_, i) => i + 1).filter((i) => !linked.has(i - 1)).join(', ')}`);
  if (problems.length) bad++;
  console.log(`${String(li + 1).padStart(2)} ${f.name.padEnd(18)} ${f.pieces.length} det. ${problems.length ? '✗ ' + problems.join('; ') : '✓'}`);
  const colors = ['#4cb963', '#3fa9f5', '#ffc531', '#ff7a68', '#a970ff', '#ff9f43', '#2ec4b6'];
  const s = 16;
  const polys = f.pieces.map((p, i) => `<polygon points="${p.pts.map(([x, y]) => `${(x - x0 + 0.5) * s},${(y - y0 + 0.5) * s}`).join(' ')}" fill="${colors[i % 7]}" stroke="#5a3825" stroke-width="2"/>`).join('');
  return `<figure><svg width="${(x1 - x0 + 1) * s}" height="${(y1 - y0 + 1) * s}">${polys}</svg><figcaption>${li + 1}. ${f.name}${problems.length ? ' ✗' : ''}</figcaption></figure>`;
});
const out = process.argv[2];
if (out) writeFileSync(out, `<!doctype html><meta charset="utf-8"><style>body{font:14px system-ui;display:flex;flex-wrap:wrap;gap:16px;padding:16px;background:#fff6e5}figure{margin:0;background:#fff;padding:6px;border-radius:8px;font-size:11px}</style>${svgs.join('')}`);
console.log(bad ? `Klaidingų figūrų: ${bad}` : 'Visos figūros tvarkingos.');
process.exitCode = bad ? 1 : 0;
