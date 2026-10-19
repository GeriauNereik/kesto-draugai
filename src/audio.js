// Garsas: 1) įrašytas mp3, 2) speechSynthesis lt-LT, 3) tyla (tekstas rodomas burbule).
//
// Raktai yra keliai be plėtinio, pvz. 'phrases/labas', 'letters/a_nosine', 'numbers/3'.
// Kurie mp3 failai egzistuoja, žinoma iš build metu sugeneruoto sąrašo,
// todėl nėra 404 užklausų trūkstamiems failams.
import { AUDIO_FILES, AUDIO_PACKS, AUDIO_PACKED } from 'virtual:audio-manifest';
import { phraseKey, phraseText } from './personal.js';
import { ALPHABET } from './config/alphabet.js';

const BASE = `${import.meta.env.BASE_URL}assets/audio/`;
const available = new Set(AUDIO_FILES);

const NUMBER_WORDS = [
  '', 'vienas', 'du', 'trys', 'keturi', 'penki', 'šeši', 'septyni', 'aštuoni', 'devyni', 'dešimt',
];

let ctx = null;
const buffers = new Map(); // key -> Promise<AudioBuffer|null>
let current = null; // dabar grojantis AudioBufferSourceNode
let token = 0; // didinamas kiekvieną kartą pertraukiant, kad sena seka sustotų
let ltVoice = null;
let muted = false;

/** TTS tekstas raktui (naudojamas, kai mp3 nėra). */
export function textFor(key) {
  const [group, name] = key.split('/');
  if (group === 'phrases') return phraseText(name);
  if (group === 'numbers') return NUMBER_WORDS[Number(name)] ?? name;
  if (group === 'letters') {
    const l = ALPHABET.find((x) => x.file === name);
    return l ? l.name : name; // pavadinimas tekstu („i trumpoji“), ne pati raidė
  }
  return '';
}

function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const voices = speechSynthesis.getVoices();
  ltVoice =
    voices.find((v) => v.lang === 'lt-LT') ||
    voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('lt')) ||
    null;
}

function resumeCtx() {
  if (ctx && ctx.state !== 'running') ctx.resume?.().catch(() => {});
}

// iOS sustabdo AudioContext po skambučio, užrakinimo ar grįžus iš fono.
// Atgaivinti galima tik vartotojo gestu, todėl klausomės kiekvieno palietimo.
document.addEventListener('pointerdown', resumeCtx, { capture: true, passive: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stop();
});

if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

/**
 * Atrakina garsą iOS Safari. Kviesti TIK iš paspaudimo apdorojimo funkcijos.
 */
export function unlockAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC && !ctx) ctx = new AC();
    if (ctx) {
      ctx.resume?.()?.catch?.(() => {});
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    }
  } catch {
    /* garso nebus, bet žaidimas veiks */
  }
  try {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      speechSynthesis.speak(u);
      pickVoice();
    }
  } catch {
    /* ignoruojam */
  }
}

const packs = new Map(); // paketo nr. -> Promise<ArrayBuffer>
const fetchBytes = (url) => fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))));

/** mp3 baitai: atskiras failas arba gabalas iš sujungto paketo (artefakto versijoje). */
function loadBytes(key) {
  const packed = AUDIO_PACKED[key];
  if (!packed) return fetchBytes(`${BASE}${key}.mp3`);
  const [n, offset, length] = packed;
  if (!packs.has(n)) {
    const p = fetchBytes(`${import.meta.env.BASE_URL}${AUDIO_PACKS[n]}`);
    p.catch(() => packs.delete(n)); // nepavyko – kitą kartą bandysim iš naujo
    packs.set(n, p);
  }
  return packs.get(n).then((all) => all.slice(offset, offset + length));
}

function loadBuffer(key) {
  if (!available.has(key) || !ctx) return Promise.resolve(null);
  if (!buffers.has(key)) {
    const p = loadBytes(key)
      .then(
        (data) =>
          new Promise((resolve, reject) => {
            // Senas Safari palaiko tik callback formą.
            const res = ctx.decodeAudioData(data, resolve, reject);
            if (res && res.then) res.then(resolve, reject);
          })
      )
      .then((buf) => ({ buf, ...trimSilence(buf) }))
      .catch(() => {
        buffers.delete(key); // nepavyko (pvz. be interneto) – kitą kartą bandysim vėl
        return null;
      });
    buffers.set(key, p);
  }
  return buffers.get(key);
}

