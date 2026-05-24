import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const node = process.execPath
const tsx = path.join(root, 'node_modules/tsx/dist/cli.mjs')
const vite = path.join(root, 'node_modules/vite/bin/vite.js')
const previewMode = process.argv.includes('--preview')

/** @type {import('node:child_process').ChildProcess[]} */
const children = []

function run(label, args) {
  const child = spawn(node, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  })
  child.on('exit', (code, signal) => {
    if (signal) return
    if (code !== 0 && code !== null) {
      console.error(`[${label}] exited with code ${code}`)
      shutdown(code)
    }
  })
  children.push(child)
  return child
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill()
  }
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

console.log('Starting API server + Vite frontend…')
run('server', [tsx, 'watch', 'server/index.ts'])
run('client', previewMode ? [vite, 'preview'] : [vite])
