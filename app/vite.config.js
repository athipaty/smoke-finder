import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // The app imports the rule texts from ../src/rules.js, outside this folder.
  server: { fs: { allow: ['..'] } },
})
