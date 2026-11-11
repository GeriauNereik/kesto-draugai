import { h } from '../ui/dom.js';
import { button } from '../ui/button.js';
import { character } from '../ui/speech-bubble.js';
import { sfx } from '../sfx.js';

const IMG = `${import.meta.env.BASE_URL}assets/characters/tadas-jump/`;
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Judesio pertraukėlė: Tadas šokinėja per kartelę (į vieną ir į kitą pusę), vaikas šokinėja kartu,
 * o šuoliai skaičiuojami (5 taškeliai užsipildo). Kadrai – Magnific iliustracijos (tadas-jump/).
 */
export function breakScreen(root, { onDone }) {
  // veikėjas lieka dėl kalbos burbulo; pats Tadas – šokinėjantis per kartelę
  const tadas = character('tadas', { emotion: 'happy', size: 'lg', onTapChar: () => tadas.speak('phrases/tadas_pertrauka') });
  tadas.el.classList.add('break-talk');
  const deer = h('img', { class: 'tadas-deer', src: `${IMG}ready.webp`, alt: 'Stirniukas Tadas šokinėja', draggable: 'false' });
  const stage = h('div', { class: 'tadas-stage' }, [h('img', { class: 'tadas-pole', src: `${IMG}pole.webp`, alt: '', draggable: 'false' }), deer]);
  stage.addEventListener('click', () => tadas.speak('phrases/tadas_pertrauka'));
  new Image().src = `${IMG}jump.webp`;
  const dots = h('div', { class: 'jump-dots', 'aria-hidden': 'true' }, Array.from({ length: 5 }, () => h('span')));
  root.append(
    h('section', { class: 'screen break' }, [
      h('div', { class: 'break-char' }, [tadas.el, stage, dots]),
      h('div', { class: 'result-actions' }, [
        button({ label: 'Padariau!', icon: 'check', cls: 'btn-xl', onClick: onDone }),
        button({ label: 'Praleisti', icon: 'skip', variant: 'ghost', onClick: onDone }),
      ]),
    ])
  );
  // Tadas šokinėja per kartelę pirmyn ir atgal (kas ~1,2 s), kol ekranas atidarytas
  let hopping = true;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  (async () => {
    let dir = 1; // 1 – iš kairės į dešinę
    while (hopping && stage.isConnected) {
      const flip = dir > 0 ? 1 : -1;
      const from = dir > 0 ? 0 : 100;
      const to = dir > 0 ? 100 : 0;
      deer.src = `${IMG}ready.webp`;
      deer.style.setProperty('--x', from);
      deer.style.transform = `scaleX(${flip})`;
      await sleep(420);
      if (!hopping || !stage.isConnected) break;
      deer.src = `${IMG}jump.webp`;
      if (!reduced()) {
        const w = stage.clientWidth * 0.7; // kiek nušoka
        const hgt = stage.clientHeight * 0.42;
        const a = deer.animate(
          [
            { transform: `translate(0, 0) scaleX(${flip})` },
            { transform: `translate(${(dir * w) / 2}px, ${-hgt}px) scaleX(${flip}) rotate(${-6 * dir}deg)`, offset: 0.5 },
            { transform: `translate(${dir * w}px, 0) scaleX(${flip})` },
          ],
          { duration: 680, easing: 'cubic-bezier(.35,.0,.65,1)' }
        );
        await a.finished.catch(() => {});
      } else await sleep(680);
      deer.style.setProperty('--x', to);
      deer.src = `${IMG}ready.webp`;
      dir = -dir;
      await sleep(100);
    }
  })();

  // Taškeliai (ir "tuk") skaičiuojami tik Tadui baigus kalbėti – kad garsai nelįstų vienas ant kito.
  let n = 0;
  let timer = null;
  tadas.speak('phrases/tadas_pertrauka').then(() => {
    if (!dots.isConnected) return;
    timer = setInterval(() => {
      if (!dots.isConnected || n >= 5) return clearInterval(timer);
      dots.children[n++].classList.add('on');
      sfx('knock', n);
    }, 1200);
  });
  return () => {
    hopping = false;
    clearInterval(timer);
  };
}
