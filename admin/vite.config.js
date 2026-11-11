// Tėvų admin panelė – atskira nuo žaidimo.
//   npm run admin  → vietinė versija http://localhost:5180
//   npm run build  → sukompiliuojama kartu su žaidimu į dist/admin/ ir (po push į main)
//                    pasiekiama internete: https://geriaunereik.github.io/kesto-draugai/admin/
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: here('.'),
  // GitHub Pages: BASE=/kesto-draugai/ → /kesto-draugai/admin/
  base: `${process.env.BASE || '/'}admin/`,
  server: { port: 5180, open: true, fs: { allow: ['..'] } },
  build: {
    outDir: here('../dist/admin'),
    emptyOutDir: true, // valo tik dist/admin, žaidimo failai lieka
  },
});
