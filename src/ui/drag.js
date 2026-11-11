// Tempimas pirštu, veikiantis visuose telefonuose: kur yra Pointer Events (iOS 13+, Android) – juos,
// senesniuose iPhone (iOS 12, pvz. iPhone 6) – touch įvykius, kompiuteryje be jų – pelę.
// Naudojimas:
//   onDrag(el, {
//     start(p, e) {...}   // p = { x, y } (ekrano koordinatės); grąžinus false – tempimas nepradedamas
//     move(p, e) {...}
//     end(p, e) {...}     // ir atšaukus (pvz. skambutis) – tada p yra paskutinė žinoma vieta
//   })
// Grąžina funkciją, kuri nuima klausytojus.
const HAS_POINTER = typeof window !== 'undefined' && 'PointerEvent' in window;

export function onDrag(el, { start, move, end }) {
  let active = false;
  let last = { x: 0, y: 0 };
  let pid = null;

  const begin = (p, e) => {
    if (active) return false;
    if (start && start(p, e) === false) return false;
    active = true;
    last = p;
    return true;
  };
  const go = (p, e) => {
    if (!active) return;
    last = p;
    move?.(p, e);
  };
  const finish = (p, e) => {
    if (!active) return;
    active = false;
    end?.(p || last, e);
  };

  if (HAS_POINTER) {
    const pm = (e) => e.pointerId === pid && go({ x: e.clientX, y: e.clientY }, e);
    const pu = (e) => {
      if (e.pointerId !== pid) return;
      cleanup();
      finish(e.type === 'pointercancel' ? null : { x: e.clientX, y: e.clientY }, e);
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', pm);
      window.removeEventListener('pointerup', pu);
      window.removeEventListener('pointercancel', pu);
    };
    const pd = (e) => {
      if (e.button > 0) return;
      if (!begin({ x: e.clientX, y: e.clientY }, e)) return;
      e.preventDefault();
      pid = e.pointerId;
      window.addEventListener('pointermove', pm);
      window.addEventListener('pointerup', pu);
      window.addEventListener('pointercancel', pu);
    };
    el.addEventListener('pointerdown', pd);
    return () => {
      el.removeEventListener('pointerdown', pd);
      cleanup();
    };
  }

  // --- senesni iPhone: touch įvykiai (passive: false – kad puslapis neslinktų tempiant) ---
  const pt = (t) => ({ x: t.clientX, y: t.clientY });
  let tid = null;
  const find = (list) => [...list].find((t) => t.identifier === tid);
  const tm = (e) => {
    const t = find(e.changedTouches);
    if (!t) return;
    e.preventDefault();
    go(pt(t), e);
  };
  const tu = (e) => {
    const t = find(e.changedTouches);
    if (!t) return;
    tcleanup();
    finish(e.type === 'touchcancel' ? null : pt(t), e);
  };
  const tcleanup = () => {
    document.removeEventListener('touchmove', tm);
    document.removeEventListener('touchend', tu);
    document.removeEventListener('touchcancel', tu);
  };
  const ts = (e) => {
    const t = e.changedTouches[0];
    if (!t || !begin(pt(t), e)) return;
    e.preventDefault(); // kitaip iOS 12 slenka puslapį ir „suvalgo“ tempimą
    tid = t.identifier;
    document.addEventListener('touchmove', tm, { passive: false });
    document.addEventListener('touchend', tu);
    document.addEventListener('touchcancel', tu);
  };
  // pelė (kompiuteris be Pointer Events)
  const mm = (e) => go({ x: e.clientX, y: e.clientY }, e);
  const mu = (e) => {
    document.removeEventListener('mousemove', mm);
    document.removeEventListener('mouseup', mu);
    finish({ x: e.clientX, y: e.clientY }, e);
  };
  const md = (e) => {
    if (e.button > 0 || !begin({ x: e.clientX, y: e.clientY }, e)) return;
    e.preventDefault();
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
  };
  el.addEventListener('touchstart', ts, { passive: false });
  el.addEventListener('mousedown', md);
  return () => {
    el.removeEventListener('touchstart', ts);
    el.removeEventListener('mousedown', md);
    tcleanup();
  };
}
