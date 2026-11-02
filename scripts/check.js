const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { root, publicFiles } = require('./files.js')

const forbidden = [
  [/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/, 'network API'],
  [/\b(?:eval|Function)\s*\(/, 'dynamic code execution'],
  [/\b(?:getUserMedia|geolocation|sendBeacon)\b/, 'device or telemetry API'],
  [/\b(?:ghp_|github_pat_|sk-proj-|sk-ant-|AKIA)[A-Za-z0-9_-]{12,}/, 'credential-like value'],
  [/<(?:script|link|img|iframe)\b[^>]*(?:src|href)\s*=\s*["']https?:/i, 'remote asset'],
  [/\son[a-z]+\s*=\s*["']/i, 'inline event handler']
]
for (const file of publicFiles()) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  for (const [pattern, label] of forbidden) if (pattern.test(source)) throw new Error(`${file}: unexpected ${label}`)
  if (file.endsWith('.js')) execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'inherit' })
}
console.log('Runtime syntax and narrow network/credential checks passed. Browser tests verify real requests.')
