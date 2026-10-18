// Domas: „Išgirsk ir paspausk“.
import { h, onTap, shuffle } from '../ui/dom.js';
import { gameShell } from '../ui/game-shell.js';
import { createRound, intro } from './common.js';
import { ALPHABET, EASY_ALPHABET, SIMILAR_GROUPS, groupOf } from '../config/alphabet.js';
import { ROUND_LENGTH } from '../config/games.js';
import { preload } from '../audio.js';
import { stagger } from '../ui/fx.js';
import { ICONS } from '../ui/icons.js';
import { sfx } from '../sfx.js';

/** Parenka pasirinkimus vienai užduočiai. */
export function buildOptions(target, level) {
  if (level === 1) {
    // 3 paprastos raidės, nė viena nepriklauso tai pačiai panašių grupei.
    const used = new Set(groupOf(target.ch));
    const picks = [target];
    for (const l of shuffle(EASY_ALPHABET)) {
      if (picks.length === 3) break;
      if (used.has(l.ch)) continue;
      picks.push(l);
      groupOf(l.ch).forEach((c) => used.add(c));
    }
    return shuffle(picks);
  }
  // 2 lygis: 4 raidės, sąmoningai su panašiomis.
  const picks = [target];
  const has = (ch) => picks.some((p) => p.ch === ch);
  const own = groupOf(target.ch).filter((c) => c !== target.ch);
  own.forEach((c) => picks.push(ALPHABET.find((l) => l.ch === c)));
  if (picks.length < 3) {
    // Raidė be panašių porų: pridedam kitą panašių grupę kaip "spąstus".
    const other = shuffle(SIMILAR_GROUPS.filter((g) => !g.includes(target.ch)))[0];
    shuffle(other)
      .slice(0, 4 - picks.length)
      .forEach((c) => picks.push(ALPHABET.find((l) => l.ch === c)));
  }
  for (const l of shuffle(ALPHABET)) {
    if (picks.length >= 4) break;
    if (!has(l.ch)) picks.push(l);
  }
  return shuffle(picks.slice(0, 4));
}

/** 10 skirtingų raidžių. 1 lygyje – tik paprastos, 2 lygyje bent 6 iš panašių grupių (ten mokymosi vertė didžiausia). */
export function pickTargets(level) {
  if (level === 1) return shuffle(EASY_ALPHABET).slice(0, ROUND_LENGTH);
  const grouped = new Set(SIMILAR_GROUPS.flat());
  const similar = shuffle(ALPHABET.filter((l) => grouped.has(l.ch))).slice(0, 6);
  const rest = shuffle(ALPHABET.filter((l) => !similar.includes(l))).slice(0, ROUND_LENGTH - similar.length);
  return shuffle([...similar, ...rest]);
}

export function lettersGame(root, { level, onHome, onFinish }) {
  const targets = pickTargets(level); // raundo metu nesikartoja
  let i = 0;
  let target = null;

  preload(targets.map((t) => `letters/${t.file}`));

  const promptKeys = () => ['phrases/kur_raide', `letters/${target.file}`];
  // Kol skamba garsas, didysis mygtukas "banguoja" – vaikas mato, kad reikia klausytis.
  const playing = (promise) => {
    listen.classList.add('playing');
    promise.finally(() => listen.classList.remove('playing'));
    return promise;
  };
  const prompt = () => {
    shell.char.setEmotion('think');
    return playing(shell.char.speak(promptKeys(), 'Kur raidė…?'));
  };

  const shell = gameShell(root, { charId: 'domas', total: ROUND_LENGTH, onHome, onRepeat: () => target && prompt() });
  const round = createRound(shell);

  // Didelis "Klausyk" mygtukas virš raidžių: vėl ištaria, kurios raidės ieškom.
  const listen = h('button', {
    type: 'button',
    class: 'listen-btn',
    'aria-label': 'Klausyti dar kartą',
    html: `<span class="listen-ring"></span><span class="listen-ring r2"></span>${ICONS.speaker}`,
  });
  onTap(listen, () => {
    if (!target) return;
    sfx('tap');
    prompt();
  });
  const holder = h('div', { class: 'letters-holder' });
  shell.board.append(h('div', { class: 'letters-wrap' }, [listen, holder]));

  async function choose(btn, letter) {
    if (round.busy || btn.disabled) return;
    if (letter.ch === target.ch) {
      if (!(await round.correct(btn))) return;
      i++;
      shell.setProgress(i);
      if (i >= ROUND_LENGTH) return onFinish({ mistakes: round.mistakes });
      next();
    } else {
      round.wrong(btn, [`letters/${target.file}`]);
    }
  }

  function next() {
    target = targets[i];
    const options = buildOptions(target, level);
    const grid = h('div', { class: `letter-grid n${options.length}` });
    options.forEach((l) => {
      const btn = h('button', { type: 'button', class: 'letter-card', 'aria-label': `Raidė ${l.ch}` }, h('span', { class: 'glyph', 'aria-hidden': 'true', text: l.ch }));
      onTap(btn, () => choose(btn, l));
      grid.append(btn);
    });
    holder.replaceChildren(stagger(grid, 90));
    round.busy = false;
    prompt();
  }

  // Pirma paaiškinimas (raidžių dar nėra), pauzė, tada pirmoji užduotis.
  listen.disabled = true;
  intro(shell, round, 'phrases/domas_intro', { full: true }).then((ok) => {
    if (!ok) return;
    listen.disabled = false;
    next();
  });
  return () => round.destroy();
}
