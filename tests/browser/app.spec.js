const { test, expect } = require('@playwright/test')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

async function go(page, activity = '') {
  await page.goto('/#/' + activity)
  await expect(page.locator('body')).toHaveAttribute('data-view', activity || 'home')
  await expect(page.locator('main h1')).toHaveCount(1)
}

async function answer(page, kind) {
  let value
  if (kind === 'count') value = String(await page.locator('.frame-cell.is-filled').count())
  else if (kind === 'letters') value = (await page.locator('.letter-card span').textContent()).toLowerCase()
  else {
    const label = await page.locator('.pattern-row').getAttribute('aria-label')
    const sequence = label.replace('Pattern: ', '').split(', ').slice(0, -1)
    const period = [2, 3].find(size => sequence.every((shape, index) => shape === sequence[index % size]))
    value = sequence[sequence.length % period]
  }
  return page.locator(`.choice[data-id="${value}"]`)
}

async function finishRound(page, kind, retry = false) {
  for (let i = 0; i < 5; i += 1) {
    const correct = await answer(page, kind)
    if (retry && i === 0) {
      const id = await correct.getAttribute('data-id')
      await page.locator(`.choice:not([data-id="${id}"])`).first().click()
      await expect(page.locator('.feedback')).toHaveText('Not this one. Try another')
      await expect(page.locator('.next')).toBeHidden()
    }
    await correct.click()
    await expect(page.locator('.next')).toBeFocused()
    await page.keyboard.press('Enter')
  }
  await expect(page.getByRole('heading', { name: 'Patch finished' })).toBeVisible()
}

function assertNoRuntimeProblems(page, origin) {
  const errors = []
  const external = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('request', request => {
    const url = request.url()
    if (!url.startsWith(origin) && !url.startsWith('file:') && !url.startsWith('blob:') && !url.startsWith('data:')) external.push(url)
  })
  return () => { expect(errors).toEqual([]); expect(external).toEqual([]) }
}

test('six activities work with keyboard navigation and no external requests', async ({ page }) => {
  const verify = assertNoRuntimeProblems(page, 'http://127.0.0.1:4381')
  await go(page)
  await expect(page.locator('.tile')).toHaveCount(6)
  await expect(page.getByRole('link', { name: /Counting/ })).toBeVisible()
  for (const activity of ['count', 'letters', 'patterns', 'memory', 'draw', 'color']) {
    await page.locator(`.tile[href="#/${activity}"]`).focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('body')).toHaveAttribute('data-view', activity)
    await expect(page.locator('main h1')).toBeFocused()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.getByRole('link', { name: 'All games', exact: true }).click()
    await expect(page.locator('.tile')).toHaveCount(6)
    await expect(page.locator(`.tile[href="#/${activity}"]`)).toBeFocused()
  }
  await page.keyboard.press('Shift+Tab')
  await expect(page.locator('.tile[href="#/draw"]')).toBeFocused()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await go(page, 'memory')
  expect(parseFloat(await page.locator('.card-inner').first().evaluate(element => getComputedStyle(element).transitionDuration))).toBeLessThanOrEqual(0.001)
  verify()
})

test('all quiz rounds allow retries, finish once, and save only after opt-in', async ({ page }) => {
  const verify = assertNoRuntimeProblems(page, 'http://127.0.0.1:4381')
  for (const kind of ['count', 'letters', 'patterns']) {
    await go(page, kind)
    await finishRound(page, kind, true)
  }
  expect(await page.evaluate(() => localStorage.length)).toBe(0)
  await go(page, 'grown-ups')
  await expect(page.getByRole('switch')).not.toBeChecked()
  for (const label of ['Counting', 'Letter match', 'Patterns']) {
    await expect(page.getByRole('row', { name: label + ' 1', exact: true })).toBeVisible()
  }
  await page.getByRole('switch').focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('switch')).toBeChecked()
  await page.reload()
  await expect(page.getByRole('switch')).toBeChecked()
  await expect(page.getByRole('row', { name: 'Counting 1', exact: true })).toBeVisible()
  await page.getByRole('switch').focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('switch')).not.toBeChecked()
  expect(await page.evaluate(() => localStorage.length)).toBe(0)
  await page.getByRole('button', { name: 'Reset counts', exact: true }).click()
  await page.getByRole('button', { name: 'Yes, reset', exact: true }).click()
  await expect(page.getByRole('row', { name: 'Counting 0', exact: true })).toBeVisible()
  verify()
})

