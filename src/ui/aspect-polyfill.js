// iOS 14 (Safari < 15) nepalaiko CSS `aspect-ratio` – be jo kai kurios dėžutės sukrinta į 0 aukščio
// (dingsta veikėjai, kryžiukų lenta, debesėliai). Čia tik tiems elementams apskaičiuojam trūkstamą matmenį.
// Naujesnėse naršyklėse nieko nedaro.

// [selektorius, plotis / aukštis, kuris matmuo žinomas: 'w' – plotis (skaičiuojam aukštį), 'h' – aukštis]
const RULES = [
  ['.start-hero', 1, 'w'],
  ['.card-img', 1, 'h'],
  ['.letter-card', 1, 'w'],
  ['.mem-card', 1, 'w'],
  ['.avatar-card', 1, 'w'],
  ['.cloud', 220 / 120, 'w'],
  ['.cloud-choices .num-btn', 1, 'w'],
  ['.ttt-grid', 1, 'w'],
  ['.run-pick-btn img', 1, 'w'],
];

export function aspectPolyfill() {
  // ?noar – imituoja iOS 14 (aspect-ratio išjungiamas), kad pakaitalą būtų galima patikrinti kompiuteryje.
  const simulate = /[?&]noar\b/.test(location.search);
  if (simulate) document.head.append(Object.assign(document.createElement('style'), { textContent: '*{aspect-ratio:auto!important}' }));
  else if (typeof CSS !== 'undefined' && CSS.supports?.('aspect-ratio', '1 / 1')) return;
  if (!('ResizeObserver' in window)) return;
  const watched = new WeakSet();
  const ro = new ResizeObserver((entries) => {
    for (const { target } of entries) fit(target);
  });
  const fit = (el) => {
    const rule = el._ar;
    if (!rule) return;
    const [, ratio, known] = rule;
    if (known === 'w') {
      const w = el.getBoundingClientRect().width;
      if (w) el.style.height = `${Math.round(w / ratio)}px`;
    } else {
      const hh = el.getBoundingClientRect().height;
      if (hh) el.style.width = `${Math.round(hh * ratio)}px`;
    }
  };
  const watch = (el, rule) => {
    if (watched.has(el)) return;
    watched.add(el);
    el._ar = rule;
    ro.observe(el);
    fit(el);
  };
  const scan = (root) => {
    for (const rule of RULES) {
      if (root.matches?.(rule[0])) watch(root, rule);
      root.querySelectorAll?.(rule[0]).forEach((el) => watch(el, rule));
    }
  };
  scan(document);
  new MutationObserver((muts) => {
    for (const m of muts) m.addedNodes.forEach((n) => n.nodeType === 1 && scan(n));
  }).observe(document.body, { childList: true, subtree: true });
}
