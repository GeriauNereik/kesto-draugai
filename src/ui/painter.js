// Piešimo drobė: teptukai (pieštukas, flomasteris, kreidelė, purškiklis, vaivorykštė), trintukas,
// užliejimas, veidrodinis piešimas ir atšaukimas. Piešiama pirštu, pele ar pieštuku (Pointer Events).
//
//   const p = createPainter(canvas, { onChange });
//   p.set({ tool: 'marker', color: '#e53935', size: 10, mirror: false });
//   p.undo(); p.clear(); p.destroy();

const MAX_UNDO = 8; // kiekvienas žingsnis – visos drobės kopija, todėl ribojam (iPhone atmintis)
const BG = '#ffffff';

export function createPainter(canvas, { onChange } = {}) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const opt = { tool: 'marker', color: '#e53935', size: 10, mirror: false };
  const undoStack = [];
  let w = 0; // CSS pikseliais
  let h = 0;
  let drawing = null; // { id, last, hue, sprayTimer }
  let strokes = 0;

  // ---------- dydis ----------
  function resize() {
    const r = canvas.getBoundingClientRect();
    const nw = Math.max(1, Math.round(r.width));
    const nh = Math.max(1, Math.round(r.height));
    if (nw === w && nh === h) return;
    // Išsaugom esamą piešinį ir perkeliam į naujo dydžio drobę.
    let old = null;
    if (w && h) {
      old = document.createElement('canvas');
      old.width = canvas.width;
      old.height = canvas.height;
      old.getContext('2d').drawImage(canvas, 0, 0);
    }
    w = nw;
    h = nh;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (old) ctx.drawImage(old, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    undoStack.length = 0;
  }

  // ---------- atšaukimas ----------
  function snapshot() {
    try {
      undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (undoStack.length > MAX_UNDO) undoStack.shift();
    } catch {
      /* per mažai atminties – be atšaukimo */
    }
  }
  function undo() {
    const img = undoStack.pop();
    if (!img) return false;
    ctx.putImageData(img, 0, 0);
    strokes = Math.max(0, strokes - 1);
    onChange?.({ strokes, canUndo: undoStack.length > 0 });
    return true;
  }
  function clear({ keepUndo = true } = {}) {
    if (keepUndo) snapshot();
    else undoStack.length = 0;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    if (!keepUndo) strokes = 0;
    onChange?.({ strokes, canUndo: undoStack.length > 0 });
  }

  // ---------- teptukai ----------
  const mirrorPt = (p) => ({ x: w - p.x, y: p.y });
  const line = (a, b, width, color, alpha = 1) => {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  };
  const dots = (cx, cy, radius, n, color, size, alpha) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      ctx.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, size, size);
    }
    ctx.globalAlpha = 1;
  };

  /** Vienas teptuko žingsnis nuo a iki b (be veidrodžio). */
  function paint(a, b) {
    const s = opt.size;
    switch (opt.tool) {
      case 'pencil':
        return line(a, b, Math.max(1.5, s * 0.45), opt.color);
      case 'marker':
        return line(a, b, s * 1.4, opt.color, 0.95);
      case 'eraser':
        return line(a, b, s * 2.4, BG);
      case 'rainbow': {
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        drawing.hue = (drawing.hue + d * 0.7) % 360;
        return line(a, b, s * 1.4, `hsl(${drawing.hue}, 90%, 55%)`);
      }
      case 'crayon': {
        // Kreidelė: daug smulkių taškelių – grubi, popieriaus tekstūra
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        const steps = Math.max(1, Math.ceil(d / 1.5));
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          dots(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, s * 0.75, Math.ceil(s * 0.9), opt.color, 1.6, 0.45);
        }
        return;
      }
      case 'spray':
        return dots(b.x, b.y, s * 2.4, Math.ceil(s * 2), opt.color, 1.4, 0.8);
      default:
    }
  }
  function stroke(a, b) {
    paint(a, b);
    if (opt.mirror) paint(mirrorPt(a), mirrorPt(b));
  }

  // ---------- užliejimas (eilutėmis, įrenginio pikseliais) ----------
  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function floodFill(px, py, hex) {
    const W = canvas.width;
    const H = canvas.height;
    const x0 = Math.round(px * dpr);
    const y0 = Math.round(py * dpr);
    if (x0 < 0 || y0 < 0 || x0 >= W || y0 >= H) return;
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    const i0 = (y0 * W + x0) * 4;
    const [tr, tg, tb] = [d[i0], d[i0 + 1], d[i0 + 2]];
    const [fr, fg, fb] = hexToRgb(hex);
    if (Math.abs(tr - fr) + Math.abs(tg - fg) + Math.abs(tb - fb) < 8) return;
    const TOL = 90; // sugeria ir švelnius linijų kraštus
    const match = (i) => Math.abs(d[i] - tr) + Math.abs(d[i + 1] - tg) + Math.abs(d[i + 2] - tb) <= TOL;
    const seen = new Uint8Array(W * H);
    const stack = [x0, y0];
    while (stack.length) {
      const y = stack.pop();
      let x = stack.pop();
      let i = y * W + x;
      while (x >= 0 && !seen[i] && match(i * 4)) {
        x--;
        i--;
      }
      x++;
      i++;
      let up = false;
      let down = false;
      while (x < W && !seen[i] && match(i * 4)) {
        seen[i] = 1;
        const k = i * 4;
        d[k] = fr;
        d[k + 1] = fg;
        d[k + 2] = fb;
        d[k + 3] = 255;
        if (y > 0) {
          const u = i - W;
          if (!seen[u] && match(u * 4)) {
            if (!up) {
              stack.push(x, y - 1);
              up = true;
            }
          } else up = false;
        }
        if (y < H - 1) {
          const dn = i + W;
          if (!seen[dn] && match(dn * 4)) {
            if (!down) {
              stack.push(x, y + 1);
              down = true;
            }
          } else down = false;
        }
        x++;
        i++;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  // ---------- pirštas / pelė ----------
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  function down(e) {
    if (drawing || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    resize();
    snapshot();
    const p = pos(e);
    if (opt.tool === 'bucket') {
      floodFill(p.x, p.y, opt.color);
      if (opt.mirror) floodFill(w - p.x, p.y, opt.color);
      strokes++;
      onChange?.({ strokes, canUndo: true });
      return;
    }
    canvas.setPointerCapture?.(e.pointerId);
    drawing = { id: e.pointerId, last: p, hue: Math.random() * 360, sprayTimer: null };
    stroke(p, { x: p.x + 0.01, y: p.y }); // taškas be judesio
    if (opt.tool === 'spray') {
      drawing.sprayTimer = setInterval(() => drawing && stroke(drawing.last, drawing.last), 40);
    }
  }
  function move(e) {
    if (!drawing || e.pointerId !== drawing.id) return;
    e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of evs.length ? evs : [e]) {
      const p = pos(ev);
      stroke(drawing.last, p);
      drawing.last = p;
    }
  }
  function up(e) {
    if (!drawing || e.pointerId !== drawing.id) return;
    clearInterval(drawing.sprayTimer);
    drawing = null;
    strokes++;
    onChange?.({ strokes, canUndo: undoStack.length > 0 });
  }

  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  const ro = 'ResizeObserver' in window ? new ResizeObserver(() => resize()) : null;
  ro?.observe(canvas);
  window.addEventListener('resize', resize);
  resize();

  return {
    set(o) {
      Object.assign(opt, o);
    },
    get options() {
      return { ...opt };
    },
    get strokes() {
      return strokes;
    },
    undo,
    clear,
    resize,
    /** Naujas piešinys: švari drobė be atšaukimo istorijos. */
    reset() {
      clear({ keepUndo: false });
    },
    destroy() {
      ro?.disconnect();
      window.removeEventListener('resize', resize);
      if (drawing) clearInterval(drawing.sprayTimer);
    },
  };
}
