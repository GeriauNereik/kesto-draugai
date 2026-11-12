// Piešinio išsaugojimas: peržiūra, stilizuota juostelė apačioje su savo tekstu, išsaugojimas į telefoną.
// Telefone – bendrinimo langas (iOS: „Išsaugoti vaizdą“ → Nuotraukos), kompiuteryje – atsisiuntimas.
import { h, onTap } from './dom.js';
import { ICONS } from './icons.js';
import { sfx } from '../sfx.js';
import { pulse } from './motion.js';

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

// iOS / iPadOS (įskaitant iPad, kuris prisistato kaip „Mac“ su lietimu)
const isIOS = () => /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

/**
 * Išsaugo paveikslėlį.
 * Grąžina 'shared' | 'downloaded' | 'cancel' | 'manual' (nepavyko – galima bandyti dar kartą arba palaikyti peržiūrą)
 * | 'longpress' (telefonas bendrinimo nepalaiko – tik palaikyti peržiūrą).
 * Svarbu: iOS bendrinimo langą leidžia atidaryti tik iškart po paspaudimo, todėl prieš navigator.share negali būti jokio laukimo.
 * Nesėkmės atveju iOS NEnaudojam <a download> – programėlėje (pridėtoje prie pradžios ekrano) tai atidaro naršyklę su svetaine.
 */
export async function saveImage(blob, filename) {
  const file = new File([blob], filename, { type: 'image/png' });
  let canShare = false;
  try {
    canShare = !!navigator.canShare?.({ files: [file] });
  } catch {
    canShare = false;
  }
  if (canShare) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancel';
      // NotAllowedError / InvalidStateError ir pan.
      if (isIOS() || isStandalone()) return 'manual';
    }
  } else if (isIOS()) {
    return 'longpress';
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return 'downloaded';
}

/**
 * Išsaugojimo langas su peržiūra.
 * Būsenos: preparing (ruošiamas paveikslėlis) → ready → saving → done | error (galima bandyti dar kartą).
 * canvas – piešimo drobė; defaultText – pradinis juostelės tekstas; filename – failo vardas.
 */
export function openSaveSheet({ canvas, defaultText = '', filename = 'piesinys.png', onClose }) {
  let style = 'miskas';
  let withBanner = true;
  let state = 'preparing';
  let closed = false;

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
  const saveLabel = h('span', { class: 'btn-label', text: 'Išsaugoti' });
  const saveBtn = h('button', { type: 'button', class: 'btn btn-primary btn-xl save-go' }, [h('span', { class: 'btn-icon', html: ICONS.download || ICONS.check }), saveLabel]);
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

  const LABELS = { preparing: 'Ruošiama…', ready: 'Išsaugoti', saving: 'Saugoma…', done: 'Išsaugota!', error: 'Bandyti dar kartą' };
  function setState(s, msg = '') {
    state = s;
    card.dataset.state = s;
    saveLabel.textContent = LABELS[s];
    saveBtn.disabled = s === 'preparing' || s === 'saving' || s === 'done';
    note.textContent = msg;
    note.classList.toggle('err', s === 'error');
  }

  let previewUrl = null;
  let renderToken = 0;
  let blob = null; // paruoštas paveikslėlis – išsaugojimas prasideda iškart po paspaudimo
  async function render() {
    const my = ++renderToken;
    blob = null;
    if (state !== 'saving' && state !== 'done') setState('preparing');
    try {
      const out = await composeDrawing(canvas, withBanner ? { style, text: input.value } : null);
      if (my !== renderToken || closed) return;
      const b = await toBlob(out);
      if (my !== renderToken || closed) return;
      if (!b) throw new Error('toBlob');
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(b);
      preview.src = previewUrl;
      blob = b;
      if (state === 'preparing') setState('ready');
    } catch {
      if (my === renderToken && !closed) setState('error', 'Nepavyko paruošti paveikslėlio. Bandyk dar kartą.');
    }
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
    blob = null;
    setState('preparing');
    t = setTimeout(render, 150);
  });
  input.addEventListener('keydown', (e) => e.key === 'Enter' && input.blur());
  onTap(sw, () => {
    sfx('tap');
    withBanner = !withBanner;
    sync();
  });

  function close() {
    if (closed) return;
    closed = true;
    clearTimeout(t);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    sheet.remove();
    onClose?.();
  }
  onTap(cancelBtn, () => (sfx('tap'), close()));
  sheet.addEventListener('click', (e) => e.target === sheet && close());

  // Paspaudimas tvarkomas tiesiogiai per 'click' – kad iOS laikytų jį vartotojo veiksmu ir leistų bendrinimą.
  saveBtn.addEventListener('click', async () => {
    if (state !== 'ready' && state !== 'error') return;
    if (!blob) {
      render();
      return;
    }
    setState('saving');
    let res;
    try {
      res = await saveImage(blob, filename);
    } catch {
      res = 'manual';
    }
    if (closed) return;
    if (res === 'cancel') return setState('ready');
    if (res === 'manual') {
      return setState('error', 'Nepavyko atidaryti išsaugojimo. Spausk „Bandyti dar kartą“ arba palaikyk pirštą ant paveikslėlio → „Įtraukti į Nuotraukas“.');
    }
    if (res === 'longpress') {
      // senesnis telefonas – išsaugoti galima tik palaikius pirštą ant peržiūros
      setState('ready', 'Palaikyk pirštą ant paveikslėlio viršuje ir pasirink „Įtraukti į Nuotraukas“.');
      card.dataset.state = 'longpress';
      pulse(preview, 'bump');
      return;
    }
    sfx('correct');
    setState('done', res === 'shared' ? 'Išsaugota!' : 'Piešinys atsisiųstas.');
    setTimeout(close, 900);
  });

  sync();
  return { close };
}
