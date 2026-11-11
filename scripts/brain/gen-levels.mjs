// Galvosūkių lygių generatorius: node scripts/brain/gen-levels.mjs
// Kiekvienas lygis sugeneruojamas su fiksuota sėkla (rezultatas visada tas pats) ir patikrinamas sprendėju,
// kad būtų išsprendžiamas ir tolygiai sunkėtų. Rezultatas – src/config/brain/*.json.
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = new URL('../../src/config/brain/', import.meta.url);
mkdirSync(OUT, { recursive: true });

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, a) => a[Math.floor(r() * a.length)];
const shuffle = (r, a) => {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// =====================================================================
// 1. Surūšiuok: daiktai krepšeliuose, kiekviename krepšelyje turi likti tik vienos rūšies daiktai.
//    Ėjimas – viršutinis daiktas į tuščią krepšelį arba ant tokio pat daikto.
// =====================================================================
const SORT_PARAMS = [
  [3, 3, 1], [3, 4, 2], [3, 4, 1], [4, 4, 2], [4, 4, 1],
  [5, 4, 2], [5, 4, 2], [5, 4, 1], [6, 4, 2], [6, 4, 2],
  [6, 4, 1], [7, 4, 2], [7, 4, 2], [7, 4, 2], [8, 4, 2],
  [8, 4, 2], [8, 4, 2], [9, 4, 2], [9, 4, 2], [9, 4, 2],
]; // [rūšių, talpa, tuščių krepšelių]

function sortKey(tubes) {
  return tubes.map((t) => t.join('')).sort().join('|');
}
function sortSolved(tubes, cap) {
  return tubes.every((t) => t.length === 0 || (t.length === cap && t.every((x) => x === t[0])));
}
function sortMoves(tubes, cap) {
  const out = [];
  for (let a = 0; a < tubes.length; a++) {
    const A = tubes[a];
    if (!A.length) continue;
    const top = A[A.length - 1];
    // nejudinam pilnai surūšiuoto krepšelio
    if (A.length === cap && A.every((x) => x === top)) continue;
    let seenEmpty = false;
    for (let b = 0; b < tubes.length; b++) {
      if (a === b) continue;
      const B = tubes[b];
      if (B.length >= cap) continue;
      if (B.length === 0) {
        if (seenEmpty || A.every((x) => x === top)) continue; // vienos rūšies stulpelio į tuščią nekeliam
        seenEmpty = true;
      } else if (B[B.length - 1] !== top) continue;
      out.push([a, b]);
    }
  }
  return out;
}
function sortH(tubes) {
  // kiek daiktų guli ne ant savo rūšies "pagrindo"
  let h = 0;
  for (const t of tubes) {
    if (!t.length) continue;
    let i = 0;
    while (i < t.length && t[i] === t[0]) i++;
    h += t.length - i;
  }
  return h;
}
/** Svertinė A* paieška: beveik optimalus ėjimų skaičius (lygio „norma“). */
function sortSolve(start, cap, limit = 400000) {
  const open = [[sortH(start), 0, start]];
  const seen = new Map([[sortKey(start), 0]]);
  let n = 0;
  while (open.length && n++ < limit) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [, g, tubes] = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    if (sortSolved(tubes, cap)) return g;
    for (const [a, b] of sortMoves(tubes, cap)) {
      const nt = tubes.map((t) => t.slice());
      nt[b].push(nt[a].pop());
      const k = sortKey(nt);
      if (seen.has(k) && seen.get(k) <= g + 1) continue;
      seen.set(k, g + 1);
      open.push([g + 1 + 1.6 * sortH(nt), g + 1, nt]);
    }
  }
  return null;
}
const SORT_TRIES = 10;
function genSort() {
  return SORT_PARAMS.map(([n, cap, empties], li) => {
    let best = null;
    let found = 0;
    for (let attempt = 0; ; attempt++) {
      const r = rng(1000 + li * 97 + attempt);
      const kinds = shuffle(r, [0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, n);
      // Atsitiktinai išmaišom ir paskirstom (tušti krepšeliai – gale), tada tikrinam sprendėju.
      const pool = shuffle(r, kinds.flatMap((k) => Array(cap).fill(k)));
      const tubes = [];
      for (let i = 0; i < n; i++) tubes.push(pool.slice(i * cap, (i + 1) * cap));
      for (let i = 0; i < empties; i++) tubes.push([]);
      if (tubes.some((t) => t.length === cap && t.every((x) => x === t[0]))) continue; // jau surūšiuotas
      const par = sortSolve(tubes, cap);
      if (par == null) continue;
      // iš kelių tinkamų išmaišymų imam sunkiausią (daugiausia ėjimų)
      if (!best || par > best.par) best = { cap, tubes, par };
      if (++found >= SORT_TRIES) break;
    }
    console.log(`  rūšiuok ${li + 1}: ${n} rūš., norma ${best.par}`);
    return best;
  });
}

// =====================================================================
// 2. Miško eismas: 6×6 laukas, rąstai juda tik savo kryptimi; išstumdyk, kad vežimėlis išvažiuotų dešinėn.
// =====================================================================
const N = 6;
const EXIT_ROW = 2;
const TRAFFIC_TARGET = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24];
const TRAFFIC_BLOCKERS = [3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 12];

