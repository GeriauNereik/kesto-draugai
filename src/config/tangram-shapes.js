// Tangramo figūros (40 lygių: 1–20 nuo 2 iki 7 detalių, 21–40 – 6–8 detalės, tik siluetas). Kiekviena figūra – detalių sąrašas su tikslia vieta gardelėje.
// Detalės: ST – mažas trikampis, MT – vidutinis, LT – didelis, SQ – kvadratas (rombu), PA – lygiagretainis.
// Visos viršūnės – sveikųjų skaičių gardelėje, todėl detalės „prilimpa“ tiksliai.
// Figūra = detalių sąjunga, todėl ji visada sudedama. Patikra: node scripts/brain/check-tangram.mjs

// --- detalių formos (x, y – gardelės taškas) ---
/** Mažas trikampis, įžambinė gulsčia (ilgis 2), viršūnė aukštyn arba žemyn. */
const stH = (x, y, up = true) => ['ST', [[x, y], [x + 2, y], [x + 1, up ? y - 1 : y + 1]]];
/** Mažas trikampis, įžambinė stati, viršūnė į dešinę arba kairę. */
const stV = (x, y, right = true) => ['ST', [[x, y], [x, y + 2], [right ? x + 1 : x - 1, y + 1]]];
/** Vidutinis trikampis: statusis kampas (x, y), statiniai (ilgis 2) į sx, sy puses. */
const mt = (x, y, sx, sy) => ['MT', [[x, y], [x + 2 * sx, y], [x, y + 2 * sy]]];
/** Didelis trikampis, įžambinė gulsčia (ilgis 4). */
const ltH = (x, y, up = true) => ['LT', [[x, y], [x + 4, y], [x + 2, up ? y - 2 : y + 2]]];
/** Didelis trikampis, įžambinė stati. */
const ltV = (x, y, right = true) => ['LT', [[x, y], [x, y + 4], [right ? x + 2 : x - 2, y + 2]]];
/** Kvadratas rombu, centras (cx, cy). */
const sq = (cx, cy) => ['SQ', [[cx, cy - 1], [cx + 1, cy], [cx, cy + 1], [cx - 1, cy]]];
/** Lygiagretainis: gulsčios kraštinės (ilgis 2), pasviręs į dešinę (+1) arba kairę (−1). */
const paH = (x, y, slant = 1) => ['PA', [[x, y], [x + 2, y], [x + 2 + slant, y - 1], [x + slant, y - 1]]];
/** Lygiagretainis: stačios kraštinės (ilgis 2). */
const paV = (x, y, slant = 1) => ['PA', [[x, y], [x, y + 2], [x + 1, y + 2 + slant], [x + 1, y + slant]]];

const fig = (name, pieces) => ({ name, pieces: pieces.map(([type, pts]) => ({ type, pts })) });

