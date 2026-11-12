// Galvosūkių lygiai: po 20 kiekvienam žaidimui (tangramui ir paslėptam takui – 40), nuo lengviausio iki sunkiausio.
// Sunkiųjų galvosūkių lygiai sugeneruoti iš anksto ir patikrinti sprendėju (scripts/brain/gen-levels.mjs),
// paslėptas takas – žaidimo metu pagal parametrus žemiau.
import SORT from './brain/sort.json';
import TRAFFIC from './brain/traffic.json';
import SUDOKU from './brain/sudoku.json';
import PIPES from './brain/pipes.json';
import { TANGRAM_SHAPES } from './tangram-shapes.js';

export { SORT as SORT_LEVELS, TRAFFIC as TRAFFIC_LEVELS, SUDOKU as SUDOKU_LEVELS, TANGRAM_SHAPES as TANGRAM_LEVELS, PIPES as PIPE_LEVELS };

// Paslėptas takas: laukas (stulpeliai × eilutės), tako ilgis, kiek ms rodomas vienas žingsnis.
export const PATH_LEVELS = [
  [3, 4, 5, 650], [4, 4, 6, 600], [4, 4, 7, 580], [4, 5, 8, 560], [4, 5, 9, 540],
  [5, 5, 9, 520], [5, 5, 10, 500], [5, 5, 11, 480], [5, 6, 11, 460], [5, 6, 12, 450],
  [6, 6, 12, 440], [6, 6, 13, 420], [6, 6, 14, 410], [6, 7, 14, 400], [6, 7, 15, 390],
  [6, 7, 16, 380], [6, 7, 17, 370], [7, 7, 17, 360], [7, 7, 18, 350], [7, 7, 19, 340],
  // 21–40: didesnis laukas (iki 8 × 8 – kad akmenukai tilptų ir mažame telefone), ilgesnis takas, greitesnis rodymas
  [7, 7, 20, 330], [7, 8, 20, 325], [7, 8, 21, 320], [7, 8, 22, 315], [7, 8, 23, 310],
  [8, 8, 23, 305], [8, 8, 24, 300], [8, 8, 25, 295], [8, 8, 26, 290], [8, 8, 27, 285],
  [8, 8, 28, 280], [8, 8, 29, 275], [8, 8, 30, 270], [8, 8, 30, 260], [8, 8, 31, 255],
  [8, 8, 32, 250], [8, 8, 33, 245], [8, 8, 34, 240], [8, 8, 35, 235], [8, 8, 36, 230],
].map(([cols, rows, len, stepMs]) => ({ cols, rows, len, stepMs }));

// Mažas vaizdelis lygio mygtuke (vaikai neskaito – tėvai iškart supranta, kas laukia).
export const BRAIN_TILES = {
  sort: SORT.map((l) => [`${l.tubes.filter((t) => t.length).length} rūš.`]),
  traffic: TRAFFIC.map((l) => [`${l.cars.length - 1} rąst.`]),
  sudoku: SUDOKU.map((l) => [`${l.n}×${l.n}`]),
  tangram: TANGRAM_SHAPES.map((f) => [f.name]),
  path: PATH_LEVELS.map((l) => [`${l.len} žingsn.`]),
  pipes: PIPES.map((l) => [`${l.sources.length} stat.`]),
};
