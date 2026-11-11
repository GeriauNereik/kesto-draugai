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
//    Ėjimas – vieno rąsto paslinkimas bet kiek langelių. Lygis – sunkiausia (toliausiai nuo sprendimo)
//    tos pačios rąstų rinkinio būsena: atsitiktinai išdėliojam rąstus, apeinam VISAS pasiekiamas būsenas
//    ir nuo tikslo (laisvas kelias) skaičiuojam atstumą atgal. Taip neatsiranda „patrauk vieną rąstą“ lygių.
// =====================================================================
const N = 6;
const EXIT_ROW = 2;
// norimas mažiausias ėjimų skaičius (su išvažiavimu) ir rąstų skaičius
const TRAFFIC_TARGET = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28];
const TRAFFIC_BLOCKERS = [5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12, 12, 13, 13];

function grid(cars, pos) {
  const g = new Int8Array(N * N).fill(-1);
  cars.forEach((c, i) => {
    const p = pos[i];
    for (let k = 0; k < c.len; k++) {
      const r = c.d === 'v' ? p + k : c.r;
      const cc = c.d === 'h' ? p + k : c.c;
      g[r * N + cc] = i;
    }
  });
  return g;
}
/** Visos pasiekiamos būsenos (pos – kiekvieno rąsto koordinatė jo judėjimo kryptimi) ir kaimynai. */
function trafficSpace(cars, start) {
  const key = (pos) => pos.join(',');
  const states = [start];
  const idx = new Map([[key(start), 0]]);
  const adj = [];
  for (let si = 0; si < states.length; si++) {
    if (states.length > 120000) return null;
    const pos = states[si];
    const g = grid(cars, pos);
    const nb = [];
    cars.forEach((c, i) => {
      for (const dir of [-1, 1]) {
        for (let step = 1; step < N; step++) {
          const np = pos[i] + dir * step;
          if (np < 0 || np + c.len > N) break;
          const lead = dir > 0 ? np + c.len - 1 : np;
          const cell = c.d === 'h' ? c.r * N + lead : lead * N + c.c;
          if (g[cell] !== -1 && g[cell] !== i) break;
          const nxt = pos.slice();
          nxt[i] = np;
          const k = key(nxt);
          if (!idx.has(k)) {
            idx.set(k, states.length);
            states.push(nxt);
          }
          nb.push(idx.get(k));
        }
      }
    });
    adj[si] = nb;
  }
  return { states, adj };
}
function trafficFree(cars, pos) {
  const g = grid(cars, pos);
  for (let c = pos[0] + cars[0].len; c < N; c++) if (g[EXIT_ROW * N + c] !== -1) return false;
  return true;
}
/** Grąžina sunkiausią būseną: { pos, dist } (dist – ėjimai iki laisvo kelio). */
function trafficHardest(cars, start) {
  const sp = trafficSpace(cars, start);
  if (!sp) return null;
  const dist = new Int32Array(sp.states.length).fill(-1);
  const q = [];
  sp.states.forEach((pos, i) => {
    if (trafficFree(cars, pos)) {
      dist[i] = 0;
      q.push(i);
    }
  });
  if (!q.length) return null;
  for (let qi = 0; qi < q.length; qi++) for (const j of sp.adj[q[qi]]) if (dist[j] < 0) (dist[j] = dist[q[qi]] + 1), q.push(j);
  let best = 0;
  for (let i = 1; i < dist.length; i++) if (dist[i] > dist[best]) best = i;
  // ne „visi rąstai jau ten, kur reikia“: kelias turi būti užblokuotas
  return { pos: sp.states[best], dist: dist[best] };
}
function genTraffic() {
  const levels = [];
  TRAFFIC_TARGET.forEach((target, li) => {
    let best = null;
    const t0 = Date.now();
    for (let attempt = 0; attempt < 40000 && Date.now() - t0 < 25000; attempt++) {
      const r = rng(5000 + li * 131 + attempt);
      const cars = [{ r: EXIT_ROW, c: 0, len: 2, d: 'h' }];
      const pos = [Math.floor(r() * 3)];
      let tries = 0;
      while (cars.length < TRAFFIC_BLOCKERS[li] + 1 && tries++ < 300) {
        const len = r() < 0.72 ? 2 : 3;
        const d = r() < 0.55 ? 'v' : 'h';
        const rr = Math.floor(r() * (d === 'v' ? N - len + 1 : N));
        const cc = Math.floor(r() * (d === 'h' ? N - len + 1 : N));
        if (d === 'h' && rr === EXIT_ROW) continue; // gulsčias rąstas vežimėlio eilėje – neišsprendžiama
        const car = d === 'h' ? { r: rr, c: 0, len, d } : { r: 0, c: cc, len, d };
        const p = d === 'h' ? cc : rr;
        const g = grid(cars, pos);
        let ok = true;
        for (let k = 0; k < len; k++) {
          const cell = d === 'h' ? rr * N + p + k : (p + k) * N + cc;
          if (g[cell] !== -1) ok = false;
        }
        if (ok) cars.push(car), pos.push(p);
      }
      if (cars.length < TRAFFIC_BLOCKERS[li] + 1) continue;
      const hard = trafficHardest(cars, pos);
      if (!hard) continue;
      const par = hard.dist + 1;
      const score = (x) => (x >= target ? x - target : (target - x) * 3); // geriau truputį sunkiau nei lengviau
      if (!best || score(par) < score(best.par)) {
        const placed = cars.map((c, i) => (c.d === 'h' ? { r: c.r, c: hard.pos[i], len: c.len, d: 'h' } : { r: hard.pos[i], c: c.c, len: c.len, d: 'v' }));
        best = { cars: placed, par };
      }
      if (par === target) break;
    }
    levels.push(best);
    console.log(`  eismas ${li + 1}: norma ${best.par} (tikslas ${target}), rąstų ${best.cars.length - 1}`);
  });
  return levels;
}

