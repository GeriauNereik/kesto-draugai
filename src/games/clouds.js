// Kęstas: „Debesėliai“ – ant debesėlio kyla sudėtis ar atimtis, atsakymą reikia pasirinkti,
// kol debesėlis nepasiekė viršaus. Klaida ar nespėtas debesėlis – minus viena gyvybė;
// pritrūkus gyvybių lygis baigiasi (galima kartoti), perėjus – atsirakina kitas, sunkesnis lygis.
import { h, onTap, shuffle, randInt, wait, pulse } from '../ui/dom.js';
import { gameShell } from '../ui/game-shell.js';
import { createRound, intro } from './common.js';
import { CLOUD_LEVELS, CLOUDS_PER_LEVEL, CLOUD_LIVES } from '../config/games.js';
import { addHearts } from '../ui/hearts.js';
import { sfx } from '../sfx.js';
import { burst, stagger } from '../ui/fx.js';

const CLOUD_SVG = `<svg class="cloud-shape" viewBox="0 0 220 120" aria-hidden="true">
  <path d="M52 108c-24 0-42-15-42-35 0-19 16-34 37-35 6-20 25-33 47-33 21 0 39 12 46 30 4-1 8-2 12-2 25 0 45 18 45 40 0 20-18 35-41 35z"
    fill="#ffffff" stroke="#9cc3e6" stroke-width="4" stroke-linejoin="round"/>
  <path d="M40 92c10 6 26 8 38 4M150 96c12 2 24-2 30-10" fill="none" stroke="#d6e8f7" stroke-width="5" stroke-linecap="round"/>
</svg>`;

const CHOICES = 4; // atsakymo variantų skaičius

/** Viena užduotis pagal lygio nustatymus; atsakymas visada 1..max ir nesikartoja su ankstesniu. */
export function cloudTask({ max, ops }, prevAnswer = null) {
  for (let k = 0; k < 20; k++) {
    const op = ops[randInt(0, ops.length - 1)];
    let t;
    if (op === '+') {
      const answer = randInt(2, max);
      const a = randInt(1, answer - 1);
      t = { op, a, b: answer - a, answer };
    } else {
      const a = randInt(2, max);
      const b = randInt(1, a - 1);
      t = { op, a, b, answer: a - b };
    }
    if (t.answer !== prevAnswer) return t;
  }
  return { op: '+', a: 1, b: 1, answer: 2 };
}

/**
 * Pasirinkimai (numatyta – 4), surikiuoti didėjančia tvarka. Teisingo atsakymo vieta tarp jų parenkama
 * atsitiktinai ir tolygiai, o kiti variantai – artimi skaičiai iš abiejų pusių, todėl atspėti iš
 * vietos ar „iškrentančio“ skaičiaus neįmanoma. Variantai ≥ 0 (atsakymas visada ≥ 1).
 */
export function cloudChoices(answer, { count = 4, pos = null } = {}) {
  const others = count - 1;
  const below = Math.min(answer, 4); // kiek mažesnių skaičių galima parinkti (0..4 atstumu, ne mažiau 0)
  // pos – norima atsakymo vieta (0 = kairėje); jei negalima ar nenurodyta – atsitiktinė iš galimų
  const k = pos != null && pos <= Math.min(others, below) ? pos : randInt(0, Math.min(others, below));
  const pickNear = (dir, n) => shuffle([1, 2, 3, 4].map((d) => answer + dir * d).filter((v) => v >= 0)).slice(0, n);
  const picks = [...pickNear(-1, k), ...pickNear(1, others - k)];
  return [answer, ...picks].sort((x, y) => x - y);
}

