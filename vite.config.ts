import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base: the same build is served from /, /staging and
// /staging/pr/<branch>, so asset URLs must stay relative.
// outDir stays `build` so the downstream deploy scripts keep working.
export default defineConfig({
  base: './',
  build: { outDir: 'build' },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
  },
})
