const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')

const root = path.join(__dirname, '..')
const standalone = path.join(root, '.next', 'standalone', 'dashboard')

// 1. Copy public folder
const publicSource = path.join(root, 'public')
const publicDest = path.join(standalone, 'public')
if (fs.existsSync(publicSource)) {
  console.log('Copying public folder...')
  fs.cpSync(publicSource, publicDest, { recursive: true })
}

// 2. Copy static folder
const staticSource = path.join(root, '.next', 'static')
const staticDest = path.join(standalone, '.next', 'static')
if (fs.existsSync(staticSource)) {
  console.log('Copying static folder...')
  fs.cpSync(staticSource, staticDest, { recursive: true })
}

// 3. Start the server
const port = process.env.PORT || '3000'
console.log(`Starting standalone server on port ${port}...`)
const server = spawn('node', ['server.js'], {
  cwd: standalone,
  stdio: 'inherit',
  env: { ...process.env, PORT: port },
})

server.on('close', code => {
  process.exit(code)
})
