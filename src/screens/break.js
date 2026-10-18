import { h } from '../ui/dom.js';
import { button } from '../ui/button.js';
import { character } from '../ui/speech-bubble.js';
import { sfx } from '../sfx.js';

/** Judesio pertraukėlė: Tadas šokinėja, vaikas skaičiuoja šuolius kartu (5 taškeliai užsipildo). */
export function breakScreen(root, { onDone }) {
  const tadas = character('tadas', { emotion: 'happy', size: 'lg', onTapChar: () => tadas.speak('phrases/tadas_pertrauka') });
  const dots = h('div', { class: 'jump-dots', 'aria-hidden': 'true' }, Array.from({ length: 5 }, () => h('span')));
  root.append(
    h('section', { class: 'screen break' }, [
      h('div', { class: 'break-char' }, [tadas.el, dots]),
      h('div', { class: 'result-actions' }, [
        button({ label: 'Padariau!', icon: 'check', cls: 'btn-xl', onClick: onDone }),
        button({ label: 'Praleisti', icon: 'skip', variant: 'ghost', onClick: onDone }),
      ]),
    ])
  );
  // Tadas šokinėja (kas ~1,2 s), kol ekranas atidarytas
  let hopping = true;
  (async () => {
    while (hopping && tadas.el.isConnected) await tadas.rig.play('happy');
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
