import { h, wait } from '../ui/dom.js';
import { button } from '../ui/button.js';
import { character } from '../ui/speech-bubble.js';
import { stars } from '../ui/stars.js';
import { ICONS } from '../ui/icons.js';
import { sfx } from '../sfx.js';
import { burst, celebrate } from '../ui/fx.js';
import { popStars, appear } from '../ui/motion.js';

export function resultScreen(root, { game, starCount, isBest, failed = false, onAgain, onNext, onMenu }) {
  const char = character(game.char, { emotion: failed ? 'encourage' : 'happy', size: 'lg' });
  const actions = h('div', { class: 'result-actions' }, [
    onNext && !failed ? button({ label: 'Kitas lygis', icon: 'next', cls: 'btn-xl', onClick: onNext }) : null,
    button({ label: failed ? 'Bandyk dar' : 'Žaisti dar', icon: 'replay', variant: onNext && !failed ? 'secondary' : 'primary', cls: 'btn-xl', onClick: onAgain }),
    button({ label: 'Į meniu', icon: 'home', variant: 'secondary', cls: 'btn-xl', onClick: onMenu }),
  ]);

  if (failed) {
    // Lygis nepereitas (pvz. baigėsi gyvybės): be žvaigždučių, švelnus padrąsinimas.
    root.append(
      h('section', { class: 'screen result' }, [
        h('div', { class: 'result-char' }, char.el),
        h('div', { class: 'result-side' }, [h('div', { class: 'result-fail', text: 'Šįkart nepavyko' }), actions]),
      ])
    );
    char.speak('phrases/nepavyko', 'Šįkart nepavyko. Pabandyk dar kartą!', { delay: 400 });
    char.rig.play('encourage');
    return;
  }

  const starsEl = stars(starCount, { size: 'lg' });
  const gain = h('div', { class: 'gain', html: `+${starCount} ${ICONS.star}` });
  const best = isBest ? h('div', { class: 'best', text: 'Naujas rekordas!' }) : null;
  root.append(
    h('section', { class: 'screen result' }, [
      h('div', { class: 'result-char' }, char.el),
      h('div', { class: 'result-side' }, [starsEl, gain, best, actions]),
    ])
  );
  // Garsai po vieną: fanfaros, tada žvaigždutės (0,35 s + 0,3 s kiekviena), tada balsas.
  sfx('fanfare');
  char.speak(`phrases/baigta_${starCount}`, undefined, { delay: 900 + starCount * 300 });
  celebrate();

  // Veikėjas pašoka tris kartus iš eilės, tada nurimsta
  (async () => {
    for (let k = 0; k < 3 && char.el.isConnected; k++) await char.rig.play('happy');
  })();
  // Žvaigždutės iššoka po vieną su skambesiu ir pliūpsniu.
  popStars([...starsEl.querySelectorAll('.star.on')], {
    delay: 0.5,
    onEach: (star, i) => {
      if (!star.isConnected) return;
      sfx('star', i);
      setTimeout(() => burst(star, { count: 8, spread: 70 }), 150);
    },
  });
  appear(gain, 1.1);
  appear(best, 1.4);
}
