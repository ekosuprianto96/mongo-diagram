import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const appVersion = process.env.VITE_APP_VERSION || pkg.version

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const target = process.env.BUILD_TARGET || 'default'

  let outDir = 'docs'
  let base = './'

  if (target === 'laravel') {
    outDir = 'packages/laravel/dist'
    // Laravel might need a different base if not serving from root vendor
    base = './'
  } else if (target === 'express') {
    outDir = 'packages/express/dist'
  }

  console.log(`Building for target: ${target} -> ${outDir}`)

  return {
    base,
    plugins: [vue()],
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    build: {
      outDir,
      assetsDir: 'assets',
      emptyOutDir: true,
      rollupOptions: target !== 'default' ? {
        output: {
          entryFileNames: `assets/[name].js`,
          chunkFileNames: `assets/[name].js`,
          assetFileNames: `assets/[name].[ext]`
        }
      } : {}
    },
  }
})
