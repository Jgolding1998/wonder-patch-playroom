const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const { root, publicFiles } = require('./files.js')

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' }

function createServer(base = '/') {
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base)) throw new Error('Base must be a path such as / or /play/.')
  return http.createServer((request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Referrer-Policy', 'no-referrer')
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    response.setHeader('Cache-Control', 'no-store')
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }); response.end('Method not allowed'); return
    }
    let pathname
    try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname) }
    catch { response.writeHead(400); response.end('Bad request'); return }
    if (base !== '/' && pathname === base.slice(0, -1)) {
      response.writeHead(307, { Location: base }); response.end(); return
    }
    const relative = pathname.startsWith(base) ? pathname.slice(base.length) || 'index.html' : null
    if (!relative || !publicFiles().includes(relative)) {
      response.writeHead(404); response.end('Not found'); return
    }
    const filename = path.join(root, relative)
    try {
      const info = fs.lstatSync(filename)
      if (!info.isFile() || info.isSymbolicLink()) throw new Error('Not a public file')
      response.writeHead(200, { 'Content-Type': types[path.extname(relative)], 'Content-Length': info.size })
      if (request.method === 'HEAD') response.end()
      else fs.createReadStream(filename).on('error', () => response.destroy()).pipe(response)
    } catch { response.writeHead(404); response.end('Not found') }
  })
}

if (require.main === module) {
  const option = flag => { const index = process.argv.indexOf(flag); return index < 0 ? undefined : process.argv[index + 1] }
  const port = Number(option('--port') ?? process.env.PORT ?? 4381)
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Choose a valid port.')
  const base = option('--base') || '/'
  const server = createServer(base)
  server.listen(port, '127.0.0.1', () => console.log(`Wonder Patch: http://127.0.0.1:${server.address().port}${base}`))
}

module.exports = { createServer }
