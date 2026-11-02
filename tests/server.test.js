const test = require('node:test')
const assert = require('node:assert/strict')
const { once } = require('node:events')
const { createServer } = require('../scripts/serve.js')

test('static server exposes only public runtime files, including at a subpath', async () => {
  const server = createServer('/play/')
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const origin = `http://127.0.0.1:${server.address().port}`
  try {
    for (const route of ['/play/package.json', '/play/.env', '/play/../LICENSE', '/play/%2e%2e%2fLICENSE', '/play/src/progress.js%00', '/play/scripts/serve.js', '/src/learning.js']) {
      const response = await fetch(origin + route)
      assert.equal(response.status, 404, route)
    }
    const script = await fetch(origin + '/play/src/learning.js')
    assert.equal(script.status, 200)
    assert.match(script.headers.get('content-type'), /javascript/)
    assert.equal(script.headers.get('x-content-type-options'), 'nosniff')
    const head = await fetch(origin + '/play/src/progress.js', { method: 'HEAD' })
    assert.equal(head.status, 200)
    assert.equal(await head.text(), '')
    assert.equal((await fetch(origin + '/play/', { method: 'POST' })).status, 405)
    assert.equal((await fetch(origin + '/play', { redirect: 'manual' })).status, 307)
  } finally {
    await new Promise(resolve => server.close(resolve))
  }
})