test('memory handles a rapid third click, leaving a pending reset, and finding all pairs', async ({ page }) => {
  const verify = assertNoRuntimeProblems(page, 'http://127.0.0.1:4381')
  await go(page, 'memory')
  const names = await page.locator('.card-name').allTextContents()
  const other = names.findIndex(name => name !== names[0])
  const third = names.findIndex((_, index) => index !== 0 && index !== other)
  await page.locator('.card').nth(0).click()
  await page.locator('.card').nth(other).click()
  await page.locator('.card').nth(third).click()
  await expect(page.locator('.card.is-up')).toHaveCount(2)
  await page.getByRole('link', { name: 'All games', exact: true }).click()
  await page.waitForTimeout(750)
  await expect(page.locator('.tile')).toHaveCount(6)
  await page.locator('.tile[href="#/memory"]').click()
  await expect(page.locator('.card')).toHaveCount(12)
  const current = await page.locator('.card-name').allTextContents()
  for (const name of new Set(current)) {
    const indices = current.map((value, index) => value === name ? index : -1).filter(index => index >= 0)
    await page.locator('.card').nth(indices[0]).click()
    await page.locator('.card').nth(indices[1]).click()
  }
  await expect(page.locator('.card.is-matched')).toHaveCount(12)
  await expect(page.getByRole('heading', { name: 'Patch finished' })).toBeVisible()
  await go(page, 'grown-ups')
  await expect(page.getByRole('row', { name: 'Memory 1', exact: true })).toBeVisible()
  verify()
})

test('drawing supports pointer and keyboard strokes, undo, clear recovery and a real SVG download', async ({ page }, testInfo) => {
  const verify = assertNoRuntimeProblems(page, 'http://127.0.0.1:4381')
  await go(page, 'draw')
  const paper = page.getByRole('img', { name: 'Drawing paper', exact: true })
  const bounds = await paper.boundingBox()
  await page.mouse.move(bounds.x + 35, bounds.y + 35)
  await page.mouse.down()
  await page.mouse.move(bounds.x + 180, bounds.y + 120, { steps: 10 })
  await page.mouse.up()
  await expect(page.locator('.ink path')).toHaveCount(1)
  await page.locator('.skip').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('body')).toHaveAttribute('data-view', 'draw')
  await expect(page.locator('.ink path')).toHaveCount(1)
  expect(await page.evaluate(() => document.querySelector('main').contains(document.activeElement))).toBe(true)
  await paper.focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Space')
  await expect(page.locator('.ink path')).toHaveCount(2)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.locator('.ink path')).toHaveCount(1)
  await page.getByRole('button', { name: 'Clear', exact: true }).click()
  await page.getByRole('button', { name: 'Yes, clear it', exact: true }).click()
  await expect(page.locator('.ink path')).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.locator('.ink path')).toHaveCount(1)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Save picture', exact: true }).click()
  const saved = await download
  const output = testInfo.outputPath('drawing.svg')
  await saved.saveAs(output)
  const svg = readFileSync(output, 'utf8')
  expect(svg).toContain('<path')
  expect(svg).not.toMatch(/<script|<image|<foreignObject|onload=|<iframe/i)
  await page.getByRole('button', { name: 'All done', exact: true }).click()
  await paper.focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('Space')
  await expect(page.getByRole('button', { name: 'All done', exact: true })).toBeDisabled()
  await go(page, 'grown-ups')
  await expect(page.getByRole('row', { name: 'Draw 1', exact: true })).toBeVisible()
  verify()
})

