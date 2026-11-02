(function (root) {
  'use strict'

  const SHAPES = Object.freeze(['circle', 'triangle', 'square', 'star'])
  const SYMBOLS = Object.freeze(['leaf', 'sun', 'flower', 'moon', 'star', 'heart'])
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

  function randomIndex(length, random) {
    const value = random()
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError('Random values must be between 0 inclusive and 1 exclusive.')
    }
    return Math.floor(value * length)
  }

  function shuffle(items, random = Math.random) {
    const result = items.slice()
    for (let index = result.length - 1; index > 0; index -= 1) {
      const other = randomIndex(index + 1, random)
      ;[result[index], result[other]] = [result[other], result[index]]
    }
    return result
  }

  function shapeLabel(shape) {
    return SHAPES.includes(shape) ? shape[0].toUpperCase() + shape.slice(1) : 'Shape'
  }

  function makeQuestion(kind, round = 0, random = Math.random) {
    const id = `${kind}-${round}`
    if (kind === 'count') {
      const target = 1 + randomIndex(10, random)
      const alternatives = shuffle(Array.from({ length: 10 }, (_, i) => i + 1).filter(n => n !== target), random).slice(0, 3)
      return {
        id, kind, prompt: 'How many flowers can you count?', target,
        choices: shuffle([target, ...alternatives], random).map(value => ({ id: String(value), label: String(value), value })),
        visual: { type: 'count', items: Array.from({ length: target }, () => 'flower') },
        answer: String(target)
      }
    }
    if (kind === 'letters') {
      const target = LETTERS[randomIndex(LETTERS.length, random)]
      const alternatives = shuffle(LETTERS.filter(letter => letter !== target), random).slice(0, 3)
      return {
        id, kind, prompt: 'Find the little letter that matches.', target,
        choices: shuffle([target, ...alternatives], random).map(letter => ({ id: letter.toLowerCase(), label: letter.toLowerCase(), value: letter.toLowerCase() })),
        visual: { type: 'letter', letter: target }, answer: target.toLowerCase()
      }
    }
    if (kind === 'patterns') {
      const shapes = shuffle(SHAPES, random)
      const pattern = [[0, 1], [0, 0, 1], [0, 1, 2]][randomIndex(3, random)]
      const length = pattern.length === 2 ? 5 : 6
      const sequence = Array.from({ length }, (_, i) => shapes[pattern[i % pattern.length]])
      const target = shapes[pattern[length % pattern.length]]
      return {
        id, kind, prompt: 'Which shape comes next?', target,
        choices: shuffle(SHAPES, random).map(value => ({ id: value, label: shapeLabel(value), value })),
        visual: { type: 'pattern', sequence }, answer: target
      }
    }
    throw new RangeError('Unknown learning activity.')
  }

  function checkAnswer(question, choiceId) {
    return typeof choiceId === 'string' && question.choices.some(choice => choice.id === choiceId) && question.answer === choiceId
  }

  function createRound(kind, random = Math.random) {
    return {
      kind, index: 0, total: 5, correct: 0, answered: false, complete: false,
      questions: Array.from({ length: 5 }, (_, index) => makeQuestion(kind, index, random))
    }
  }

  function answerRound(state, choiceId) {
    if (state.complete || state.answered) return { state, correct: false, alreadyAnswered: true }
    const correct = checkAnswer(state.questions[state.index], choiceId)
    return {
      state: correct ? { ...state, correct: state.correct + 1, answered: true } : state,
      correct, alreadyAnswered: false
    }
  }

  function nextRound(state) {
    if (!state.answered || state.complete) return state
    return state.index + 1 === state.total
      ? { ...state, complete: true }
      : { ...state, index: state.index + 1, answered: false }
  }

  function createMemory(symbols = SYMBOLS, random = Math.random) {
    if (!Array.isArray(symbols) || symbols.length < 2 || symbols.length > 8 || new Set(symbols).size !== symbols.length || symbols.some(symbol => typeof symbol !== 'string' || !symbol || symbol.length > 24)) {
      throw new RangeError('Choose two to eight different memory symbols.')
    }
    const cards = symbols.flatMap((symbol, index) => [0, 1].map(copy => ({ id: `card-${index}-${copy}`, pairId: symbol, symbol, matched: false })))
    return { cards: shuffle(cards, random), flipped: [], matches: 0, moves: 0, locked: false, complete: false }
  }

  function revealCard(state, id) {
    const card = state.cards.find(item => item.id === id)
    if (state.locked || state.complete || !card || card.matched || state.flipped.includes(id)) return state
    const flipped = [...state.flipped, id]
    if (flipped.length < 2) return { ...state, flipped }
    const first = state.cards.find(item => item.id === flipped[0])
    if (first.pairId !== card.pairId) return { ...state, flipped, moves: state.moves + 1, locked: true }
    const matches = state.matches + 1
    return {
      ...state, flipped: [], moves: state.moves + 1, matches,
      cards: state.cards.map(item => flipped.includes(item.id) ? { ...item, matched: true } : item),
      complete: matches === state.cards.length / 2
    }
  }

  function resolveMemory(state) {
    return state.locked ? { ...state, flipped: [], locked: false } : state
  }

  function normalizePoint(clientX, clientY, rect, width, height) {
    const coordinate = (value, offset, size, limit) => {
      if (![value, offset, size, limit].every(Number.isFinite) || size <= 0 || limit <= 0) return 0
      return Math.min(limit, Math.max(0, ((value - offset) / size) * limit))
    }
    return { x: coordinate(clientX, rect.left, rect.width, width), y: coordinate(clientY, rect.top, rect.height, height) }
  }

  const api = Object.freeze({ SHAPES, SYMBOLS, shuffle, shapeLabel, makeQuestion, checkAnswer, createRound, answerRound, nextRound, createMemory, revealCard, resolveMemory, normalizePoint })
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.LearningGames = api
})(globalThis)
