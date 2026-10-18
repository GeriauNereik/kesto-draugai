// Tėvų admin panelė – atskira nuo žaidimo, paleidžiama kompiuteryje: npm run admin
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  server: { port: 5180, open: true, fs: { allow: ['..'] } },
});
