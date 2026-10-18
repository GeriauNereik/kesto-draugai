// Maži DOM pagalbininkai.
export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** Paspaudimas, kuris reaguoja greitai ir neleidžia "dvigubo" paspaudimo. */
export function onTap(el, fn) {
  let last = 0;
  el.addEventListener('click', (e) => {
    const now = Date.now();
    if (now - last < 350) return;
    last = now;
    fn(e);
  });
  return el;
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Vienkartinė reakcija (dabar per GSAP, žr. motion.js). */
export { pulse } from './motion.js';
