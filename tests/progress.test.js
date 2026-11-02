const test = require('node:test')
const assert = require('node:assert/strict')
const { KEY, createProgressStore } = require('../src/progress.js')

function memoryStorage(initial) {
  const values = new Map(initial ? [[KEY, initial]] : [])
  const writes = []
  return {
    values, writes,
    getItem(key) { return values.get(key) ?? null },
    setItem(key, value) { writes.push([key, value]); values.set(key, value) },
    removeItem(key) { values.delete(key) }
  }
}

test('progress is session-only until explicitly enabled; disabling removes it', () => {
  const storage = memoryStorage()
  const store = createProgressStore(storage)
  assert.equal(store.getState().enabled, false)
  store.recordCompletion('count')
  assert.equal(storage.writes.length, 0)
  assert.equal(store.getState().counts.count, 1)
  store.setEnabled(true)
  assert.equal(JSON.parse(storage.values.get(KEY)).counts.count, 1)
  store.recordCompletion('count')
  assert.equal(createProgressStore(storage).getState().counts.count, 2)
  store.setEnabled(false)
  assert.equal(storage.values.has(KEY), false)
  assert.equal(store.getState().counts.count, 2)
})

test('reset clears progress and disables saving', () => {
  const storage = memoryStorage()
  const store = createProgressStore(storage)
  store.setEnabled(true)
  store.recordCompletion('letters')
  assert.equal(store.reset().counts.letters, 0)
  assert.equal(store.getState().enabled, false)
  assert.equal(storage.values.has(KEY), false)
})

test('untrusted stored values are bounded and cannot add arbitrary fields', () => {
  const store = createProgressStore(memoryStorage(JSON.stringify({
    version: 1, enabled: true,
    counts: { count: 4, letters: -5, memory: '99', patterns: 1.5, draw: 999999999, color: 2, email: 'ignored' }
  })))
  assert.deepEqual(store.getState().counts, { count: 4, letters: 0, patterns: 0, memory: 0, draw: 0, color: 2 })
  const state = store.getState()
  state.counts.count = 900
  assert.equal(store.getState().counts.count, 4)
  assert.throws(() => store.recordCompletion('__proto__'), RangeError)
})

test('corrupt, older and unavailable storage never prevents play', () => {
  assert.equal(createProgressStore(memoryStorage('{broken')).getState().enabled, false)
  assert.equal(createProgressStore(memoryStorage('{"version":99,"enabled":true}')).getState().enabled, false)
  const unavailable = createProgressStore(null)
  assert.equal(unavailable.getState().available, false)
  assert.equal(unavailable.recordCompletion('memory').counts.memory, 1)
  const blocked = createProgressStore({ getItem() { throw new Error('Blocked') }, setItem() {}, removeItem() {} })
  assert.equal(blocked.getState().available, false)
  assert.equal(blocked.setEnabled(true).enabled, false)
  const full = createProgressStore({ getItem() { return null }, setItem() { throw new Error('Quota') }, removeItem() {} })
  assert.equal(full.setEnabled(true).available, false)
  assert.equal(full.recordCompletion('color').counts.color, 1)
})

test('a failed save removes stale saved counts and reset can still remove data', () => {
  const storage = memoryStorage()
  const store = createProgressStore(storage)
  store.setEnabled(true)
  store.recordCompletion('count')
  storage.setItem = () => { throw new Error('Quota exceeded') }
  assert.equal(store.recordCompletion('count').enabled, false)
  assert.equal(storage.values.has(KEY), false)
  storage.values.set(KEY, JSON.stringify({ version: 1, enabled: true, counts: { count: 8 } }))
  store.reset()
  assert.equal(storage.values.has(KEY), false)
  assert.equal(createProgressStore(storage).getState().counts.count, 0)
})

test('another open tab cannot silently re-enable saving after it was turned off', () => {
  const storage = memoryStorage()
  const first = createProgressStore(storage)
  first.setEnabled(true)
  const second = createProgressStore(storage)
  assert.equal(second.getState().enabled, true)
  first.setEnabled(false)
  assert.equal(second.recordCompletion('letters').enabled, false)
  assert.equal(storage.values.has(KEY), false)
  assert.equal(second.getState().counts.letters, 1)
})
