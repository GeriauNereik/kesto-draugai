// Piešinio išsaugojimas: peržiūra, stilizuota juostelė apačioje su savo tekstu, išsaugojimas į telefoną.
// Telefone – bendrinimo langas (iOS: „Išsaugoti vaizdą“ → Nuotraukos), kompiuteryje – atsisiuntimas.
import { h, onTap } from './dom.js';
import { ICONS } from './icons.js';
import { sfx } from '../sfx.js';

const FONT = '"Baloo 2", system-ui, -apple-system, sans-serif';

/** Juostelės stiliai: fonas, teksto spalva, papuošimas. */
export const BANNER_STYLES = {
  miskas: { label: 'Miškas', top: '#5fcc72', bottom: '#2e9a48', text: '#ffffff', shadow: 'rgba(0,50,15,.45)', swatch: '#4cb963' },
  saule: { label: 'Saulė', top: '#ffd45c', bottom: '#ffb300', text: '#5a3825', shadow: 'rgba(255,255,255,.55)', swatch: '#ffc531' },
  dangus: { label: 'Dangus', top: '#8fd3ff', bottom: '#3fa9f5', text: '#ffffff', shadow: 'rgba(0,40,90,.4)', swatch: '#3fa9f5' },
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function drawDecor(ctx, style, w, y, bh) {
  ctx.save();
  if (style === 'miskas') {
    // žolės kuokšteliai juostelės viršuje
    ctx.fillStyle = '#7fd36b';
    const n = Math.round(w / (bh * 0.18));
    for (let i = 0; i <= n; i++) {
      const x = (i / n) * w;
      const hgt = bh * (0.1 + 0.06 * Math.sin(i * 1.7));
      ctx.beginPath();
      ctx.moveTo(x - bh * 0.06, y);
      ctx.quadraticCurveTo(x, y - hgt * 1.2, x + bh * 0.02, y - hgt);
      ctx.quadraticCurveTo(x + bh * 0.02, y - hgt * 0.4, x + bh * 0.06, y);
      ctx.fill();
    }
    // lapeliai kampuose
    const leaf = (cx, cy, r, rot, c) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(r * 0.75, 0, 0, r);
      ctx.quadraticCurveTo(-r * 0.75, 0, 0, -r);
      ctx.fill();
      ctx.restore();
    };
    leaf(bh * 0.35, y + bh * 0.5, bh * 0.24, -0.6, '#9be0a6');
    leaf(bh * 0.62, y + bh * 0.62, bh * 0.16, 0.5, '#ffd45c');
    leaf(w - bh * 0.35, y + bh * 0.5, bh * 0.24, 0.6, '#9be0a6');
    leaf(w - bh * 0.62, y + bh * 0.62, bh * 0.16, -0.5, '#ff9f8f');
  } else if (style === 'saule') {
    // saulutė su spinduliais kairėje, žvaigždutė dešinėje
    const cx = bh * 0.55;
    const cy = y + bh * 0.5;
    ctx.strokeStyle = '#fff3c4';
    ctx.lineWidth = bh * 0.05;
    ctx.lineCap = 'round';
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * bh * 0.24, cy + Math.sin(a) * bh * 0.24);
      ctx.lineTo(cx + Math.cos(a) * bh * 0.36, cy + Math.sin(a) * bh * 0.36);
      ctx.stroke();
    }
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(cx, cy, bh * 0.18, 0, Math.PI * 2);
    ctx.fill();
    star(ctx, w - bh * 0.55, cy, bh * 0.22, '#fff3c4');
  } else if (style === 'dangus') {
    // debesėliai
    const cloud = (cx, cy, r) => {
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.beginPath();
      ctx.arc(cx - r, cy, r * 0.7, 0, Math.PI * 2);
      ctx.arc(cx, cy - r * 0.35, r, 0, Math.PI * 2);
      ctx.arc(cx + r, cy, r * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - r, cy, r * 2, r * 0.7);
    };
    cloud(bh * 0.6, y + bh * 0.55, bh * 0.2);
    cloud(w - bh * 0.6, y + bh * 0.5, bh * 0.17);
  }
  ctx.restore();
}

