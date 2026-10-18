// Vėja: „Kryžiukai-nuliukai“. Vaikas deda kryžiukus, Vėja – nuliukus. Lygis – 3 partijos;
// kuo aukštesnis lygis, tuo protingiau žaidžia Vėja. Taškai: pergalė 2, lygiosios 1.
import { h, onTap, shuffle, wait, randInt } from '../ui/dom.js';
import { gameShell } from '../ui/game-shell.js';
import { createRound, intro, SFX_GAP } from './common.js';
import { TTT_LEVELS, TTT_GAMES } from '../config/games.js';
import { randomPraise } from '../config/phrases.js';
import { sfx } from '../sfx.js';
import { burst, stagger } from '../ui/fx.js';
import { pulse } from '../ui/motion.js';

const X = 'x';
const O = 'o';
export const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];
const MARK_SVG = {
  x: `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M24 24 76 76M76 24 24 76" stroke="#2e9a48" stroke-width="13" stroke-linecap="round" fill="none"/></svg>`,
  o: `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="27" stroke="#e5533d" stroke-width="12" fill="none"/></svg>`,
};

/** Laimėtojas: { mark, line } arba 'draw', jei lenta pilna; null – žaidimas tęsiasi. */
export function winner(b) {
  for (const line of LINES) {
    const [p, q, r] = line;
    if (b[p] && b[p] === b[q] && b[p] === b[r]) return { mark: b[p], line };
  }
  return b.every(Boolean) ? 'draw' : null;
}

const empty = (b) => b.map((v, i) => (v ? null : i)).filter((i) => i !== null);

/** Langelis, kuriame mark iš karto laimėtų (arba null). */
function winningMove(b, mark) {
  for (const i of empty(b)) {
    const t = b.slice();
    t[i] = mark;
    if (winner(t)?.mark === mark) return i;
  }
  return null;
}

/** Minimax: geriausias rezultatas žaidėjui `turn` (+1 – laimi O, −1 – laimi X). */
function score(b, turn, depth = 0) {
  const w = winner(b);
  if (w === 'draw') return 0;
  if (w) return w.mark === O ? 10 - depth : depth - 10;
  const scores = empty(b).map((i) => {
    const t = b.slice();
    t[i] = turn;
    return score(t, turn === O ? X : O, depth + 1);
  });
  return turn === O ? Math.max(...scores) : Math.min(...scores);
}

function bestMove(b) {
  const opts = empty(b).map((i) => {
    const t = b.slice();
    t[i] = O;
    return { i, s: score(t, X, 1) };
  });
  const top = Math.max(...opts.map((o) => o.s));
  return shuffle(opts.filter((o) => o.s === top))[0].i;
}

/** Vėjos ėjimas pagal lygio „protą“. */
export function aiMove(b, { ai, mistakes = 0 }) {
  const free = empty(b);
  const random = () => free[randInt(0, free.length - 1)];
  if (ai === 'random') return random();
  if (ai === 'basic') {
    const win = winningMove(b, O);
    if (win !== null) return win;
    const block = winningMove(b, X);
    if (block !== null && Math.random() < 0.6) return block;
    return random();
  }
  if (Math.random() < mistakes && free.length > 2) return random();
  if (ai === 'smart') {
    const win = winningMove(b, O);
    if (win !== null) return win;
    const block = winningMove(b, X);
    if (block !== null) return block;
    if (!b[4]) return 4;
    const corners = [0, 2, 6, 8].filter((i) => !b[i]);
    if (corners.length) return shuffle(corners)[0];
    return random();
  }
  return bestMove(b); // 'perfect'
}

/** Taškai → žvaigždutės (0 – lygis nepereitas). */
export function tttStars(points) {
  if (points >= 5) return 3;
  if (points >= 3) return 2;
  if (points >= 2) return 1;
  return 0;
}

