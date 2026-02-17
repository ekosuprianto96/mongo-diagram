import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')
const packagePath = join(rootDir, 'package.json')
const envPath = join(rootDir, '.env')

const pkgRaw = await readFile(packagePath, 'utf8')
const pkg = JSON.parse(pkgRaw)
const version = String(pkg.version || '').trim()

if (!version) {
  console.error('Cannot sync version: package.json version is missing.')
  process.exit(1)
}

const nextLine = `VITE_APP_VERSION=${version}`
let envContent = ''

if (existsSync(envPath)) {
  envContent = await readFile(envPath, 'utf8')
}

if (/^VITE_APP_VERSION=/m.test(envContent)) {
  envContent = envContent.replace(/^VITE_APP_VERSION=.*$/m, nextLine)
} else {
  envContent = envContent.trimEnd()
  envContent = envContent ? `${envContent}\n${nextLine}\n` : `${nextLine}\n`
}

await writeFile(envPath, envContent, 'utf8')
console.log(`Synced VITE_APP_VERSION=${version} to .env`)
