import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BASE = process.env.VITE_BASE || '/road-to-the-final/'

export default defineConfig({
  plugins: [react()],
  base: BASE,
  build: { outDir: 'dist', sourcemap: false },
})