test('coloring has keyboard-accessible regions, undo, reset recovery and local export', async ({ page }, testInfo) => {
  const verify = assertNoRuntimeProblems(page, 'http://127.0.0.1:4381')
  await go(page, 'color')
  await page.getByRole('button', { name: 'Sky blue', exact: true }).click()
  const fill = page.getByRole('button', { name: 'Fill sky', exact: true })
  await fill.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-zone="sky"]')).toHaveAttribute('fill', '#8fb8d8')
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.locator('[data-zone="sky"]')).toHaveAttribute('fill', '#fffdf8')
  await fill.click()
  await page.getByRole('button', { name: 'Start over', exact: true }).click()
  await page.getByRole('button', { name: 'Yes, start over', exact: true }).click()
  await expect(page.locator('[data-zone="sky"]')).toHaveAttribute('fill', '#fffdf8')
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.locator('[data-zone="sky"]')).toHaveAttribute('fill', '#8fb8d8')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Save picture', exact: true }).click()
  const saved = await download
  const output = testInfo.outputPath('garden.svg')
  await saved.saveAs(output)
  expect(readFileSync(output, 'utf8')).toContain('#8fb8d8')
  await page.getByRole('button', { name: 'All done', exact: true }).click()
  await page.getByRole('button', { name: 'Fill sun', exact: true }).click()
  await expect(page.getByRole('button', { name: 'All done', exact: true })).toBeDisabled()
  await go(page, 'grown-ups')
  await expect(page.getByRole('row', { name: 'Color 1', exact: true })).toBeVisible()
  verify()
})

test('subpath and downloaded-file play work offline without runtime services', async ({ page, context }) => {
  await page.goto('http://127.0.0.1:4382/test/sub/#/letters')
  await finishRound(page, 'letters')
  await context.setOffline(true)
  const local = pathToFileURL(path.resolve(__dirname, '../../index.html')).href
  await page.goto(local + '#/count')
  await finishRound(page, 'count')
  await page.reload()
  await expect(page.locator('.choice')).toHaveCount(4)
  await page.goto(local + '#/color')
  await page.getByRole('button', { name: 'Fill sky', exact: true }).click()
  await expect(page.locator('[data-zone="sky"]')).toHaveAttribute('fill', '#d9654b')
})

test('small-screen touch drawing scales correctly and storage blocking does not stop play', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await context.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage disabled for this test') } }) })
  const page = await context.newPage()
  const verify = assertNoRuntimeProblems(page, 'http://127.0.0.1:4381')
  try {
    await go(page, 'draw')
    const paper = page.locator('.draw-canvas')
    const box = await paper.boundingBox()
    await paper.evaluate(element => {
      window.__observedTouches = []
      element.addEventListener('pointerdown', event => {
        const rect = element.getBoundingClientRect()
        window.__observedTouches.push({ x: event.clientX - rect.left, y: event.clientY - rect.top, width: rect.width, height: rect.height })
      })
    })
    const session = await context.newCDPSession(page)
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + 50, y: box.y + 50 }] })
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + 100, y: box.y + 90 }] })
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect(page.locator('.ink path')).toHaveCount(1)
    const firstPoint = (await page.locator('.ink path').first().getAttribute('d')).match(/^M([\d.]+) ([\d.]+)/)
    // Mobile viewport conversion may round injected CDP coordinates. Compare the
    // actual pointer event received by the paper against the resulting SVG mark.
    const firstTouch = await page.evaluate(() => window.__observedTouches[0])
    expect(Math.abs(Number(firstPoint[1]) - firstTouch.x / firstTouch.width * 800)).toBeLessThanOrEqual(0.5)
    expect(Math.abs(Number(firstPoint[2]) - firstTouch.y / firstTouch.height * 560)).toBeLessThanOrEqual(0.5)
    await page.setViewportSize({ width: 844, height: 390 })
    const resized = await paper.boundingBox()
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: resized.x + 40, y: resized.y + 40 }] })
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect(page.locator('.ink path')).toHaveCount(2)
    const secondPoint = (await page.locator('.ink path').nth(1).getAttribute('d')).match(/^M([\d.]+) ([\d.]+)/)
    const secondTouch = await page.evaluate(() => window.__observedTouches[1])
    expect(Math.abs(Number(secondPoint[1]) - secondTouch.x / secondTouch.width * 800)).toBeLessThanOrEqual(0.5)
    expect(Math.abs(Number(secondPoint[2]) - secondTouch.y / secondTouch.height * 560)).toBeLessThanOrEqual(0.5)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await go(page, 'grown-ups')
    await expect(page.getByRole('switch')).toBeDisabled()
    await expect(page.locator('.store-status')).toContainText('not allowing saving')
    await go(page, 'count')
    await finishRound(page, 'count')
    await go(page, 'grown-ups')
    await expect(page.getByRole('row', { name: 'Counting 1', exact: true })).toBeVisible()
    verify()
  } finally { await context.close() }
})