// =====================================================================
// 3. Miško sudoku: kiekvienoje eilutėje, stulpelyje (ir blokelyje) – visi daiktai po kartą.
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

// =====================================================================
// 4. Vandentiekis: viršuje – statinės su spalvotu vandeniu, apačioje – kubilai, kuriems reikia tam tikros spalvos.
//    Vamzdžius galima sukti, čiaupus – atsukti/užsukti. Vanduo teka į visas sujungtas puses; susitikusios spalvos
//    susimaišo (mėlyna + geltona = žalia). Lygis kuriamas nuo sprendimo: nutiesiami vamzdynai (tinklai) nuo statinių
//    iki kubilų, likę langeliai užpildomi apgaulingais vamzdžiais, pridedami čiaupai, tada viskas pasukama atsitiktinai.
//    Kaukė: Š=1, R=2, P=4, V=8 (šiaurė, rytai, pietūs, vakarai).
// =====================================================================
const PIPE_PARAMS = [
  // [eilutės, stulpeliai, tinklai (šaltinių spalvos ir kubilų skaičius), reikalingi čiaupai, apgaulingi čiaupai]
  [4, 4, [['b', 1]], 0, 0],
  [4, 4, [['y', 1]], 0, 0],
  [5, 4, [['b', 2]], 0, 0],
  [5, 4, [['b', 1], ['y', 1]], 0, 0],
  [5, 5, [['r', 1], ['b', 1]], 1, 0],
  [5, 5, [['by', 1]], 0, 0],
  [5, 5, [['b', 1], ['y', 1]], 0, 1],
  [6, 5, [['ry', 1], ['b', 1]], 1, 0],
  [6, 5, [['br', 1], ['y', 1]], 0, 1],
  [6, 5, [['b', 1], ['y', 1], ['r', 1]], 1, 0],
  [6, 6, [['by', 2], ['r', 1]], 0, 1],
  [6, 6, [['b', 1], ['ry', 1]], 1, 1],
  [6, 6, [['by', 1], ['r', 2]], 1, 1],
  [7, 6, [['b', 1], ['y', 1], ['r', 1]], 0, 2],
  [7, 6, [['ry', 1], ['b', 2]], 2, 1],
  [7, 6, [['br', 1], ['y', 1], ['r', 0]], 1, 2],
  [7, 6, [['by', 1], ['ry', 0], ['r', 1]], 1, 2],
  [7, 6, [['b', 2], ['ry', 1]], 2, 2],
  [7, 6, [['by', 1], ['r', 1], ['y', 1]], 2, 2],
  [7, 6, [['bry', 1], ['b', 1]], 2, 2],
];
const DIRS = [[-1, 0, 1], [0, 1, 2], [1, 0, 4], [0, -1, 8]]; // dr, dc, bitas
const OPP = { 1: 4, 2: 8, 4: 1, 8: 2 };
const rotMask = (m, k = 1) => {
  for (let i = 0; i < ((k % 4) + 4) % 4; i++) m = ((m << 1) | (m >> 3)) & 15;
  return m;
};
/** Vandens tekėjimas: kiekvienam langeliui – spalvų rinkinys. Grąžina kubilų spalvas. */
function pipeFlow(L, masks, open) {
  const { rows, cols } = L;
  const color = Array(rows * cols).fill('');
  for (const s of L.sources) {
    const start = s.c;
    if (!(masks[start] & 1) || open[start] === false) continue;
    const seen = new Set([start]);
    const q = [start];
    while (q.length) {
      const i = q.pop();
      if (!color[i].includes(s.color)) color[i] += s.color;
      const r = Math.floor(i / cols);
      const c = i % cols;
      for (const [dr, dc, bit] of DIRS) {
        if (!(masks[i] & bit)) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
        const j = nr * cols + nc;
        if (!(masks[j] & OPP[bit]) || open[j] === false || seen.has(j)) continue;
        seen.add(j);
        q.push(j);
      }
    }
  }
  const norm = (x) => [...new Set(x)].sort().join('');
  return L.tanks.map((t) => {
    const i = (rows - 1) * cols + t.c;
    return masks[i] & 4 && open[i] !== false ? norm(color[i]) : '';
  });
}
/** Atsitiktinis kelias tarp langelių (A* su atsitiktiniais svoriais – vingiuotas), tik per laisvus langelius. */
function pipeRoute(r, rows, cols, from, targets, free) {
  const w = Array.from({ length: rows * cols }, () => 1 + r() * 4);
  const dist = new Map([[from, 0]]);
  const prev = new Map();
  const open = [from];
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (dist.get(open[i]) < dist.get(open[bi])) bi = i;
    const i = open.splice(bi, 1)[0];
    if (targets.has(i) && i !== from) {
      const path = [i];
      while (prev.has(path[0])) path.unshift(prev.get(path[0]));
      return path;
    }
    const rr = Math.floor(i / cols);
    const cc = i % cols;
    for (const [dr, dc] of DIRS) {
      const nr = rr + dr;
      const nc = cc + dc;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
      const j = nr * cols + nc;
      if (!targets.has(j) && !free(j)) continue;
      const d = dist.get(i) + w[j];
      if (!dist.has(j) || d < dist.get(j)) {
        dist.set(j, d);
        prev.set(j, i);
        if (!open.includes(j)) open.push(j);
      }
    }
  }
  return null;
}
function link(masks, a, b, cols) {
  const ar = Math.floor(a / cols), ac = a % cols, br = Math.floor(b / cols), bc = b % cols;
  for (const [dr, dc, bit] of DIRS) if (ar + dr === br && ac + dc === bc) {
    masks[a] |= bit;
    masks[b] |= OPP[bit];
  }
}
function genPipeLevel([rows, cols, nets, reqValves, decoyValves], li) {
  for (let attempt = 0; attempt < 5000; attempt++) {
    const r = rng(20000 + li * 211 + attempt);
    const N2 = rows * cols;
    const owner = Array(N2).fill(-1);
    const masks = Array(N2).fill(0);
    const sources = [];
    const tanks = [];
    // stulpeliai šaltiniams ir kubilams (skirtingi)
    const srcCols = shuffle(r, [...Array(cols).keys()]);
    const tankCols = shuffle(r, [...Array(cols).keys()]);
    let ok = true;
    nets.forEach(([colors, nTanks], ni) => {
      if (!ok) return;
      const terms = [];
      for (const col of colors) {
        const c = srcCols.shift();
        if (c === undefined) return (ok = false);
        sources.push({ c, color: col });
        terms.push({ cell: c, edge: 1 });
      }
      for (let k = 0; k < nTanks; k++) {
        const c = tankCols.shift();
        if (c === undefined) return (ok = false);
        tanks.push({ c, need: [...colors].sort().join('') });
        terms.push({ cell: (rows - 1) * cols + c, edge: 4 });
      }
      if (nTanks === 0) {
        // tinklas be kubilo – tik trukdo (jo spalva neturi patekti kitur)
      }
      // medis: pirmas terminalas, tada kiekvienas kitas prijungiamas prie artimiausio medžio langelio
      const first = terms[0].cell;
      if (owner[first] !== -1) return (ok = false);
      owner[first] = ni;
      masks[first] |= terms[0].edge;
      const tree = new Set([first]);
      for (const t of terms.slice(1)) {
        if (owner[t.cell] !== -1 && owner[t.cell] !== ni) return (ok = false);
        if (tree.has(t.cell)) {
          masks[t.cell] |= t.edge;
          continue;
        }
        const path = pipeRoute(r, rows, cols, t.cell, tree, (j) => owner[j] === -1);
        if (!path) return (ok = false);
        path.forEach((j) => (owner[j] = ni));
        for (let k = 0; k + 1 < path.length; k++) link(masks, path[k], path[k + 1], cols);
        path.forEach((j) => tree.add(j));
        masks[t.cell] |= t.edge;
      }
    });
    if (!ok) continue;
    const used = owner.filter((o) => o >= 0).length;
    if (used < N2 * 0.4) continue; // per trumpi vamzdynai – per lengva
    // čiaupai: reikalingi (ant tiesaus tinklo vamzdžio, pradžioje užsukti) ir apgaulingi (jungia skirtingus tinklus – turi būti užsukti)
    const valve = {};
    const straight = (j) => masks[j] === 5 || masks[j] === 10;
    const cand = shuffle(r, [...Array(N2).keys()].filter((j) => owner[j] >= 0 && straight(j)));
    for (let k = 0; k < reqValves; k++) {
      const j = cand.shift();
      if (j === undefined) {
        ok = false;
        break;
      }
      valve[j] = { need: true, open: false };
    }
    if (!ok) continue;
    for (let k = 0; k < decoyValves && ok; k++) {
      // trumpa atšaka per laisvus langelius tarp dviejų skirtingų tinklų, su čiaupu tiesiame jos langelyje
      let done = false;
      for (let tries = 0; tries < 40 && !done; tries++) {
        const a = Math.floor(r() * N2);
        if (owner[a] < 0 || valve[a] || masks[a] === 15) continue;
        const others = new Set([...Array(N2).keys()].filter((j) => owner[j] >= 0 && owner[j] !== owner[a] && !valve[j] && masks[j] !== 15));
        if (!others.size) break;
        const path = pipeRoute(r, rows, cols, a, others, (j) => owner[j] === -1);
        if (!path || path.length < 3 || path.length > 6) continue;
        const mid = path.slice(1, -1);
        const tmp = masks.slice();
        for (let q = 0; q + 1 < path.length; q++) link(tmp, path[q], path[q + 1], cols);
        const vs = mid.filter((j) => tmp[j] === 5 || tmp[j] === 10);
        if (!vs.length) continue;
        for (let q = 0; q < N2; q++) masks[q] = tmp[q];
        mid.forEach((j) => (owner[j] = 99));
        valve[pick(r, vs)] = { need: false, open: true };
        done = true;
      }
      if (!done) ok = false;
    }
    if (!ok) continue;
    // apgaulingi vamzdžiai laisvuose langeliuose
    const DECOY = [5, 3, 3, 7, 5, 3];
    for (let j = 0; j < N2; j++) if (owner[j] === -1) masks[j] = rotMask(pick(r, DECOY), Math.floor(r() * 4));
    // patikra: sprendimas tikrai teisingas
    const openSol = {};
    for (const [j, v] of Object.entries(valve)) openSol[j] = v.need;
    const L = { rows, cols, sources, tanks };
    const got = pipeFlow(L, masks, openSol);
    if (got.some((g, i) => g !== tanks[i].need)) continue;
    // pradinė būsena: pasukam vamzdžius (čiaupų langeliai nesisuka), čiaupai – pradinėje padėtyje
    const tiles = [];
    let par = 0;
    const startMasks = masks.slice();
    for (let j = 0; j < N2; j++) {
      if (valve[j]) {
        tiles.push({ m: masks[j], v: valve[j].open ? 1 : 0 });
        if (valve[j].open !== valve[j].need) par++;
        continue;
      }
      const k = Math.floor(r() * 4);
      startMasks[j] = rotMask(masks[j], k);
      tiles.push({ m: startMasks[j] });
      if (owner[j] >= 0 && owner[j] !== 99) {
        // kiek paspaudimų reikia grąžinti (simetriški vamzdžiai – mažiau)
        let need = 0;
        while (rotMask(startMasks[j], need) !== masks[j]) need++;
        par += need;
      }
    }
    // pradinė būsena neturi būti jau išspręsta
    const openStart = {};
    for (const [j, v] of Object.entries(valve)) openStart[j] = !!v.open;
    const got0 = pipeFlow(L, startMasks, openStart);
    if (got0.every((g, i) => g === tanks[i].need)) continue;
    if (par < 3 + li) continue;
    return { rows, cols, sources, tanks, tiles, par };
  }
  throw new Error(`vandentiekis ${li + 1}: nepavyko sugeneruoti`);
}
function genPipes() {
  return PIPE_PARAMS.map((p, li) => {
    const lvl = genPipeLevel(p, li);
    console.log(`  vandentiekis ${li + 1}: ${lvl.rows}×${lvl.cols}, šaltiniai ${lvl.sources.map((s) => s.color).join('')}, kubilai ${lvl.tanks.map((t) => t.need).join(',')}, norma ${lvl.par}`);
    return lvl;
  });
}

// Galima sugeneruoti tik dalį: node scripts/brain/gen-levels.mjs traffic sudoku
const only = process.argv.slice(2);
const want = (id) => !only.length || only.includes(id);
if (want('sort')) {
  console.log('Surūšiuok…');
  const sort = genSort();
  sort.forEach((l, i) => console.log(`  ${i + 1}: ${l.tubes.length - l.tubes.filter((t) => !t.length).length} rūšys, norma ${l.par}`));
  writeFileSync(new URL('sort.json', OUT), JSON.stringify(sort));
}
if (want('traffic')) {
  console.log('Miško eismas…');
  writeFileSync(new URL('traffic.json', OUT), JSON.stringify(genTraffic()));
}
if (want('pipes')) {
  console.log('Vandentiekis…');
  writeFileSync(new URL('pipes.json', OUT), JSON.stringify(genPipes()));
}
if (want('sudoku')) {
  console.log('Miško sudoku…');
  writeFileSync(new URL('sudoku.json', OUT), JSON.stringify(genSudoku()));
}
console.log('Baigta.');
