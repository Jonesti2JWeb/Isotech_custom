import { defineConfig } from 'vite';

// Solo dev server: il sito è statico e si pubblica così com'è (nessun build).
export default defineConfig({
  server: {
    port: 5173,
  },
});
