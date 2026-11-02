(function (root) {
  'use strict'

  const KEY = 'wonder-patch.progress.v1'
  const ACTIVITIES = Object.freeze(['count', 'letters', 'patterns', 'memory', 'draw', 'color'])
  const emptyCounts = () => Object.fromEntries(ACTIVITIES.map(activity => [activity, 0]))

  function createProgressStore(providedStorage) {
    let storage = providedStorage
    if (arguments.length === 0) {
      try { storage = root.localStorage } catch { storage = null }
    }
    let enabled = false
    let available = Boolean(storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function' && typeof storage.removeItem === 'function')
    let counts = emptyCounts()

    if (available) {
      try {
        const saved = JSON.parse(storage.getItem(KEY))
        if (saved && saved.version === 1 && saved.enabled === true && saved.counts && typeof saved.counts === 'object') {
          enabled = true
          for (const activity of ACTIVITIES) {
            const value = saved.counts[activity]
            counts[activity] = Number.isInteger(value) && value >= 0 && value <= 9999 ? value : 0
          }
        }
      } catch (error) {
        if (!(error instanceof SyntaxError)) available = false
      }
    }

    function getState() {
      return { enabled, available, counts: { ...counts } }
    }

    function removeSaved() {
      // A full store may reject writes while still allowing data to be removed.
      if (storage && typeof storage.removeItem === 'function') {
        try { storage.removeItem(KEY) } catch { available = false }
      }
    }

    function persist(explicit = false) {
      if (enabled && available) {
        try {
          // An older open tab must respect saving being turned off elsewhere.
          if (!explicit) {
            const saved = JSON.parse(storage.getItem(KEY))
            if (!saved || saved.version !== 1 || saved.enabled !== true) {
              enabled = false
              return getState()
            }
          }
          storage.setItem(KEY, JSON.stringify({ version: 1, enabled: true, counts }))
        } catch {
          available = false
          enabled = false
          removeSaved()
        }
      }
      return getState()
    }

    function setEnabled(value) {
      enabled = value === true && available
      if (enabled) return persist(true)
      removeSaved()
      return getState()
    }

    function recordCompletion(activity) {
      if (!ACTIVITIES.includes(activity)) throw new RangeError('Unknown progress activity.')
      counts = { ...counts, [activity]: Math.min(9999, counts[activity] + 1) }
      return persist()
    }

    function reset() {
      counts = emptyCounts()
      return setEnabled(false)
    }

    return Object.freeze({ getState, setEnabled, recordCompletion, reset })
  }

  const api = Object.freeze({ KEY, ACTIVITIES, createProgressStore })
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.LocalProgress = api
})(globalThis)