test('every screen fits narrow 320px and 390px layouts without horizontal scrolling', async ({ page }) => {
  const verify = assertNoRuntimeProblems(page, 'http://127.0.0.1:4381')
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 })
    for (const activity of ['', 'count', 'letters', 'patterns', 'memory', 'draw', 'color', 'grown-ups']) {
      await go(page, activity)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${activity || 'home'} at ${width}px`).toBe(true)
    }
  }
  verify()
})

test('another tab respects turning saved progress off before its next completion', async ({ page, context }) => {
  await go(page, 'grown-ups')
  await page.getByRole('switch').focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('switch')).toBeChecked()
  const second = await context.newPage()
  await second.goto('/#/count')
  await expect(second.locator('body')).toHaveAttribute('data-view', 'count')
  await page.getByRole('switch').focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('switch')).not.toBeChecked()
  await finishRound(second, 'count')
  expect(await second.evaluate(() => localStorage.getItem(LocalProgress.KEY))).toBeNull()
  await go(second, 'grown-ups')
  await expect(second.getByRole('switch')).not.toBeChecked()
  await second.close()
})

test('a storage quota failure does not leave old saved counts behind', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem
    original.call(localStorage, 'wonder-patch.progress.v1', JSON.stringify({ version: 1, enabled: true, counts: { count: 5 } }))
    Storage.prototype.setItem = function (key, value) {
      if (key === 'wonder-patch.progress.v1') throw new DOMException('Storage is full', 'QuotaExceededError')
      return original.call(this, key, value)
    }
  })
  await go(page, 'count')
  await finishRound(page, 'count')
  expect(await page.evaluate(() => localStorage.getItem(LocalProgress.KEY))).toBeNull()
  await go(page, 'grown-ups')
  await expect(page.getByRole('switch')).toBeDisabled()
  await expect(page.getByRole('row', { name: 'Counting 6', exact: true })).toBeVisible()
})

test('holding the drawing pen toggle key does not repeatedly lift the pen', async ({ page }) => {
  await go(page, 'draw')
  const paper = page.locator('.draw-canvas')
  await paper.focus()
  await page.keyboard.down('Space')
  await page.keyboard.down('Space')
  await expect(page.locator('.pen-state')).toHaveText('Pen down')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.up('Space')
  await expect(page.locator('.ink path')).toHaveCount(1)
  expect(await page.locator('.ink path').getAttribute('d')).toContain('416')
  await page.keyboard.press('Space')
  await expect(page.locator('.pen-state')).toHaveText('Pen up')
})

test('counting pictures keep the list-item roles needed to count them', async ({ page }) => {
  await go(page, 'count')
  const pictures = await page.locator('.frame-cell.is-filled').count()
  const list = page.getByRole('list', { name: /A frame with ten spaces/ })
  await expect(list.getByRole('listitem')).toHaveCount(pictures)
})

test('the named pattern image has no orphan list-item roles', async ({ page }) => {
  await go(page, 'patterns')
  const picture = page.getByRole('img', { name: /^Pattern:/ })
  await expect(picture).toBeVisible()
  await expect(picture.getByRole('listitem')).toHaveCount(0)
})

test('holding Enter on a quiz answer keeps the feedback until a fresh press', async ({ page }) => {
  await go(page, 'letters')
  await (await answer(page, 'letters')).focus()
  await page.keyboard.down('Enter')
  await page.keyboard.down('Enter')
  await page.keyboard.up('Enter')
  await expect(page.locator('.stitches-label')).toHaveText('Question 1 of 5')
  await expect(page.locator('.feedback')).toContainText('right')
  await expect(page.locator('.next')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('.stitches-label')).toHaveText('Question 2 of 5')
})

test('holding Enter on the last memory card keeps the finished board', async ({ page }) => {
  await go(page, 'memory')
  const names = await page.locator('.card-name').allTextContents()
  const pairs = [...new Set(names)].map(name => names.flatMap((value, index) => value === name ? [index] : []))
  for (let index = 0; index < pairs.length; index += 1) {
    await page.locator('.card').nth(pairs[index][0]).click()
    const last = page.locator('.card').nth(pairs[index][1])
    if (index < pairs.length - 1) await last.click()
    else {
      await last.focus()
      await page.keyboard.down('Enter')
      await page.keyboard.down('Enter')
      await page.keyboard.down('Enter')
      await page.keyboard.up('Enter')
    }
  }
  await expect(page.getByRole('heading', { name: 'Patch finished' })).toBeVisible()
  await expect(page.locator('.card.is-matched')).toHaveCount(12)
})

test('clicking drawing paper moves keyboard focus away from Undo', async ({ page }) => {
  await go(page, 'draw')
  const paper = page.locator('.draw-canvas')
  await paper.click({ position: { x: 40, y: 40 } })
  await paper.click({ position: { x: 80, y: 80 } })
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await paper.click({ position: { x: 120, y: 120 } })
  await expect(paper).toBeFocused()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Space')
  await expect(page.locator('.ink path')).toHaveCount(3)
  await expect(page.locator('.pen-state')).toHaveText('Pen up')
})

test('a pending color announcement does not follow navigation home', async ({ page }) => {
  await go(page, 'color')
  // Same-task clicks keep this regression independent of machine/automation speed.
  await page.getByRole('button', { name: 'Plum', exact: true }).evaluate(button => {
    button.click()
    document.querySelector('.back').click()
  })
  await expect(page.locator('body')).toHaveAttribute('data-view', 'home')
  await page.waitForTimeout(100)
  await expect(page.locator('#announcer')).toBeEmpty()
})

for (const activity of ['draw', 'color']) {
  test(`undo dismisses a stale ${activity} clear confirmation`, async ({ page }) => {
    await go(page, activity)
    if (activity === 'draw') await page.locator('.draw-canvas').click({ position: { x: 40, y: 40 } })
    else await page.getByRole('button', { name: 'Fill sky', exact: true }).click()
    const clear = activity === 'draw' ? 'Clear' : 'Start over'
    const confirm = activity === 'draw' ? 'Yes, clear it' : 'Yes, start over'
    await page.getByRole('button', { name: clear, exact: true }).click()
    await expect(page.getByRole('button', { name: confirm, exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await expect(page.getByRole('button', { name: confirm, exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: clear, exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
  })
}

test('memory answers stay out of page text until a card is flipped', async ({ page }) => {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    await page.emulateMedia({ reducedMotion })
    await go(page, 'memory')
    const names = await page.locator('.card-name').allTextContents()
    for (const name of new Set(names)) expect(await page.locator('.mem-grid').innerText()).not.toContain(name)
    const different = names.findIndex(name => name !== names[0])
    await page.locator('.card').first().click()
    await expect(page.locator('.card-name').first()).toBeVisible()
    expect(await page.locator('.mem-grid').innerText()).toContain(names[0])
    await page.locator('.card').nth(different).click()
    await expect(page.locator('.card.is-up')).toHaveCount(0)
    await expect(page.locator('.card-name').first()).toBeHidden()
    for (const name of new Set(names)) expect(await page.locator('.mem-grid').innerText()).not.toContain(name)
  }
})