function star(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Tekstas, sumažinamas, kad tilptų į plotį. */
function fitText(ctx, text, maxW, size, weight = 700) {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (s > 10 && ctx.measureText(text).width > maxW) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${FONT}`;
  }
  return s;
}

/**
 * Sudeda piešinį ir (jei reikia) juostelę po juo. Piešinys neuždengiamas – juostelė pridedama apačioje.
 * banner: null | { style, text }
 */
export async function composeDrawing(src, banner) {
  const w = src.width;
  const bh = banner ? Math.max(120, Math.round(w * 0.16)) : 0;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = src.height + bh;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(src, 0, 0);
  if (!banner) return out;

  const st = BANNER_STYLES[banner.style] || BANNER_STYLES.miskas;
  const y = src.height;
  const g = ctx.createLinearGradient(0, y, 0, y + bh);
  g.addColorStop(0, st.top);
  g.addColorStop(1, st.bottom);
  ctx.fillStyle = g;
  // banguotas viršutinis kraštas
  ctx.beginPath();
  ctx.moveTo(0, y + bh * 0.06);
  const waves = Math.max(4, Math.round(w / (bh * 0.9)));
  for (let i = 0; i < waves; i++) {
    const x0 = (i / waves) * w;
    const x1 = ((i + 1) / waves) * w;
    ctx.quadraticCurveTo((x0 + x1) / 2, y - bh * 0.06, x1, y + bh * 0.06);
  }
  ctx.lineTo(w, y + bh);
  ctx.lineTo(0, y + bh);
  ctx.closePath();
  ctx.fill();
  drawDecor(ctx, banner.style, w, y + bh * 0.06, bh * 0.94);

  // tekstas: pagrindinis + smulki eilutė (data ir „Kęsto draugai“)
  const text = (banner.text || '').trim();
  const side = bh * 1.1; // vieta papuošimams kraštuose
  try {
    await document.fonts?.load(`700 ${Math.round(bh * 0.36)}px "Baloo 2"`, text || 'Ą');
  } catch {
    /* be šrifto – sisteminis */
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = w / 2;
  if (text) {
    const size = fitText(ctx, text, w - side * 2, Math.round(bh * 0.36));
    ctx.fillStyle = st.shadow;
    ctx.fillText(text, cx, y + bh * 0.47 + size * 0.06);
    ctx.fillStyle = st.text;
    ctx.fillText(text, cx, y + bh * 0.47);
  }
  const small = `${today()} · Kęsto draugai`;
  fitText(ctx, small, w - side * 2, Math.round(bh * 0.15), 500);
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = st.text;
  ctx.fillText(small, cx, y + bh * (text ? 0.8 : 0.5));
  ctx.globalAlpha = 1;
  return out;
}

const toBlob = (canvas) => new Promise((r) => canvas.toBlob(r, 'image/png'));

/** Išsaugo paveikslėlį: bendrinimo langas (telefone) arba atsisiuntimas. Grąžina 'shared' | 'downloaded' | 'cancel'. */
export async function saveImage(blob, filename) {
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Piešinys' });
      return 'shared';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancel';
      // kitos klaidos – bandom atsisiųsti
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return 'downloaded';
}

/**
 * Išsaugojimo langas su peržiūra.
 * canvas – piešimo drobė; defaultText – pradinis juostelės tekstas; filename – failo vardas.
 */
export function openSaveSheet({ canvas, defaultText = '', filename = 'piesinys.png', onClose }) {
  let style = 'miskas';
  let withBanner = true;
  let busy = false;

  const preview = h('img', { class: 'save-preview', alt: 'Piešinio peržiūra' });
  const input = h('input', {
    class: 'save-text',
    type: 'text',
    maxlength: '40',
    value: defaultText,
    placeholder: 'Tekstas juostelėje',
    'aria-label': 'Tekstas juostelėje',
    autocomplete: 'off',
    enterkeyhint: 'done',
  });
  const sw = h('button', { type: 'button', class: 'switch', role: 'switch', 'aria-label': 'Juostelė apačioje', 'aria-checked': 'true' }, h('span', { class: 'switch-knob' }));
  const styleBtns = Object.entries(BANNER_STYLES).map(([id, st]) => {
    const b = h('button', { type: 'button', class: 'save-style', 'data-id': id, 'aria-label': st.label, title: st.label, style: `--c:${st.swatch}` }, h('span', { text: st.label }));
    onTap(b, () => {
      sfx('tap');
      style = id;
      sync();
    });
    return b;
  });
  const bannerOpts = h('div', { class: 'save-banner-opts' }, [input, h('div', { class: 'save-styles' }, styleBtns)]);
  const saveBtn = h('button', { type: 'button', class: 'btn btn-primary btn-xl save-go' }, [h('span', { class: 'btn-icon', html: ICONS.download || ICONS.check }), h('span', { class: 'btn-label', text: 'Išsaugoti' })]);
  const cancelBtn = h('button', { type: 'button', class: 'btn btn-secondary save-cancel', text: 'Atšaukti' });
  const note = h('p', { class: 'save-note', 'aria-live': 'polite' });

  const card = h('div', { class: 'save-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Išsaugoti piešinį' }, [
    h('h2', { class: 'save-title', text: 'Išsaugoti piešinį' }),
    h('div', { class: 'save-preview-wrap' }, preview),
    h('div', { class: 'save-row' }, [h('span', { text: 'Juostelė su tekstu' }), sw]),
    bannerOpts,
    note,
    h('div', { class: 'save-actions' }, [cancelBtn, saveBtn]),
  ]);
  const sheet = h('div', { class: 'save-sheet' }, card);
  document.body.append(sheet);

  let previewUrl = null;
  let renderToken = 0;
  let ready = null; // { token, blob } – paruoštas paveikslėlis, kad išsaugojimas prasidėtų iškart po paspaudimo
  async function render() {
    const my = ++renderToken;
    const out = await composeDrawing(canvas, withBanner ? { style, text: input.value } : null);
    if (my !== renderToken) return null;
    const blob = await toBlob(out);
    if (my !== renderToken || !blob) return null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(blob);
    preview.src = previewUrl;
    ready = { token: my, blob };
    return blob;
  }
  function sync() {
    sw.setAttribute('aria-checked', String(withBanner));
    bannerOpts.hidden = !withBanner;
    styleBtns.forEach((b) => b.classList.toggle('on', b.dataset.id === style));
    render();
  }
  let t = null;
  input.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(render, 150);
  });
  input.addEventListener('keydown', (e) => e.key === 'Enter' && input.blur());
  onTap(sw, () => {
    sfx('tap');
    withBanner = !withBanner;
    sync();
  });

  function close() {
    clearTimeout(t);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    sheet.remove();
    onClose?.();
  }
  onTap(cancelBtn, () => (sfx('tap'), close()));
  sheet.addEventListener('click', (e) => e.target === sheet && close());
  onTap(saveBtn, async () => {
    if (busy) return;
    busy = true;
    saveBtn.disabled = true;
    note.textContent = '';
    try {
      // iOS bendrinimo langą leidžia atidaryti tik iškart po paspaudimo – naudojam jau paruoštą paveikslėlį.
      const blob = ready && ready.token === renderToken ? ready.blob : await render();
      const res = blob ? await saveImage(blob, filename) : 'cancel';
      if (res === 'cancel') {
        note.textContent = '';
      } else {
        sfx('correct');
        note.textContent = res === 'shared' ? 'Išsaugota!' : 'Piešinys atsisiųstas. Telefone galima ir paspausti bei palaikyti paveikslėlį.';
        setTimeout(close, 900);
      }
    } catch {
      note.textContent = 'Nepavyko – paspauskite ir palaikykite paveikslėlį viršuje, tada „Išsaugoti nuotrauką“.';
    } finally {
      busy = false;
      saveBtn.disabled = false;
    }
  });

  sync();
  return { close };
}
