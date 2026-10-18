// Rig redaktorius (tik kūrimui: npm run dev → /rig-editor.html).
import { CHARACTERS } from '../config/characters.js';
import { createCharacter } from '../character/character.js';
import { rigConfig, hasRig, effectiveTuning, rigIds } from '../character/rig-config.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const pins = $('pins');

let charId = new URLSearchParams(location.search).get('v') || Object.keys(CHARACTERS).find(hasRig) || 'domas';
let cfg = null; // redaguojama konfigūracija
let rig = null;
let selected = null;
let state = 'idle';

const TUNING = [
  ['bounce', 0, 2, 0.05, 'šuolio aukštis'],
  ['tilt', 0, 2, 0.05, 'galvos pakreipimas'],
  ['speed', 0.5, 2, 0.05, 'greitis'],
  ['squash', 0, 2, 0.05, 'kūno ištempimas (0 – išjungta)'],
  ['think', 0, 2.5, 0.05, 'pakreipimas galvojant'],
  ['tail', 0, 3, 0.05, 'uodegos siūbavimas'],
  ['flaps', 0, 3, 1, 'sparnų mostai (happy)'],
];

function fillCharSelect() {
  const sel = $('char');
  const entries = Object.entries(CHARACTERS).map(([id, c]) => [id, c.name]);
  for (const id of rigIds()) if (!CHARACTERS[id]) entries.push([id, `${id.replace(/^_/, '')} (bandomasis, figūros)`]);
  for (const [id, name] of entries) {
    const o = document.createElement('option');
    o.value = id;
    o.textContent = `${name}${hasRig(id) ? '' : ' (nėra dalių – atsarginis variantas)'}`;
    sel.append(o);
  }
  sel.value = charId;
  sel.onchange = () => {
    charId = sel.value;
    history.replaceState(null, '', `?v=${charId}`);
    load();
  };
}

function load() {
  selected = null;
  cfg = hasRig(charId) ? rigConfig(charId) : null;
  $('status').innerHTML = cfg
    ? `${cfg.layers.length} sluoksn. iš <code>public/assets/rigs/${charId}/</code>`
    : `<span class="warn">Nėra dalių aplanke public/assets/rigs/${charId}/ (reikia bent body.webp ir head.webp) – rodomas atsarginis variantas.</span>`;
  renderLayers();
  renderTuning();
  rebuild();
}

function rebuild() {
  rig?.destroy();
  rig = createCharacter(stage, charId, { state, config: cfg || undefined });
  renderPins();
  renderJson();
  applyTest();
}

function renderLayers() {
  const box = $('layers');
  box.replaceChildren();
  $('test').hidden = !cfg;
  if (!cfg) return;
  cfg.layers.forEach((l) => {
    const lab = document.createElement('label');
    const r = document.createElement('input');
    r.type = 'radio';
    r.name = 'layer';
    r.value = l.id;
    r.checked = l.id === selected;
    r.onchange = () => {
      selected = l.id;
      $('rot').value = 0;
      $('ty').value = 0;
      renderPins();
      applyTest();
    };
    const pv = l.pivot ? ` · pivot [${l.pivot.map((v) => v.toFixed(2)).join(', ')}]` : '';
    lab.append(r, ` ${l.id}${l.parent ? ` ← ${l.parent}` : ''}`);
    const small = document.createElement('span');
    small.className = 'note';
    small.textContent = pv;
    lab.append(small);
    box.append(lab);
  });
}

function renderPins() {
  pins.replaceChildren();
  if (!cfg) return;
  for (const l of cfg.layers) {
    if (!l.pivot) continue;
    const p = document.createElement('div');
    p.className = `pin${l.id === selected ? ' sel' : ''}`;
    p.style.left = `${l.pivot[0] * 100}%`;
    p.style.top = `${l.pivot[1] * 100}%`;
    p.innerHTML = `<span>${l.id}</span>`;
    pins.append(p);
  }
}

