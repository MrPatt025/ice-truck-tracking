const fs = require('node:fs')
const path = require('node:path')
const { webcrypto } = require('node:crypto')
const { spawn } = require('node:child_process')
const { setTimeout: delay } = require('node:timers/promises')

const root = path.join(__dirname, '..')
const standalone = path.join(root, '.next', 'standalone', 'dashboard')
const pnpmPackagesRoot = path.join(root, '.next', 'standalone', 'node_modules', '.pnpm')
const RETRYABLE_CODES = new Set(['EPERM', 'EACCES', 'EBUSY', 'ENOTEMPTY'])
const LINKED_PACKAGES = ['react', 'react-dom']
const cryptoSource = globalThis.crypto ?? webcrypto

function getRetryJitter(maxExclusive) {
  const bytes = new Uint32Array(1)
  cryptoSource.getRandomValues(bytes)
  return bytes[0] % maxExclusive
}

async function withRetry(operation, label) {
  const maxAttempts = 5

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      const code = typeof error === 'object' && error !== null ? error.code : undefined
      if (!RETRYABLE_CODES.has(code) || attempt === maxAttempts) {
        throw error
      }

      const jitter = getRetryJitter(75)
      const waitMs = 100 * attempt * attempt + jitter
      console.warn(`[start-standalone] ${label} retry ${attempt}/${maxAttempts} after ${code}`)
      await delay(waitMs)
    }
  }

  return undefined
}

async function copyIfExists(source, destination) {
  let stats;
  try {
    stats = await withRetry(() => fs.promises.stat(source), `stat ${source}`)
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  if (!stats?.isDirectory()) {
    return
  }

  // Windows EPERM mitigation: remove destination directory before copy
  await withRetry(() => fs.promises.rm(destination, { recursive: true, force: true }), `rm ${destination}`)

  await withRetry(
    () => fs.promises.cp(source, destination, { recursive: true, force: true }),
    `copy ${source}`
  )
}

async function materializePackageLink(linkPath) {
  const linkStats = await withRetry(() => fs.promises.lstat(linkPath), `lstat ${linkPath}`)
  if (!linkStats.isSymbolicLink()) {
    return
  }

  const linkTarget = await withRetry(() => fs.promises.readlink(linkPath), `readlink ${linkPath}`)
  const resolvedTarget = path.resolve(path.dirname(linkPath), linkTarget)

  await withRetry(() => fs.promises.rm(linkPath, { recursive: true, force: true }), `remove ${linkPath}`)
  await withRetry(
    () => fs.promises.cp(resolvedTarget, linkPath, { recursive: true, force: true }),
    `materialize ${linkPath}`
  )
}

async function patchPnpmPackageLinks() {
  const packageEntries = await withRetry(
    () => fs.promises.readdir(pnpmPackagesRoot, { withFileTypes: true }),
    `readdir ${pnpmPackagesRoot}`
  )

  for (const entry of packageEntries) {
    if (!entry.isDirectory() || !entry.name.startsWith('next@')) {
      continue
    }

    for (const packageName of LINKED_PACKAGES) {
      const linkPath = path.join(pnpmPackagesRoot, entry.name, 'node_modules', packageName)
      await materializePackageLink(linkPath)
    }
  }
}

async function main() {
  await copyIfExists(path.join(root, 'public'), path.join(standalone, 'public'))
  await copyIfExists(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'))
  await patchPnpmPackageLinks()

  const port = process.env.PORT || '3000'
  const server = spawn('node', ['server.js'], {
    cwd: standalone,
    stdio: 'inherit',
    env: { ...process.env, PORT: port },
  })

  server.on('close', code => {
    process.exit(code ?? 0)
  })
}

main().catch(error => {
  console.error('[start-standalone] Failed to prepare standalone server:', error)
  process.exit(1)
})
