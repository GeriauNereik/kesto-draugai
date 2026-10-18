import { DRAW_CATEGORIES, ALL_DRAW_ITEMS } from './draw-items.js';
import { getDrawDone } from '../storage.js';

// Žaidimų sąrašas: meniu kortelės, matematikos skiltis ir kiekvieno žaidimo lygiai.
// levels[i]: { label – mygtuko tekstas, tiles – mažas vaizdelis mygtuke, wide – platūs langeliai }.

export const ROUND_LENGTH = 10;

/** Žvaigždutės pagal klaidų (arba papildomų bandymų) skaičių. */
export function starsFor(mistakes) {
  if (mistakes <= 2) return 3;
  if (mistakes <= 5) return 2;
  return 1;
}

const easyHard = (easy, hard, wide = false) => [
  { label: 'Lengviau', tiles: easy, wide },
  { label: 'Sunkiau', tiles: hard, wide },
];

// Debesėliai: kiekvienas lygis – didesni skaičiai ir (ar) greičiau kylantys debesys.
// time – kiek sekundžių debesėlis kyla nuo apačios iki viršaus.
export const CLOUD_LEVELS = [
  { max: 5, ops: ['+'], time: 10 },
  { max: 5, ops: ['+', '−'], time: 9.5 },
  { max: 10, ops: ['+'], time: 9.5 },
  { max: 10, ops: ['+', '−'], time: 9 },
  { max: 10, ops: ['+', '−'], time: 7.5 },
  { max: 20, ops: ['+', '−'], time: 8.5 },
  { max: 20, ops: ['+', '−'], time: 7 },
  { max: 50, ops: ['+', '−'], time: 8.5 },
  { max: 100, ops: ['+', '−'], time: 9 },
  { max: 100, ops: ['+', '−'], time: 7.5 },
];
// Sudėk ir atimk: gyvybės ir sekundės vienam veiksmui (lengviau / sunkiau).
export const MATH_LIVES = 3;
export const MATH_TIME = [10, 12];

export const CLOUDS_PER_LEVEL = 10;
export const CLOUD_LIVES = 3;

// Poros: kiek porų kiekviename lygyje.
export const MEMORY_PAIRS = [3, 4, 5, 6, 8, 10];
/** Laikas visam porų žaidimui (s): 3 poros – 45 s, 10 porų – 115 s. */
export const memorySeconds = (pairs) => 15 + pairs * 10;

// Kryžiukai-nuliukai: kaip protingai žaidžia Vėja; lygyje – TTT_GAMES partijos.
export const TTT_GAMES = 3;
export const TTT_LEVELS = [
  { label: 'Lengvas', ai: 'random' },
  { label: 'Vidutinis', ai: 'basic' },
  { label: 'Sunkus', ai: 'smart', mistakes: 0.15 },
  { label: 'Čempionas', ai: 'perfect', mistakes: 0.05 },
];

// Laikrodis: kokiu tikslumu rodomas laikas.
export const CLOCK_LEVELS = [
  { label: 'Valandos', step: 60, tiles: ['3:00'] },
  { label: 'Pusvalandžiai', step: 30, tiles: ['3:30'] },
  { label: 'Ketvirčiai', step: 15, tiles: ['3:15'] },
  { label: 'Minutės', step: 5, tiles: ['3:25'] },
];

// Antrokams: kiekvienas „lygis“ – 2 klasės matematikos tema; seconds – laikas vienai užduočiai.
export const GRADE2_LIVES = 3;
export const GRADE2_TOPICS = [
  { id: 'add100', seconds: 25, label: 'Sudėtis iki 100', tiles: ['37+25'] },
  { id: 'sub100', seconds: 25, label: 'Atimtis iki 100', tiles: ['62−28'] },
  { id: 'mul', seconds: 15, label: 'Daugyba', tiles: ['4×3'] },
  { id: 'div', seconds: 15, label: 'Dalyba', tiles: ['12:3'] },
  { id: 'unknown', seconds: 25, label: 'Rask nežinomąjį', tiles: ['□+7=15'] },
  { id: 'compare', seconds: 20, label: 'Palygink', tiles: ['>', '<', '='] },
  { id: 'place', seconds: 25, label: 'Skaičiai iki 1000', tiles: ['345'] },
  { id: 'money', seconds: 35, label: 'Pinigai', tiles: ['€', 'ct'] },
  { id: 'words', seconds: 45, label: 'Uždaviniai', tiles: ['Kiek?'] },
];