/** Iš anksto užkrauna dažnai naudojamus įrašus. */
export function preload(keys) {
  keys.forEach((k) => loadBuffer(k));
}

/**
 * Randa, kur prasideda ir baigiasi garsas (be tylos kraštuose).
 * Sintezuoti ir įrašyti failai dažnai turi ~0,5–1 s tylos – sekoje „Kur raidė… A“ ji labai jaučiasi.
 */
function trimSilence(buf, threshold = 0.01, pad = 0.04) {
  const data = buf.getChannelData(0);
  let a = 0;
  let b = data.length - 1;
  while (a < b && Math.abs(data[a]) < threshold) a++;
  while (b > a && Math.abs(data[b]) < threshold) b--;
  const start = Math.max(0, a / buf.sampleRate - pad);
  const end = Math.min(buf.duration, b / buf.sampleRate + pad * 2);
  return end > start ? { start, dur: end - start } : { start: 0, dur: buf.duration };
}

function playBuffer({ buf, start, dur }, myToken) {
  return new Promise((resolve) => {
    if (myToken !== token) return resolve();
    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      let timer = null;
      const done = () => {
        clearTimeout(timer);
        if (current === src) current = null;
        resolve();
      };
      src.onended = done;
      current = src;
      src.start(0, start, dur);
      // Atsarga: jei AudioContext sustabdytas (pvz. rėmelyje ar po fono), onended neateina –
      // nelaukiam amžinai, o pavėlavusio garso nebegrojam.
      timer = setTimeout(() => {
        try {
          src.stop();
        } catch {
          /* jau sustojo */
        }
        done();
      }, (dur + 0.6) * 1000);
    } catch {
      resolve();
    }
  });
}

function speakTTS(text, myToken) {
  return new Promise((resolve) => {
    if (!text || !ltVoice || myToken !== token || !('speechSynthesis' in window)) return resolve();
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = ltVoice;
      u.lang = ltVoice.lang || 'lt-LT';
      u.rate = 0.9;
      u.pitch = 1.1;
      let done = false;
      const finish = () => {
        if (!done) {
          done = true;
          resolve();
        }
      };
      u.onend = finish;
      u.onerror = finish;
      // Apsauga, jei onend neateina (pasitaiko iOS).
      setTimeout(finish, 1500 + text.length * 120);
      speechSynthesis.speak(u);
    } catch {
      resolve();
    }
  });
}

/** Sustabdo bet kokį grojantį garsą ir nutraukia seką. */
export function stop() {
  token++;
  try {
    current?.stop();
  } catch {
    /* jau sustojo */
  }
  current = null;
  try {
    if ('speechSynthesis' in window && (speechSynthesis.speaking || speechSynthesis.pending)) {
      speechSynthesis.cancel();
    }
  } catch {
    /* ignoruojam */
  }
}

/** Frazėms parenka giminės variantą (phrases/saunuolis → phrases/saunuole). */
function resolve(key) {
  const [group, name] = key.split('/');
  return group === 'phrases' ? `phrases/${phraseKey(name)}` : key;
}

async function sayOne(rawKey, myToken) {
  const key = resolve(rawKey);
  if (myToken !== token) return;
  resumeCtx();
  const buf = await loadBuffer(key);
  if (myToken !== token) return;
  if (buf) return playBuffer(buf, myToken);
  return speakTTS(textFor(key), myToken);
}

/**
 * Ištaria vieną raktą arba jų seką. Nutraukia ankstesnį garsą.
 * Grąžina Promise, kuris išsipildo pasibaigus (arba nutraukus).
 */
export async function say(keys) {
  stop();
  if (muted) return; // tekstas burbule vis tiek rodomas
  const myToken = token;
  const list = Array.isArray(keys) ? keys : [keys];
  for (const k of list) {
    if (myToken !== token) return;
    await sayOne(k, myToken);
  }
}

/** Ar galima bent kažką ištarti (mp3 arba lietuviškas TTS balsas). */
export function hasVoice() {
  return available.size > 0 || !!ltVoice;
}

/** Garso įjungimas / išjungimas (tėvų skiltis). */
export function setMuted(value) {
  muted = !!value;
  if (muted) stop();
}

/** Kuo dabar kalbama: įrašų skaičius ir lietuviško TTS balso vardas. */
export function voiceStatus() {
  pickVoice();
  return { recordings: available.size, ttsVoice: ltVoice ? ltVoice.name : null };
}

/** Bendras AudioContext garso efektams (null, kol neatrakinta). */
export function audioContext() {
  return muted ? null : ctx;
}
