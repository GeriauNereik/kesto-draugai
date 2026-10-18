import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';
import { readdirSync, statSync, existsSync, writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { execSync } from 'node:child_process';

const AUDIO_DIR = 'public/assets/audio';

// Surenka esamus mp3 failus, kad programa nedarytų užklausų neegzistuojantiems.
function listAudio(dir = AUDIO_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return listAudio(full);
    if (!name.toLowerCase().endsWith('.mp3')) return [];
    return [relative(AUDIO_DIR, full).split(sep).join('/').replace(/\.mp3$/i, '')];
  });
}

// AUDIO_PACK=1: šių grupių mp3 sujungiami į kelis didesnius failus (assets/audio/packs/*.mp3).
// Claude artefaktas talpina ne daugiau kaip 511 failų, o vien piešimo frazių – 649.
const PACKED_GROUPS = ['draw'];
const PACK_SIZE = 1024 * 1024; // ~1 MB – vienas paketas parsisiunčia greitai net per mobilųjį ryšį

function planPacks(keys) {
  const packs = []; // [{ file, parts: [{ key, data }] }]
  const index = {}; // key -> [paketo nr., poslinkis, ilgis]
  let cur = null;
  let size = 0;
  for (const key of keys) {
    if (!PACKED_GROUPS.includes(key.split('/')[0])) continue;
    const data = readFileSync(join(AUDIO_DIR, `${key}.mp3`));
    if (!cur || size + data.length > PACK_SIZE) {
      cur = { file: `assets/audio/packs/${packs.length}.mp3`, parts: [] };
      packs.push(cur);
      size = 0;
    }
    index[key] = [packs.length - 1, size, data.length];
    cur.parts.push(data);
    size += data.length;
  }
  return { packs, index };
}

function audioManifest() {
  const id = 'virtual:audio-manifest';
  const resolved = '\0' + id;
  const pack = !!process.env.AUDIO_PACK;
  let plan = { packs: [], index: {} };
  let outDir = 'dist';
  return {
    name: 'audio-manifest',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    resolveId: (src) => (src === id ? resolved : null),
    load(src) {
      if (src !== resolved) return null;
      const keys = listAudio();
      if (pack) plan = planPacks(keys);
      return `export const AUDIO_FILES = ${JSON.stringify(keys)};
export const AUDIO_PACKS = ${JSON.stringify(plan.packs.map((p) => p.file))};
export const AUDIO_PACKED = ${JSON.stringify(plan.index)};`;
    },
    generateBundle() {
      for (const p of plan.packs) this.emitFile({ type: 'asset', fileName: p.file, source: Buffer.concat(p.parts) });
    },
    closeBundle() {
      // Atskirų supakuotų mp3 nebereikia (public/ juos nukopijavo).
      if (pack) for (const g of PACKED_GROUPS) rmSync(join(outDir, 'assets/audio', g), { recursive: true, force: true });
    },
    configureServer(server) {
      // Dev režime: pridėjus/ištrynus mp3, perkraunam sąrašą.
      const reload = (file) => {
        if (!file.includes('assets/audio') || !file.endsWith('.mp3')) return;
        const mod = server.moduleGraph.getModuleById(resolved);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', reload);
      server.watcher.on('unlink', reload);
    },
  };
}

const RIGS_DIR = 'public/assets/rigs';

// Veikėjų dalys: { veikejas: ['body.webp', 'head.webp', ...] } – kad programa žinotų, kas yra, be 404 užklausų.
function listRigs() {
  if (!existsSync(RIGS_DIR)) return {};
  const out = {};
  for (const id of readdirSync(RIGS_DIR)) {
    const dir = join(RIGS_DIR, id);
    if (!statSync(dir).isDirectory() || id.startsWith('.')) continue;
    out[id] = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.webp')).sort();
  }
  return out;
}

// Pradžios ekrano veikėjas (src/screens/start.js) – jo dalys užkraunamos kartu su HTML.
const START_RIG = 'ona';

function rigManifest() {
  const id = 'virtual:rig-manifest';
  const resolved = '\0' + id;
  let base = '/';
  return {
    name: 'rig-manifest',
    configResolved: (config) => {
      base = config.base;
    },
    transformIndexHtml: () =>
      (listRigs()[START_RIG] || []).map((f) => ({
        tag: 'link',
        attrs: { rel: 'preload', as: 'image', href: `${base}assets/rigs/${START_RIG}/${f}` },
        injectTo: 'head',
      })),
    resolveId: (src) => (src === id ? resolved : null),
    load: (src) => (src === resolved ? `export const RIG_FILES = ${JSON.stringify(listRigs())};` : null),
    configureServer(server) {
      const reload = (file) => {
        if (!file.includes('assets/rigs')) return;
        const mod = server.moduleGraph.getModuleById(resolved);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', reload);
      server.watcher.on('unlink', reload);
      // Rig redaktorius (tik dev): POST /__rig/save {name, config} -> src/rigs/{name}.json
      server.middlewares.use('/__rig/save', (req, res) => {
        if (req.method !== 'POST') return res.writeHead(405).end();
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          try {
            const { name, config } = JSON.parse(body);
            if (!/^[a-z0-9_]+$/.test(name) || !config || !Array.isArray(config.layers)) throw new Error('blogi duomenys');
            mkdirSync('src/rigs', { recursive: true });
            writeFileSync(`src/rigs/${name}.json`, JSON.stringify(config, null, 2) + '\n');
            res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true, file: `src/rigs/${name}.json` }));
          } catch (e) {
            res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: false, error: e.message }));
          }
        });
      });
    },
  };
}

