// Ona: „Rask porą“.
import { h, onTap, shuffle, wait } from '../ui/dom.js';
import { gameShell } from '../ui/game-shell.js';
import { createRound, SFX_GAP, afterPraise, intro } from './common.js';
import { charPortrait, itemImg, FRIENDS, ITEMS } from '../config/characters.js';
import { MEMORY_LEVELS } from '../config/games.js';
import { timerBar } from '../ui/timer.js';
import { randomPraise } from '../config/phrases.js';
import { sfx } from '../sfx.js';
import { burst, stagger } from '../ui/fx.js';

const EXTRA_FACES = ['cards/clock', 'cards/clouds', 'brain/path/home', 'brain/pipes/barrel', 'brain/pipes/tub', 'cards/grade2'];

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
  const L = MEMORY_LEVELS[level - 1] || MEMORY_LEVELS[0];
  const { pairs } = L;
  // Kortelės: miško draugai (be vedlės Onos), miško daiktai ir kitos žaidimo iliustracijos (kad užtektų 15 porų).
  const faces = [
    ...FRIENDS.map((id) => ({ id, src: charPortrait(id) })),
    ...ITEMS.map((id) => ({ id, src: itemImg(id) })),
    ...EXTRA_FACES.map((f) => ({ id: f, src: `${import.meta.env.BASE_URL}assets/${f}.webp` })),
  ];
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
  let over = false; // laikas baigėsi – daugiau kortelių nebeverčiam
  const timeUp = async () => {
    over = true;
    round.busy = true;
    sfx('wrong');
    shell.char.setEmotion('encourage');
    shell.char.speak('phrases/laikas_baigesi');
    await wait(1600);
    if (round.alive) onFinish({ failed: true });
  };

  async function flip(card) {
    if (over || round.busy || card.classList.contains('flipped')) return;
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
      if (!over) round.busy = false;
    } else {
      await wait(1000);
      if (!round.alive) return;
      a.classList.remove('flipped');
      b.classList.remove('flipped');
      sfx('flip');
      shell.char.setEmotion('think');
      if (L.swap) {
        await wait(450);
        if (!round.alive) return;
        swapTwo();
        await wait(500);
      }
      if (!over) round.busy = false;
    }
  }

  /** „Maišosi“: dvi atsitiktinės uždaros kortelės sklandžiai susikeičia vietomis. */
  function swapTwo() {
    const closed = [...grid.children].filter((c) => !c.classList.contains('matched') && !c.classList.contains('flipped'));
    if (closed.length < 2) return;
    const a = closed[Math.floor(Math.random() * closed.length)];
    let b = a;
    while (b === a) b = closed[Math.floor(Math.random() * closed.length)];
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    // DOM tvarka – sukeičiam, tada animuojam iš senų vietų (FLIP)
    const marker = document.createComment('');
    a.replaceWith(marker);
    b.replaceWith(a);
    marker.replaceWith(b);
    for (const [el, from] of [[a, ra], [b, rb]]) {
      const to = el.getBoundingClientRect();
      el.animate([{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px)` }, { transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.4,0,.2,1)' });
      el.classList.add('swapping');
      setTimeout(() => el.classList.remove('swapping'), 460);
    }
    sfx('whoosh');
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
    if (L.swap) shell.char.show('Atsargiai – suklydus kortelės susikeičia vietomis!');
    if (L.peek) {
      // „Įsimink“: visos kortelės trumpam atverčiamos, tada užsiverčia ir pradedamas laikas
      round.busy = true;
      shell.char.show('Įsimink, kur kas yra!');
      setTimeout(() => round.alive && grid.querySelectorAll('.mem-card').forEach((c) => c.classList.add('flipped')), 60 * pairs * 2 + 400);
      setTimeout(() => {
        if (!round.alive) return;
        grid.querySelectorAll('.mem-card').forEach((c) => c.classList.remove('flipped'));
        sfx('flip');
        round.busy = false;
        timer.start(L.secs, timeUp);
      }, 60 * pairs * 2 + 400 + L.peek * 1000);
      return;
    }
    timer.start(L.secs, timeUp);
  });

  return () => {
    timer.destroy();
    round.destroy();
  };
}