export const MATH_GAMES = [
  { id: 'counting', char: 'kestas', title: 'Skaičiuok', icon: 'logs', levels: easyHard(['1–5'], ['1–10'], true) },
  { id: 'math', char: 'kestas', title: 'Sudėk ir atimk', icon: 'plusminus', levels: easyHard(['2+1', '3−1'], ['6+3', '9−4'], true) },
  {
    id: 'clouds',
    char: 'kestas',
    title: 'Debesėliai',
    icon: 'cloud',
    progressive: true, // kitas lygis atsirakina tik perėjus ankstesnį
    // Mygtuke: veiksmai, skaičių riba ir „»“, jei debesėliai kyla greičiau nei ankstesniame tokiame lygyje.
    levels: CLOUD_LEVELS.map((l, i) => {
      const prev = CLOUD_LEVELS[i - 1];
      const faster = prev && prev.max === l.max && prev.ops.length === l.ops.length && l.time < prev.time;
      return { label: `${i + 1}`, tiles: [l.ops.join(' '), `iki ${l.max}${faster ? ' »' : ''}`] };
    }),
  },
  { id: 'clock', char: 'kestas', title: 'Laikrodis', icon: 'clock', levels: CLOCK_LEVELS.map(({ label, tiles }) => ({ label, tiles })) },
];

const MATH_HUB = { id: 'mathhub', char: 'kestas', title: 'Matematika', greet: 'kestas_hub', hub: MATH_GAMES };
MATH_GAMES.forEach((g) => (g.parent = MATH_HUB));

export const PLAY_GAMES = [
  {
    id: 'memory',
    char: 'veja',
    title: 'Surask poras',
    icon: 'cards',
    levels: MEMORY_PAIRS.map((n, i) => ({ label: `${i + 1}`, tiles: [`${n} poros`, `${memorySeconds(n)} s`] })),
  },
  {
    id: 'draw',
    char: 'veja',
    title: 'Piešimas',
    icon: 'brush',
    // Lygiai – kategorijos; mygtuke rodoma, kiek jau nupiešta (skaičiuojama atidarant ekraną).
    levels: [...DRAW_CATEGORIES, { id: 'viskas', label: 'Viskas', items: ALL_DRAW_ITEMS }].map((c) => ({
      label: c.label,
      tiles: () => [`${getDrawDone(c.id)}/${c.items.length}`],
    })),
  },
  {
    id: 'tictactoe',
    char: 'veja',
    title: 'Kryžiukai-nuliukai',
    icon: 'tictactoe',
    progressive: true,
    levels: TTT_LEVELS.map(({ label }, i) => ({ label, tiles: ['✕', '○', `${i + 1}`] })),
  },
];
const PLAY_HUB = { id: 'playhub', char: 'veja', title: 'Žaidimai', greet: 'ka_zaisime', hub: PLAY_GAMES };
PLAY_GAMES.forEach((g) => (g.parent = PLAY_HUB));

// Meniu kortelės.
export const GAMES = [
  { id: 'letters', char: 'domas', title: 'Raidės', levels: easyHard(['A', 'M', 'S'], ['E', 'Ę', 'Ė', 'I']) },
  MATH_HUB,
  PLAY_HUB,
  { id: 'grade2', char: 'gedas', cardIcon: 'skull', title: 'Antrokams', levels: GRADE2_TOPICS.map(({ label, tiles }) => ({ label, tiles })) },
];

/** Visi tikri žaidimai (be skilčių) – tėvų lentelei ir pan. */
export function allGames() {
  return GAMES.flatMap((g) => g.hub || [g]);
}

/** Kitas lygis (jei yra), arba null. */
export function nextLevel(game, level) {
  return level < (game.levels?.length || 0) ? level + 1 : null;
}
