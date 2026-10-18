// Ona: „Rask porą“.
import { h, onTap, shuffle, wait } from '../ui/dom.js';
import { gameShell } from '../ui/game-shell.js';
import { createRound, SFX_GAP, afterPraise, intro } from './common.js';
import { charPortrait, itemImg, FRIENDS, ITEMS } from '../config/characters.js';
import { MEMORY_PAIRS, memorySeconds } from '../config/games.js';
import { timerBar } from '../ui/timer.js';
import { randomPraise } from '../config/phrases.js';
import { sfx } from '../sfx.js';
import { burst, stagger } from '../ui/fx.js';

const LEAF_BACK = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <path d="M50 16C30 30 26 56 50 84 74 56 70 30 50 16z" fill="#7fd36b" stroke="#2E9A48" stroke-width="3" stroke-linejoin="round"/>
  <path d="M50 24v58M50 44l-11-8M50 44l11-8M50 60l-13-9M50 60l13-9" stroke="#2E9A48" stroke-width="3" stroke-linecap="round" fill="none"/>
</svg>`;

/** Žvaigždutės pagal papildomus bandymus (bandymai − poros). */
export function memoryStars(extraAttempts, pairs) {
  const k = pairs <= 3 ? 1 : 2; // daugiau porų – daugiau leidžiama bandyti
  if (extraAttempts <= 2 * k) return 3;
  if (extraAttempts <= 5 * k) return 2;
  return 1;
}

export function memoryGame(root, { level, onHome, onFinish }) {
  const pairs = MEMORY_PAIRS[level - 1] || MEMORY_PAIRS[0];
  // Kortelės: miško draugai (be vedlės Onos) ir miško daiktai.
  const faces = [...FRIENDS.map((id) => ({ id, src: charPortrait(id) })), ...ITEMS.map((id) => ({ id, src: itemImg(id) }))];
  const srcOf = Object.fromEntries(faces.map((f) => [f.id, f.src]));
  const ids = shuffle(faces).slice(0, pairs).map((f) => f.id);
  const deck = shuffle([...ids, ...ids]);
  let open = [];
  let found = 0;
  let attempts = 0;

  const prompt = () => {
    shell.char.setEmotion('think');
    shell.char.speak('phrases/veja_intro');
  };
  const shell = gameShell(root, { charId: 'veja', total: pairs, onHome, onRepeat: prompt });
  const round = createRound(shell);
  // Laikas visam žaidimui – juosta virš kortelių; nespėjus surasti visų porų lygis nepavyksta.
  const timer = timerBar();
  timer.el.hidden = true;
  shell.screen.querySelector('.topbar').after(timer.el);
  const timeUp = async () => {
    round.busy = true;
    sfx('wrong');
    shell.char.setEmotion('encourage');
    shell.char.speak('phrases/laikas_baigesi');
    await wait(1600);
    if (round.alive) onFinish({ failed: true });
  };

  async function flip(card) {
    if (round.busy || card.classList.contains('flipped')) return;
    card.classList.add('flipped');
    sfx('flip');
    open.push(card);
    if (open.length < 2) return;

    round.busy = true;
    attempts++;
    const [a, b] = open;
    open = [];
    if (a.dataset.id === b.dataset.id) {
      a.classList.add('matched');
      b.classList.add('matched');
      sfx('correct');
      setTimeout(() => (burst(a, { count: 8 }), burst(b, { count: 8 })), 250);
      found++;
      shell.setProgress(found);
      shell.char.setEmotion('happy');
      const spoken = shell.char.speak(`phrases/${randomPraise()}`, undefined, { delay: SFX_GAP });
      if (found === pairs) {
        timer.stop();
        await afterPraise(spoken); // paskutinis pagyrimas nenutraukiamas rezultato ekrano
        if (!round.alive) return;
        return onFinish({ stars: memoryStars(attempts - pairs, pairs) });
      }
      await wait(500);
      round.busy = false;
    } else {
      await wait(1000);
      if (!round.alive) return;
      a.classList.remove('flipped');
      b.classList.remove('flipped');
      sfx('flip');
      shell.char.setEmotion('think');
      round.busy = false;
    }
  }

  const grid = h('div', { class: `memory-grid p${pairs}` });
  deck.forEach((id) => {
    const card = h('button', { type: 'button', class: 'mem-card', 'data-id': id, 'aria-label': 'Kortelė' }, [
      h('div', { class: 'mem-inner' }, [
        h('div', { class: 'mem-face mem-back', html: LEAF_BACK }),
        h('div', { class: 'mem-face mem-front' }, h('img', { src: srcOf[id], alt: '', draggable: 'false' })),
      ]),
    ]);
    onTap(card, () => flip(card));
    grid.append(card);
  });
  // Pirma paaiškinimas, pauzė, tada kortelės išdalinamos.
  intro(shell, round, 'phrases/veja_intro').then((ok) => {
    if (!ok) return;
    shell.board.append(stagger(grid, 60, 0, 'deal'));
    sfx('whoosh');
    timer.start(memorySeconds(pairs), timeUp);
  });

  return () => {
    timer.destroy();
    round.destroy();
  };
}
