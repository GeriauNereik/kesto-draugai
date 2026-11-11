// Galvosūkių lygiai: po 20 kiekvienam žaidimui, nuo lengviausio iki sunkiausio.
// Sunkiųjų galvosūkių lygiai sugeneruoti iš anksto ir patikrinti sprendėju (scripts/brain/gen-levels.mjs),
// paprastesnieji (takai) – žaidimo metu pagal parametrus žemiau.
import SORT from './brain/sort.json';
import TRAFFIC from './brain/traffic.json';
import SUDOKU from './brain/sudoku.json';
import { TANGRAM_SHAPES } from './tangram-shapes.js';

export { SORT as SORT_LEVELS, TRAFFIC as TRAFFIC_LEVELS, SUDOKU as SUDOKU_LEVELS, TANGRAM_SHAPES as TANGRAM_LEVELS };

// Paslėptas takas: laukas (stulpeliai × eilutės), tako ilgis, kiek ms rodomas vienas žingsnis.
export const PATH_LEVELS = [
  [3, 4, 5, 650], [4, 4, 6, 600], [4, 4, 7, 580], [4, 5, 8, 560], [4, 5, 9, 540],
  [5, 5, 9, 520], [5, 5, 10, 500], [5, 5, 11, 480], [5, 6, 11, 460], [5, 6, 12, 450],
  [6, 6, 12, 440], [6, 6, 13, 420], [6, 6, 14, 410], [6, 7, 14, 400], [6, 7, 15, 390],
  [6, 7, 16, 380], [6, 7, 17, 370], [7, 7, 17, 360], [7, 7, 18, 350], [7, 7, 19, 340],
].map(([cols, rows, len, stepMs]) => ({ cols, rows, len, stepMs }));

// Skaičių takas: kokia seka spaudžiami akmenėliai. seq – skaičiai iš eilės;
// ops – akmenėliuose užrašyti veiksmai (spaudžiama pagal atsakymą didėjimo tvarka).
const range = (a, b, step = 1) => {
  const out = [];
  if (step > 0) for (let v = a; v <= b; v += step) out.push(v);
  else for (let v = a; v >= b; v += step) out.push(v);
  return out;
};
export const TRAIL_LEVELS = [
  { seq: range(1, 10), tile: '1–10' },
  { seq: range(10, 1, -1), tile: '10→1' },
  { seq: range(2, 20, 2), tile: '2, 4, 6' },
  { seq: range(1, 15), tile: '1–15' },
  { seq: range(5, 50, 5), tile: '5, 10' },
  { seq: range(15, 1, -1), tile: '15→1' },
  { seq: range(3, 30, 3), tile: '3, 6, 9' },
  { seq: range(10, 100, 10), tile: '10, 20' },
  { seq: range(20, 2, -2), tile: '20, 18' },
  { seq: range(4, 40, 4), tile: '4, 8' },
  { seq: range(30, 16, -1), tile: '30→16' },
  { ops: '+', seq: range(2, 10), tile: '1+1' },
  { ops: '+', seq: range(5, 14), tile: '2+3' },
  { ops: '−', seq: range(1, 10), tile: '5−2' },
  { ops: '±', seq: range(1, 12), tile: '4±2' },
  { ops: '+', seq: range(8, 18), tile: '7+6' },
  { ops: '−', seq: range(5, 16), tile: '12−7' },
  { ops: '±', seq: range(6, 18), tile: '9±4' },
  { ops: '±', seq: range(10, 20), tile: '15±3' },
  { ops: '±', seq: range(20, 8, -1), tile: '20→8' },
];

// Mažas vaizdelis lygio mygtuke (vaikai neskaito – tėvai iškart supranta, kas laukia).
export const BRAIN_TILES = {
  sort: SORT.map((l) => [`${l.tubes.filter((t) => t.length).length} rūš.`]),
  traffic: TRAFFIC.map((l) => [`${l.cars.length - 1} rąst.`]),
  sudoku: SUDOKU.map((l) => [`${l.n}×${l.n}`]),
  tangram: TANGRAM_SHAPES.map((f) => [f.name]),
  path: PATH_LEVELS.map((l) => [`${l.len} žingsn.`]),
  trail: TRAIL_LEVELS.map((l) => [l.tile]),
};
