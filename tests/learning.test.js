const test = require('node:test')
const assert = require('node:assert/strict')
const games = require('../src/learning.js')

function seeded(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

function freeze(value) {
  Object.freeze(value)
  for (const child of Object.values(value)) if (child && typeof child === 'object' && !Object.isFrozen(child)) freeze(child)
  return value
}

test('each generated question has four distinct choices and exactly one correct answer', () => {
  const random = seeded(38)
  for (const kind of ['count', 'letters', 'patterns']) {
    for (let i = 0; i < 250; i += 1) {
      const question = games.makeQuestion(kind, i, random)
      assert.equal(question.choices.length, 4)
      assert.equal(new Set(question.choices.map(choice => choice.id)).size, 4)
      assert.equal(question.choices.filter(choice => games.checkAnswer(question, choice.id)).length, 1)
      assert.equal(games.checkAnswer(question, '<script>'), false)
      assert.equal(games.checkAnswer(question, null), false)
      if (kind === 'count') {
        assert.equal(question.visual.items.length, question.target)
        assert.ok(question.target >= 1 && question.target <= 10)
      } else if (kind === 'letters') {
        assert.match(question.visual.letter, /^[A-Z]$/)
        assert.equal(question.answer, question.visual.letter.toLowerCase())
      } else {
        const sequence = question.visual.sequence
        const periods = [2, 3].filter(period => sequence.every((shape, index) => shape === sequence[index % period]))
        assert.ok(periods.some(period => sequence[sequence.length % period] === question.target))
        assert.ok(sequence.every(shape => games.SHAPES.includes(shape)))
      }
    }
  }
})

test('rounds allow retries and count every question at most once', () => {
  let state = games.createRound('count', seeded(5))
  for (let index = 0; index < 5; index += 1) {
    freeze(state)
    const question = state.questions[state.index]
    const wrong = question.choices.find(choice => choice.id !== question.answer).id
    assert.equal(games.answerRound(state, wrong).state, state)
    assert.equal(games.nextRound(state), state)
    const result = games.answerRound(state, question.answer)
    assert.equal(result.correct, true)
    assert.equal(result.state.correct, index + 1)
    assert.equal(games.answerRound(result.state, question.answer).alreadyAnswered, true)
    assert.equal(games.answerRound(result.state, question.answer).state.correct, index + 1)
    state = games.nextRound(result.state)
  }
  assert.equal(state.complete, true)
  assert.equal(state.correct, 5)
  assert.equal(games.nextRound(state), state)
  assert.equal(games.answerRound(state, '1').alreadyAnswered, true)
})

test('memory ignores repeated/third clicks and keeps matched pairs visible', () => {
  let state = games.createMemory(['sun', 'leaf', 'moon'], seeded(8))
  assert.equal(state.cards.length, 6)
  assert.equal(new Set(state.cards.map(card => card.id)).size, 6)
  const first = state.cards[0]
  const other = state.cards.find(card => card.pairId !== first.pairId)
  const extra = state.cards.find(card => card.id !== first.id && card.id !== other.id)
  freeze(state)
  state = games.revealCard(state, first.id)
  assert.equal(games.revealCard(state, first.id), state)
  state = games.revealCard(state, other.id)
  assert.equal(state.locked, true)
  assert.equal(state.moves, 1)
  assert.equal(games.revealCard(state, extra.id), state)
  state = games.resolveMemory(state)
  assert.equal(state.flipped.length, 0)
  assert.equal(state.locked, false)
  for (const symbol of ['sun', 'leaf', 'moon']) {
    const pair = state.cards.filter(card => card.pairId === symbol)
    state = games.revealCard(state, pair[0].id)
    state = games.revealCard(state, pair[1].id)
    assert.ok(state.cards.filter(card => card.pairId === symbol).every(card => card.matched))
    assert.equal(games.revealCard(state, pair[0].id), state)
  }
  assert.equal(state.complete, true)
  assert.equal(state.matches, 3)
  assert.equal(state.moves, 4)
})

test('coordinates scale to the drawing surface and stay inside its bounds', () => {
  const rect = { left: 10, top: 20, width: 200, height: 100 }
  assert.deepEqual(games.normalizePoint(110, 70, rect, 1000, 500), { x: 500, y: 250 })
  assert.deepEqual(games.normalizePoint(-100, 500, rect, 1000, 500), { x: 0, y: 500 })
  assert.deepEqual(games.normalizePoint(NaN, 50, { ...rect, height: 0 }, 1000, 500), { x: 0, y: 0 })
})

test('shuffle does not mutate its input and rejects invalid random generators', () => {
  const input = Object.freeze([1, 2, 3, 4])
  assert.deepEqual(games.shuffle(input, seeded(10)).slice().sort(), input)
  assert.throws(() => games.shuffle(input, () => 1), RangeError)
  assert.throws(() => games.makeQuestion('unknown'), RangeError)
  assert.throws(() => games.createMemory(['same', 'same']), RangeError)
})