// Palaikomi įrenginiai: iPhone / iPad su iOS 14 ir naujesne (Safari 14+). Vite pagal nutylėjimą
// taikosi į iOS 16.4+, todėl senesniuose iPhone JS ir CSS galėtų neveikti – nurodom aiškiai.
const LEGACY = ['es2019', 'safari14', 'ios14'];
const CSS_TARGETS = browserslistToTargets(browserslist('ios_saf >= 14, safari >= 14'));

// Versijos žymė (rodoma tėvų skiltyje): data ir commit'as – kad telefone matytųsi, kuri versija veikia.
function appVersion() {
  let sha = (process.env.GITHUB_SHA || '').slice(0, 7);
  if (!sha) {
    try {
      sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {
      sha = 'vietinė';
    }
  }
  const d = new Date().toLocaleString('lt-LT', { timeZone: 'Europe/Vilnius', dateStyle: 'short', timeStyle: 'short' });
  return `${d} · ${sha}`;
}

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(appVersion()) },
  // Be PWA įskiepio virtual:pwa-register neegzistuoja – pakeičiam tuščiu.
  resolve: process.env.NO_PWA ? { alias: [{ find: /^virtual:pwa-register$/, replacement: '/src/pwa-stub.js' }] } : {},
  // GitHub Pages: BASE=/repo-vardas/ npm run build
  base: process.env.BASE || '/',
  build: { target: LEGACY, cssTarget: ['safari14', 'ios14'] },
  // lightningcss pagal CSS_TARGETS pats prideda atsargines taisykles (pvz. inset → top/right/bottom/left).
  css: { transformer: 'lightningcss', lightningcss: { targets: CSS_TARGETS } },
  server: { host: true },
  plugins: [
    audioManifest(),
    rigManifest(),
    // NO_PWA=1 – be service worker'io (pvz. Claude artefaktui, kur jis neveikia)
    !process.env.NO_PWA && VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registruoja src/pwa.js (su atnaujinimų tikrinimu)
      manifest: {
        name: 'Kęsto draugai',
        short_name: 'Kęsto draugai',
        description: 'Lietuviškas mokomasis žaidimas vaikams',
        lang: 'lt',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'any',
        background_color: '#FFF6E5',
        theme_color: '#E3F4FF',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      includeManifestIcons: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,webp,png,svg,woff2,mp3}'],
        // bandomieji rig'ai – tik kūrimui; 649 piešimo frazės (10 MB) – ne iš anksto, o kai prireikia
        globIgnores: ['**/assets/rigs/_*/**', '**/assets/audio/draw/**'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/audio\/draw\/.*\.mp3$/,
            handler: 'CacheFirst',
            options: { cacheName: 'draw-audio', expiration: { maxEntries: 700 } },
          },
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