function grid(cars) {
  const g = Array.from({ length: N }, () => Array(N).fill(-1));
  cars.forEach((c, i) => {
    for (let k = 0; k < c.len; k++) {
      const r = c.r + (c.d === 'v' ? k : 0);
      const cc = c.c + (c.d === 'h' ? k : 0);
      g[r][cc] = i;
    }
  });
  return g;
}
function trafficKey(cars) {
  return cars.map((c) => (c.d === 'h' ? c.c : c.r)).join(',');
}
function trafficSolve(cars0) {
  // BFS: ėjimas – vieno rąsto paslinkimas bet kiek langelių
  const start = cars0.map((c) => ({ ...c }));
  const q = [start];
  const seen = new Map([[trafficKey(start), 0]]);
  for (let qi = 0; qi < q.length; qi++) {
    const cars = q[qi];
    const d = seen.get(trafficKey(cars));
    const t = cars[0];
    const g = grid(cars);
    // laisvas kelias iki išėjimo?
    let free = true;
    for (let c = t.c + t.len; c < N; c++) if (g[EXIT_ROW][c] !== -1) free = false;
    if (free) return d + 1; // paskutinis ėjimas – išvažiuoti
    if (q.length > 250000) return null;
    cars.forEach((car, i) => {
      for (const dir of [-1, 1]) {
        for (let step = 1; step < N; step++) {
          const nr = car.r + (car.d === 'v' ? dir * step : 0);
          const nc = car.c + (car.d === 'h' ? dir * step : 0);
          const endR = nr + (car.d === 'v' ? car.len - 1 : 0);
          const endC = nc + (car.d === 'h' ? car.len - 1 : 0);
          if (nr < 0 || nc < 0 || endR >= N || endC >= N) break;
          const cr = dir > 0 ? endR : nr;
          const ccol = dir > 0 ? endC : nc;
          if (g[cr][ccol] !== -1 && g[cr][ccol] !== i) break;
          const nxt = cars.map((x) => ({ ...x }));
          nxt[i].r = nr;
          nxt[i].c = nc;
          const k = trafficKey(nxt);
          if (!seen.has(k)) {
            seen.set(k, d + 1);
            q.push(nxt);
          }
        }
      }
    });
  }
  return null;
}
function genTraffic() {
  const levels = [];
  TRAFFIC_TARGET.forEach((target, li) => {
    let best = null;
    for (let attempt = 0; attempt < 30000; attempt++) {
      const r = rng(5000 + li * 131 + attempt);
      const cars = [{ r: EXIT_ROW, c: Math.floor(r() * 3), len: 2, d: 'h' }];
      let tries = 0;
      while (cars.length < TRAFFIC_BLOCKERS[li] + 1 && tries++ < 200) {
        const len = r() < 0.7 ? 2 : 3;
        const d = r() < 0.5 ? 'h' : 'v';
        if (d === 'h' && cars.length > 0 && r() < 0.5) continue;
        const rr = Math.floor(r() * (d === 'v' ? N - len + 1 : N));
        const cc = Math.floor(r() * (d === 'h' ? N - len + 1 : N));
        if (d === 'h' && rr === EXIT_ROW) continue; // gulsčias rąstas vežimėlio eilėje – neišsprendžiama
        const g = grid(cars);
        let ok = true;
        for (let k = 0; k < len; k++) if (g[rr + (d === 'v' ? k : 0)][cc + (d === 'h' ? k : 0)] !== -1) ok = false;
        if (ok) cars.push({ r: rr, c: cc, len, d });
      }
      const moves = trafficSolve(cars);
      if (moves == null || moves < 2 && target > 1) continue;
      if (!best || Math.abs(moves - target) < Math.abs(best.par - target)) best = { cars, par: moves };
      if (moves === target) break;
      if (moves >= target && li >= 14 && attempt > 6000) break;
    }
    levels.push(best);
    console.log(`  eismas ${li + 1}: norma ${best.par} (tikslas ${target}), rąstų ${best.cars.length - 1}`);
  });
  return levels;
}