export function tictactoeGame(root, { level, onHome, onFinish }) {
  const cfg = TTT_LEVELS[level - 1] || TTT_LEVELS[0];
  let game = 0;
  let points = 0;
  let board = Array(9).fill(null);
  let cells = [];
  let myTurn = true;

  const shell = gameShell(root, { charId: 'veja', total: TTT_GAMES, onHome, onRepeat: () => shell.char.speak('phrases/kryziukai_intro') });
  const round = createRound(shell);

  const grid = h('div', { class: 'ttt-grid', role: 'grid', 'aria-label': 'Kryžiukų ir nuliukų lenta' });
  const score = h('div', { class: 'ttt-score' });
  shell.board.append(h('div', { class: 'ttt-game' }, [score, grid]));
  const showScore = () => (score.textContent = `Partija ${Math.min(game + 1, TTT_GAMES)} iš ${TTT_GAMES}`);

  function place(i, mark) {
    board[i] = mark;
    const cell = cells[i];
    cell.innerHTML = MARK_SVG[mark];
    cell.classList.add('filled', mark);
    cell.setAttribute('aria-label', mark === X ? 'Kryžiukas' : 'Nuliukas');
    pulse(cell, 'bounce');
    sfx(mark === X ? 'tap' : 'flip');
  }

  async function tap(i) {
    if (round.busy || !myTurn || board[i]) return;
    place(i, X);
    if (await checkEnd()) return;
    myTurn = false;
    aiTurn();
  }

  async function aiTurn() {
    round.busy = true;
    shell.char.setEmotion('think');
    shell.char.show('Vėja galvoja…');
    await wait(650);
    if (!round.alive) return;
    place(aiMove(board, cfg), O);
    if (await checkEnd()) return;
    myTurn = true;
    round.busy = false;
    shell.char.show('Tavo ėjimas!');
  }

  /** Jei partija baigėsi – parodo rezultatą ir pradeda kitą (arba baigia lygį). */
  async function checkEnd() {
    const w = winner(board);
    if (!w) return false;
    round.busy = true;
    if (w === 'draw') {
      points += 1;
      shell.char.setEmotion('encourage');
      shell.char.speak('phrases/lygiosios', 'Lygiosios!', { delay: SFX_GAP });
    } else {
      w.line.forEach((i) => cells[i].classList.add('win'));
      if (w.mark === X) {
        points += 2;
        sfx('correct');
        burst(cells[w.line[1]], { count: 12 });
        shell.char.setEmotion('happy');
        shell.char.speak(`phrases/${randomPraise()}`, undefined, { delay: SFX_GAP });
      } else {
        sfx('wrong');
        shell.char.setEmotion('encourage');
        shell.char.speak('phrases/veja_laimejo', 'Šįkart laimėjau aš!', { delay: SFX_GAP });
      }
    }
    game++;
    shell.setProgress(game);
    await wait(1900);
    if (!round.alive) return true;
    if (game >= TTT_GAMES) {
      const stars = tttStars(points);
      onFinish(stars ? { stars } : { failed: true });
      return true;
    }
    newGame();
    return true;
  }

  function newGame() {
    board = Array(9).fill(null);
    cells = board.map((_, i) => {
      const cell = h('button', { type: 'button', class: 'ttt-cell', 'aria-label': `Langelis ${i + 1}` });
      onTap(cell, () => tap(i));
      return cell;
    });
    grid.replaceChildren(...cells);
    stagger(grid, 30, 0, 'pop');
    showScore();
    // Partijas pradeda paeiliui: 1-ą – vaikas, 2-ą – Vėja, 3-ią – vėl vaikas.
    myTurn = game % 2 === 0;
    round.busy = false;
    if (myTurn) {
      shell.char.setEmotion('think');
      shell.char.show('Tavo ėjimas!');
    } else aiTurn();
  }

  intro(shell, round, 'phrases/kryziukai_intro').then((ok) => ok && newGame());
  return () => round.destroy();
}