export function cloudsGame(root, { level, onHome, onFinish }) {
  const cfg = CLOUD_LEVELS[level - 1] || CLOUD_LEVELS[0];
  let lives = CLOUD_LIVES;
  let solved = 0;
  let task = null;
  let anim = null;
  let cloud = null;

  const shell = gameShell(root, { charId: 'kestas', total: CLOUDS_PER_LEVEL, onHome, onRepeat: () => shell.char.speak('phrases/debesys_intro') });
  const round = createRound(shell);

  // Gyvybės – širdelės viršutiniame dešiniajame kampe.
  const hs = addHearts(shell, CLOUD_LIVES);
  const showLives = () => hs.set(lives, { shake: true });

  const sky = h('div', { class: 'sky' }, h('div', { class: 'sky-top', 'aria-hidden': 'true' }));
  const choices = h('div', { class: 'num-choices cloud-choices' });
  shell.board.append(h('div', { class: 'clouds-game' }, [sky, choices]));

  const onVis = () => anim && (document.hidden ? anim.pause() : anim.playState === 'paused' && !round.busy && anim.play());
  document.addEventListener('visibilitychange', onVis);

  function launch() {
    if (!round.alive) return;
    // Pirma – atsitiktinė teisingo atsakymo vieta (tolygiai iš 4), tada užduotis, kuriai ji įmanoma
    // (pvz. atsakymui 1 mažesnių variantų nėra) – taip vieta niekada neišduoda atsakymo.
    const pos = randInt(0, CHOICES - 1);
    let t = cloudTask(cfg, task?.answer);
    for (let k = 0; k < 30 && Math.min(t.answer, 4) < pos; k++) t = cloudTask(cfg, task?.answer);
    task = t;
    cloud?.remove();
    cloud = h('div', { class: 'cloud', html: CLOUD_SVG }, h('span', { class: 'cloud-text', text: `${task.a} ${task.op} ${task.b}` }));
    sky.append(cloud);
    const H = sky.clientHeight;
    const ch = cloud.offsetHeight;
    // Debesėlis išnyra iš apačios ir kyla iki viršaus (ten – laikas baigėsi).
    anim = cloud.animate([{ transform: `translateY(${H}px)` }, { transform: `translateY(${-ch * 0.15}px)` }], {
      duration: cfg.time * 1000,
      easing: 'linear',
      fill: 'forwards',
    });
    anim.onfinish = () => lose(null);

    choices.replaceChildren(
      ...cloudChoices(task.answer, { count: CHOICES, pos }).map((n) => {
        const btn = h('button', { type: 'button', class: 'num-btn', 'aria-label': `Skaičius ${n}`, text: n });
        onTap(btn, () => choose(btn, n));
        return btn;
      })
    );
    stagger(choices, 60);
    round.busy = false;
    shell.char.setEmotion('think');
  }

  async function choose(btn, n) {
    if (round.busy || !anim) return;
    if (n !== task.answer) return lose(btn);
    round.busy = true;
    anim.pause();
    btn.classList.add('correct');
    pulse(btn, 'bounce');
    sfx('correct');
    burst(cloud, { count: 10 });
    cloud.classList.add('solved');
    cloud.querySelector('.cloud-text').textContent = `${task.a} ${task.op} ${task.b} = ${task.answer}`;
    shell.char.setEmotion('happy');
    solved++;
    shell.setProgress(solved);
    await wait(900);
    if (!round.alive) return;
    if (solved >= CLOUDS_PER_LEVEL) return onFinish({ stars: lives });
    launch();
  }

  /** Klaida (btn) arba debesėlis pasiekė viršų (btn = null): minus gyvybė. */
  async function lose(btn) {
    if (round.busy || !round.alive) return;
    round.busy = true;
    anim?.pause();
    lives--;
    showLives();
    sfx('wrong');
    if (btn) {
      btn.classList.add('dimmed');
      pulse(btn, 'shake');
    }
    cloud.classList.add('rain');
    cloud.querySelector('.cloud-text').textContent = `${task.a} ${task.op} ${task.b} = ${task.answer}`;
    shell.char.setEmotion('encourage');
    shell.char.show(btn ? 'Oi! Teisingai buvo ' + task.answer + '.' : 'Nespėjai! Buvo ' + task.answer + '.');
    await wait(1400);
    if (!round.alive) return;
    if (lives <= 0) return onFinish({ failed: true });
    shell.char.show('');
    launch();
  }

  intro(shell, round, 'phrases/debesys_intro').then((ok) => ok && launch());
  return () => {
    anim?.cancel();
    document.removeEventListener('visibilitychange', onVis);
    round.destroy();
  };
}