// =====================================================================
// 3. Spalvų sudoku: kiekvienoje eilutėje, stulpelyje (ir blokelyje) – visi daiktai po kartą.
// =====================================================================
const SUDOKU_PARAMS = [
  // [dydis, blokelio aukštis, blokelio plotis (0 – be blokelių), tuščių langelių]
  [4, 2, 2, 6], [4, 2, 2, 7], [4, 2, 2, 8], [4, 2, 2, 9], [4, 2, 2, 10], [4, 2, 2, 11], [4, 2, 2, 12],
  [6, 2, 3, 12], [6, 2, 3, 14], [6, 2, 3, 16], [6, 2, 3, 18], [6, 2, 3, 20], [6, 2, 3, 21], [6, 2, 3, 22],
  [6, 2, 3, 23], [6, 2, 3, 24], [6, 2, 3, 25], [6, 2, 3, 26], [6, 2, 3, 27], [6, 2, 3, 28],
];
function sudokuSolutions(g, n, bh, bw, limit = 2) {
  let count = 0;
  const cells = g.slice();
  const ok = (i, v) => {
    const r = Math.floor(i / n);
    const c = i % n;
    for (let k = 0; k < n; k++) if (cells[r * n + k] === v || cells[k * n + c] === v) return false;
    if (bh) {
      const r0 = r - (r % bh);
      const c0 = c - (c % bw);
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) if (cells[(r0 + y) * n + c0 + x] === v) return false;
    }
    return true;
  };
  const rec = () => {
    const i = cells.indexOf(-1);
    if (i < 0) return ++count >= limit;
    for (let v = 0; v < n; v++) {
      if (ok(i, v)) {
        cells[i] = v;
        if (rec()) return true;
        cells[i] = -1;
      }
    }
    return false;
  };
  rec();
  return count;
}
function genSudoku() {
  return SUDOKU_PARAMS.map(([n, bh, bw, blanks], li) => {
    const r = rng(9000 + li * 53);
    // Pilnas sprendinys: pagrindinis raštas + sumaišytos eilutės/stulpeliai/simboliai blokelių ribose.
    let sol = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) sol.push(bh ? ((y % bh) * bw + Math.floor(y / bh) + x) % n : (y + x) % n);
    const sym = shuffle(r, [...Array(n).keys()]);
    sol = sol.map((v) => sym[v]);
    const groups = bh ? n / bh : 1;
    const rowOrder = bh ? shuffle(r, [...Array(groups).keys()]).flatMap((g) => shuffle(r, [...Array(bh).keys()]).map((k) => g * bh + k)) : shuffle(r, [...Array(n).keys()]);
    const colGroups = bh ? n / bw : 1;
    const colOrder = bh ? shuffle(r, [...Array(colGroups).keys()]).flatMap((g) => shuffle(r, [...Array(bw).keys()]).map((k) => g * bw + k)) : shuffle(r, [...Array(n).keys()]);
    sol = rowOrder.flatMap((y) => colOrder.map((x) => sol[y * n + x]));
    // Išimam langelius, kol sprendinys lieka vienintelis.
    const puzzle = sol.slice();
    let removed = 0;
    for (const i of shuffle(r, [...Array(n * n).keys()])) {
      if (removed >= blanks) break;
      const keep = puzzle[i];
      puzzle[i] = -1;
      if (sudokuSolutions(puzzle, n, bh, bw) === 1) removed++;
      else puzzle[i] = keep;
    }
    const kinds = shuffle(r, [0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, n);
    return { n, bh, bw, kinds, puzzle, solution: sol };
  });
}

console.log('Surūšiuok…');
const sort = genSort();
sort.forEach((l, i) => console.log(`  ${i + 1}: ${l.tubes.length - l.tubes.filter((t) => !t.length).length} rūšys, norma ${l.par}`));
writeFileSync(new URL('sort.json', OUT), JSON.stringify(sort));
console.log('Miško eismas…');
writeFileSync(new URL('traffic.json', OUT), JSON.stringify(genTraffic()));
console.log('Spalvų sudoku…');
writeFileSync(new URL('sudoku.json', OUT), JSON.stringify(genSudoku()));
console.log('Baigta.');
