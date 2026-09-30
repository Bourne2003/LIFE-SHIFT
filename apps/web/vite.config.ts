import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset URLs so the same build runs from any host or sub-path (LAN IP, CDN, file server).
  base: './',
  envDir: '../..',
  server: { port: 5173 },
  build: {
    target: 'es2022',
    // Phaser alone is ~1.2 MB minified; revisit if the game's own code grows past this.
    chunkSizeWarningLimit: 1600,
  },
});
