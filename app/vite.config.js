import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

// Shown under Rules > About the data: engine version plus the deployed commit (Vercel).
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)

export default defineConfig({
  plugins: [react()],
  // The map library in its own file, loaded with the Nearby screen.
  // React gets its own file too; otherwise it's pulled into the map file
  // (react-leaflet uses it) and the first screen would load the map anyway.
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules[\/](leaflet|react-leaflet|@react-leaflet)[\/]/.test(id)) return 'map'
          if (/node_modules[\/](react|react-dom|scheduler)[\/]/.test(id)) return 'react'
        },
      },
    },
  },
  define: { __APP_VERSION__: JSON.stringify(commit ? `${version} (${commit})` : version) },
  // The app imports the rule texts from ../src/rules.js, outside this folder.
  server: { fs: { allow: ['..'] } },
})