export const TANGRAM_SHAPES = [
  // 2 detalės
  fig('Kvadratas', [stH(0, 1, true), stH(0, 1, false)]),
  fig('Trikampis', [stV(0, 0, true), stH(0, 2, true)]),
  fig('Didelis trikampis', [mt(2, 2, -1, -1), mt(2, 2, 1, -1)]),
  // 3 detalės
  fig('Namelis', [stH(0, 2, true), mt(0, 2, 1, 1), mt(2, 4, -1, -1)]),
  fig('Žuvytė', [stV(0, 0, true), stH(1, 1, true), stH(1, 1, false)]),
  fig('Laivelis', [mt(2, 3, 1, -1), stV(2, 1, false), paH(1, 4, 1)]),
  // 4 detalės
  fig('Strėlė', [stV(2, 1, false), mt(2, 1, 1, 1), mt(4, 3, -1, -1), ltV(4, 0, true)]),
  fig('Eglutė', [stH(1, 2, true), ltH(0, 4, true), stH(1, 4, false), sq(2, 6)]),
  fig('Varlytė', [ltH(0, 3, true), stH(0, 3, false), stH(2, 3, false), sq(2, 0)]),
  fig('Sniego senis', [stH(1, 1, true), sq(2, 2), sq(2, 4), stH(1, 5, false)]),
  // 5 detalės
  fig('Raketa', [stH(1, 1, true), mt(1, 1, 1, 1), mt(3, 3, -1, -1), stV(1, 1, false), stV(3, 1, true)]),
  fig('Paukštis', [ltH(0, 3, true), mt(4, 3, 1, -1), stH(4, 3, false), sq(1, 1), stV(6, 1, true)]),
  fig('Kiškis', [ltH(0, 6, true), sq(2, 3), paV(1, -1, 1), paV(2, 0, -1), stV(4, 5, true)]),
  fig('Gėlė', [sq(2, 1), sq(1, 2), sq(3, 2), sq(2, 3), stV(2, 4, true)]),
  // 6 detalės
  fig('Namas su kaminu', [ltH(0, 2, true), mt(0, 2, 1, 1), mt(2, 4, -1, -1), mt(2, 2, 1, 1), mt(4, 4, -1, -1), sq(3, 0)]),
  fig('Ančiukas', [ltH(0, 4, true), mt(4, 4, 1, -1), stH(0, 4, false), stH(2, 4, false), sq(2, 1), paH(4, 2, -1)]),
  fig('Didelė žuvis', [ltH(0, 2, true), ltH(0, 2, false), stH(0, 0, false), stH(0, 4, true), stV(5, 1, false), stV(5, 1, true)]),
  // 7 detalės
  fig('Didysis kvadratas', [
    ['LT', [[0, 0], [4, 0], [2, 2]]],
    ['LT', [[0, 0], [2, 2], [0, 4]]],
    ['MT', [[4, 2], [4, 4], [2, 4]]],
    ['SQ', [[2, 2], [3, 1], [4, 2], [3, 3]]],
    ['ST', [[3, 1], [4, 0], [4, 2]]],
    ['ST', [[1, 3], [2, 2], [3, 3]]],
    ['PA', [[0, 4], [1, 3], [3, 3], [2, 4]]],
  ]),
  fig('Laivas', [stV(1, 4, false), mt(1, 4, 1, 1), mt(3, 6, -1, -1), stV(3, 4, true), ltV(2, 0, true), mt(2, 4, -1, -1), sq(2, -1)]),
  fig('Lėktuvėlis', [ltH(0, 2, true), ltH(0, 2, false), mt(4, 2, 1, -1), mt(4, 2, 1, 1), stV(0, 1, false), sq(2, 5), stV(2, -2, true)]),

  // ---------- 21–40: sunkesnės figūros (be detalių kontūrų) ----------
  fig('Gulbė', [ltH(0, 3, false), mt(0, 3, 1, -1), paV(4, 1, -1), stH(3, 0, false), stH(4, 3, false), stV(0, 1, false)]),
  fig('Širdelė', [stH(0, 1, true), stH(0, 1, false), sq(3, 1), stH(1, 2, true), mt(2, 2, -1, 1), mt(2, 2, 1, 1)]),
  fig('Malūnėlis', [mt(1, 1, 1, 1), mt(3, 3, -1, -1), mt(1, 1, 1, -1), mt(3, 1, 1, 1), mt(3, 3, -1, 1), mt(1, 3, -1, -1)]),
  fig('Drugelis', [ltV(3, 0, false), ltV(5, 0, true), sq(4, 2), sq(4, 4), mt(3, 4, -1, 1), mt(5, 4, 1, 1)]),
  fig('Sraigė', [ltH(1, 3, true), ltH(1, 3, false), paH(1, 6, 1), paH(3, 6, 1), mt(6, 5, 1, -1), stV(6, 1, true)]),
  fig('Lapė', [ltH(0, 2, false), mt(0, 2, 1, -1), mt(4, 2, -1, -1), ltV(2, 4, true), mt(2, 8, -1, -1), mt(4, 6, 1, 1)]),
  fig('Ežiukas', [ltH(1, 4, true), stH(0, 3, false), stH(1, 2, false), stH(3, 2, false), mt(5, 4, 1, -1), stH(1, 4, false), stH(3, 4, false)]),
  fig('Grybas', [ltH(0, 3, true), mt(0, 3, -1, -1), mt(4, 3, 1, -1), mt(0, 1, 1, 1), mt(4, 1, -1, 1), mt(1, 3, 1, 1), mt(3, 5, -1, -1)]),
  fig('Banginis', [mt(0, 2, 1, 1), ltH(0, 4, true), mt(4, 2, -1, 1), mt(4, 2, 1, 1), mt(6, 4, -1, -1), stV(6, 2, true), mt(0, 4, -1, -1)]),
  fig('Medis', [ltH(0, 3, true), ltH(0, 3, false), stH(1, 1, true), mt(1, 5, 1, 1), mt(3, 7, -1, -1), stV(1, 5, false), stV(3, 5, true)]),
  fig('Mašina', [mt(0, 2, 1, 1), ltH(0, 4, true), mt(4, 2, -1, 1), mt(4, 2, 1, 1), paH(1, 2, 1), sq(1, 5), sq(4, 5)]),
  fig('Kačiukas', [stV(1, -1, true), stV(3, -1, false), sq(2, 1), ltV(2, 2, true), ltV(2, 2, false), mt(0, 6, 1, -1), mt(4, 6, -1, -1), paV(4, 4, 1)]),
  fig('Šuniukas', [ltH(0, 4, true), mt(0, 2, 1, 1), mt(4, 2, -1, 1), sq(5, 2), stV(5, -1, true), stH(0, 4, false), stH(2, 4, false), stV(0, 1, false)]),
  fig('Karūna', [stH(0, 2, false), stH(1, 3, true), stH(2, 2, false), stH(3, 3, true), stH(4, 2, false), stH(0, 2, true), stH(2, 2, true), stH(4, 2, true)]),
  fig('Robotas', [mt(1, 0, 1, 1), mt(3, 2, -1, -1), mt(1, 2, 1, 1), mt(3, 4, -1, -1), stV(1, 2, false), stV(3, 2, true), stV(1, 4, true), stV(3, 4, false)]),
  fig('Traukinys', [mt(0, 2, 1, 1), mt(2, 4, -1, -1), mt(2, 2, 1, 1), mt(4, 4, -1, -1), stH(2, 2, true), stV(4, 2, true), sq(1, 5), sq(3, 5)]),
  fig('Pelėda', [ltH(0, 2, true), ltH(0, 2, false), mt(0, 0, 1, 1), mt(4, 0, -1, 1), mt(0, 4, 1, -1), mt(4, 4, -1, -1), stV(0, -2, true), stV(4, -2, false)]),
  fig('Dinozauras', [ltH(1, 4, true), mt(1, 4, -1, -1), paV(4, 1, 1), stH(4, 1, false), stH(1, 4, false), stH(3, 4, false), stH(1, 2, false), stV(-1, 3, false)]),
  fig('Pilis', [mt(0, 2, 1, 1), ltH(0, 4, true), mt(4, 2, -1, 1), mt(0, 0, 1, 1), mt(2, 2, -1, -1), mt(2, 0, 1, 1), mt(4, 2, -1, -1), stH(0, 0, true), stH(2, 0, true)]),
  fig('Burlaivis', [stH(0, 4, false), stH(1, 5, true), stH(2, 4, false), stH(3, 5, true), stH(4, 4, false), ltV(3, 0, false), mt(3, 4, 1, -1), stV(3, -2, true)]),
];
