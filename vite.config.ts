import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { offlineSupport } from './scripts/vite-offline'

export default defineConfig({
  base: './',
  plugins: [react(), offlineSupport()],
  test: { include: ['tests/**/*.test.ts'], setupFiles: ['tests/setup.ts'] },
})
