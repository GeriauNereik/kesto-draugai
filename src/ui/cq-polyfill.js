// iOS < 16 (pvz. iPhone 6s/7 – daugiausia iOS 15) nepalaiko CSS konteinerio vienetų cqw/cqh.
// Stiliuose jie užrašyti kaip var(--cqw) / var(--cqh); naujose naršyklėse tai tikri 1cqw / 1cqh,
// o čia kiekvienam konteineriui (container-type: size) pikseliais nustatom 1 % jo pločio ir aukščio –
// vaikai kintamuosius paveldi. Be to žaidimų lentos būtų per didelės ir netilptų ekrane.

// Elementai, kuriems style.css nustatyta `container-type: size`
const CONTAINERS = [
  '.board',
  '.char-frame',
  '.card-img',
  '.letters-holder',
  '.letter-card',
  '.start-hero',
  '.clock-wrap',
  '.ttt-game',
  '.sort-wrap',
  '.traffic-wrap',
  '.sdk-wrap',
  '.path-wrap',
  '.pipe-wrap',
].join(',');

export function cqPolyfill() {
  // ?nocq – imituoja seną Safari kompiuteryje (kad pakaitalą būtų galima patikrinti)
  const simulate = /[?&]nocq\b/.test(location.search);
  if (simulate) document.head.append(Object.assign(document.createElement('style'), { textContent: ':root{--cqw:1vw!important;--cqh:1vh!important}' }));
  else if (typeof CSS !== 'undefined' && CSS.supports?.('width', '1cqw')) return;
  if (!('ResizeObserver' in window) || !('MutationObserver' in window)) return;
  // container-type: size reiškia ir „dydis nepriklauso nuo turinio“ – be jo lenta išpūstų konteinerį ratu
  document.head.append(Object.assign(document.createElement('style'), { textContent: `${CONTAINERS}{contain:size layout;min-width:0;min-height:0}` }));

  const watched = new WeakSet();
  const ro = new ResizeObserver((entries) => {
    for (const { target, contentRect } of entries) set(target, contentRect.width, contentRect.height);
  });
  const set = (el, w, hh) => {
    el.style.setProperty('--cqw', `${w / 100}px`);
    el.style.setProperty('--cqh', `${hh / 100}px`);
  };
  const watch = (el) => {
    if (watched.has(el)) return;
    watched.add(el);
    // iškart (kad pirmas kadras nebūtų per didelis), toliau – ResizeObserver
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const px = (v) => parseFloat(v) || 0;
    set(el, r.width - px(cs.paddingLeft) - px(cs.paddingRight) - px(cs.borderLeftWidth) - px(cs.borderRightWidth), r.height - px(cs.paddingTop) - px(cs.paddingBottom) - px(cs.borderTopWidth) - px(cs.borderBottomWidth));
    ro.observe(el);
  };
  const scan = (node) => {
    if (node.nodeType !== 1) return;
    if (node.matches(CONTAINERS)) watch(node);
    node.querySelectorAll(CONTAINERS).forEach(watch);
  };
  scan(document.body);
  new MutationObserver((list) => {
    for (const m of list) m.addedNodes.forEach(scan);
  }).observe(document.body, { childList: true, subtree: true });
}