// Spustelėjimas ant veikėjo nustato pasirinkto sluoksnio sukimosi tašką
pins.addEventListener('click', (e) => {
  if (!cfg || !selected) return;
  const r = pins.getBoundingClientRect();
  // veikėjas – kvadratas, užpildantis sceną
  const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
  const l = cfg.layers.find((v) => v.id === selected);
  l.pivot = [+x.toFixed(3), +y.toFixed(3)];
  renderLayers();
  rebuild();
});

function applyTest() {
  const rot = +$('rot').value;
  const ty = +$('ty').value;
  $('rotv').textContent = `${rot}°`;
  $('tyv').textContent = `${ty}%`;
  if (!rig) return;
  Object.values(rig.nodes).forEach((n) => (n.act.style.transform = ''));
  const n = selected && rig.node(selected);
  if (n) n.act.style.transform = `translateY(${ty}%) rotate(${rot}deg)`;
}
$('rot').oninput = applyTest;
$('ty').oninput = applyTest;

function renderTuning() {
  const box = $('tuning');
  box.replaceChildren();
  if (!cfg) {
    box.innerHTML = '<p class="note">Tuning galimas, kai yra dalys.</p>';
    return;
  }
  cfg.tuning = effectiveTuning(charId, cfg.tuning);
  for (const [key, min, max, step, label] of TUNING) {
    const row = document.createElement('div');
    row.className = 'row';
    row.title = label;
    const val = cfg.tuning[key];
    row.innerHTML = `<span>${key}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${val}" /><output>${val}</output>`;
    const input = row.querySelector('input');
    input.oninput = () => {
      cfg.tuning[key] = +input.value;
      row.querySelector('output').textContent = input.value;
    };
    input.onchange = rebuild;
    box.append(row);
  }
}

function exportConfig() {
  return cfg ? { name: charId, canvas: cfg.canvas || 1024, layers: cfg.layers, tuning: cfg.tuning } : null;
}
function renderJson() {
  const c = exportConfig();
  $('json').value = c ? JSON.stringify(c, null, 2) : '';
}

document.querySelectorAll('[data-state]').forEach((b) => (b.onclick = () => ((state = b.dataset.state), rig.setState(state))));
document.querySelectorAll('[data-play]').forEach((b) => (b.onclick = () => rig.play(b.dataset.play)));
$('talk').onclick = () => rig.talk(2000);

// Auto demonstracija: visos būsenos iš eilės
let demo = 0;
$('demo').onclick = async () => {
  const my = ++demo;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const label = (t) => ($('demoNow').textContent = t);
  const steps = [
    ['idle – kvėpuoja, mirksi', () => rig.setState('idle'), 3500],
    ['think – galvoja', () => rig.setState('think'), 3500],
    ['happy – džiaugiasi', () => rig.play('happy'), 1600],
    ['happy dar kartą', () => rig.play('happy'), 1600],
    ['encourage – padrąsina', () => rig.play('encourage'), 1900],
    ['talk – kalba', () => rig.talk(2500), 2900],
    ['idle', () => rig.setState('idle'), 1500],
  ];
  for (const [t, fn, ms] of steps) {
    if (my !== demo) return;
    label(t);
    fn();
    await wait(ms);
  }
  if (my === demo) label('');
};

$('download').onclick = () => {
  const c = exportConfig();
  if (!c) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(c, null, 2) + '\n'], { type: 'application/json' }));
  a.download = `${charId}.json`;
  a.click();
};
$('copy').onclick = () => navigator.clipboard?.writeText($('json').value);
$('save').onclick = async () => {
  const c = exportConfig();
  if (!c) return;
  const note = $('saveNote');
  try {
    const r = await fetch('/__rig/save', { method: 'POST', body: JSON.stringify({ name: charId, config: c }) });
    const j = await r.json();
    note.textContent = j.ok ? `Išsaugota: ${j.file}. Programa ją naudos po perkrovimo / npm run build.` : `Klaida: ${j.error}`;
  } catch {
    note.textContent = 'Nepavyko – išsaugoti galima tik per npm run dev. Naudokite „Atsisiųsti JSON“.';
  }
};

fillCharSelect();
load();
