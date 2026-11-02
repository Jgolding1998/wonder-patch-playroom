/* Wonder Patch — interface layer.
 * Game rules live in src/learning.js (window.LearningGames) and saved
 * counts in src/progress.js (window.LocalProgress). This file only builds
 * the screens. All text is fixed in this file; nothing is built from user
 * input with innerHTML. No network requests, no storage outside LocalProgress.
 */
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var LG = window.LearningGames;
  var LP = window.LocalProgress;
  var main = document.getElementById('main');
  var announcer = document.getElementById('announcer');

  /* ---------- small DOM helpers ---------- */

  function setProps(el, props) {
    if (!props) return;
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.setAttribute('class', v);
      else if (k === 'text') el.textContent = v;
      else if (k.indexOf('on') === 0 && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : String(v));
    });
  }
  function append(el, kids) {
    if (kids === null || kids === undefined || kids === false) return;
    if (!Array.isArray(kids)) kids = [kids];
    kids.forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
  }
  function h(tag, props, kids) {
    var el = document.createElement(tag);
    setProps(el, props);
    append(el, kids);
    return el;
  }
  function s(tag, props, kids) {
    var el = document.createElementNS(SVG_NS, tag);
    setProps(el, props);
    append(el, kids);
    return el;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  var announceTimer = null;
  function announce(msg) {
    // Clear first so repeating the same sentence is still read out.
    announcer.textContent = '';
    clearTimeout(announceTimer);
    announceTimer = setTimeout(function () { announcer.textContent = msg; }, 60);
  }

  // Focus can move to Next or Play again after one press. A held key must not
  // activate that new control too, or repeatedly toggle the drawing pen.
  document.addEventListener('keydown', function (e) {
    if (e.repeat && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  /* ---------- palette shared by drawings ---------- */

  var INK = {
    tomato: '#d9654b', marigold: '#e8a93a', leaf: '#6e8f4e', moss: '#3f6b3e',
    sky: '#5b7fa3', plum: '#8a5a83', rose: '#e8a5a0', clay: '#9a6a4a',
    cream: '#fdfbf7', ink: '#2b2620'
  };

  /* ---------- procedural symbols (viewBox 0 0 48 48) ---------- */

  function starPoints(cx, cy, outer, inner, n) {
    var pts = [];
    for (var i = 0; i < n * 2; i++) {
      var r = i % 2 === 0 ? outer : inner;
      var a = -Math.PI / 2 + (i * Math.PI) / n;
      pts.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1));
    }
    return pts.join(' ');
  }

  var SYMBOL_NAMES = {
    leaf: 'Leaf', sun: 'Sun', flower: 'Flower', moon: 'Moon', star: 'Star', heart: 'Heart',
    apple: 'Apple', acorn: 'Acorn', circle: 'Circle', triangle: 'Triangle', square: 'Square'
  };

  function symbolParts(name) {
    switch (name) {
      case 'leaf':
        return [
          s('path', { d: 'M9 39C9 21 21 10 40 8c0 19-11 31-31 31z', fill: INK.leaf }),
          s('path', { d: 'M11 37L31 17M20 28h8M24 24v-7', stroke: '#dfe8c8', 'stroke-width': 2, 'stroke-linecap': 'round', fill: 'none' })
        ];
      case 'sun':
        var rays = [];
        for (var i = 0; i < 8; i++) {
          var a = (i * Math.PI) / 4;
          rays.push(s('line', {
            x1: (24 + 14 * Math.cos(a)).toFixed(1), y1: (24 + 14 * Math.sin(a)).toFixed(1),
            x2: (24 + 20 * Math.cos(a)).toFixed(1), y2: (24 + 20 * Math.sin(a)).toFixed(1),
            stroke: INK.marigold, 'stroke-width': 3.5, 'stroke-linecap': 'round'
          }));
        }
        return rays.concat([s('circle', { cx: 24, cy: 24, r: 10, fill: INK.marigold })]);
      case 'flower':
        var petals = [];
        for (var p = 0; p < 5; p++) {
          var b = -Math.PI / 2 + (p * 2 * Math.PI) / 5;
          petals.push(s('circle', { cx: (24 + 10 * Math.cos(b)).toFixed(1), cy: (24 + 10 * Math.sin(b)).toFixed(1), r: 8, fill: INK.rose }));
        }
        return petals.concat([s('circle', { cx: 24, cy: 24, r: 6, fill: INK.marigold })]);
      case 'moon':
        return [s('path', { d: 'M29 6a18 18 0 1 0 13 30A15 15 0 0 1 29 6z', fill: INK.sky })];
      case 'star':
        return [s('polygon', { points: starPoints(24, 25, 19, 8, 5), fill: INK.plum, 'stroke-linejoin': 'round', stroke: INK.plum, 'stroke-width': 2 })];
      case 'heart':
        return [s('path', { d: 'M24 41C10 33 4 24 7 16c3-7 12-8 17-2 5-6 14-5 17 2 3 8-3 17-17 25z', fill: INK.tomato })];
      case 'apple':
        return [
          s('path', { d: 'M24 14c-8-4-17 1-17 12 0 9 7 17 12 17 2 0 3-1 5-1s3 1 5 1c5 0 12-8 12-17 0-11-9-16-17-12z', fill: INK.tomato }),
          s('path', { d: 'M24 14c0-4 2-7 5-9', stroke: INK.clay, 'stroke-width': 2.5, 'stroke-linecap': 'round', fill: 'none' }),
          s('path', { d: 'M26 11c4-4 9-4 11-1-3 3-7 4-11 1z', fill: INK.leaf })
        ];
      case 'acorn':
        return [
          s('path', { d: 'M13 22h22c0 11-5 19-11 21-6-2-11-10-11-21z', fill: '#c98a6a' }),
          s('path', { d: 'M10 22c0-7 6-11 14-11s14 4 14 11z', fill: INK.clay }),
          s('path', { d: 'M24 11V6', stroke: INK.clay, 'stroke-width': 3, 'stroke-linecap': 'round' })
        ];
      case 'circle':
        return [s('circle', { cx: 24, cy: 24, r: 17, fill: INK.tomato })];
      case 'triangle':
        return [s('path', { d: 'M24 7L42 39H6z', fill: INK.leaf, stroke: INK.leaf, 'stroke-width': 3, 'stroke-linejoin': 'round' })];
      case 'square':
        return [s('rect', { x: 8, y: 8, width: 32, height: 32, rx: 4, fill: INK.sky })];
      default:
        return [s('circle', { cx: 24, cy: 24, r: 14, fill: INK.clay })];
    }
  }

  // Pattern stars use marigold so the four pattern shapes differ in both shape and color.
  function symbol(name, cls, context) {
    var parts = symbolParts(name);
    if (context === 'pattern' && name === 'star') {
      parts = [s('polygon', { points: starPoints(24, 25, 19, 8, 5), fill: INK.marigold, stroke: INK.marigold, 'stroke-width': 2, 'stroke-linejoin': 'round' })];
    }
    return s('svg', { viewBox: '0 0 48 48', class: cls || 'sym', 'aria-hidden': 'true', focusable: 'false' }, parts);
  }

  function nameOf(name) {
    // shapeLabel only knows the four pattern shapes; other symbols use our own names.
    var shapes = (LG && LG.SHAPES) || ['circle', 'triangle', 'square', 'star'];
    if (shapes.indexOf(name) !== -1 && LG && typeof LG.shapeLabel === 'function') {
      try { var l = LG.shapeLabel(name); if (l) return l; } catch (e) { /* fall through */ }
    }
    return SYMBOL_NAMES[name] || String(name);
  }

  function itemName(item) {
    if (item && typeof item === 'object') return item.symbol || item.icon || item.type || item.name || 'dot';
    return item;
  }

  /* ---------- line icons (lucide-style, 24 grid, 1.75 stroke) ---------- */

  var ICONS = {
    back: 'M15 18l-6-6 6-6',
    next: 'M9 18l6-6-6-6',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    x: 'M7 7l10 10M17 7L7 17',
    undo: 'M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
    trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3',
    download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
    refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
    home: 'M4 11l8-7 8 7M6 10v10h12V10',
    flag: 'M5 21V4M5 4h11l-2 4 2 4H5'
  };
  function icon(name) {
    return s('svg', { viewBox: '0 0 24 24', class: 'icon', 'aria-hidden': 'true', focusable: 'false' }, [
      s('path', { d: ICONS[name], fill: 'none', stroke: 'currentColor', 'stroke-width': 1.75, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
    ]);
  }

  /* ---------- activities ---------- */

  var ACTIVITIES = [
    { id: 'count', title: 'Counting', blurb: 'How many can you see, from 1 to 10', tile: 'assets/tile-count.svg', patch: 'apricot', noun: 'counting' },
    { id: 'letters', title: 'Letter match', blurb: 'Find the small letter that goes with the big one', tile: 'assets/tile-letters.svg', patch: 'sky', noun: 'letter' },
    { id: 'patterns', title: 'Patterns', blurb: 'Look at the row and pick what comes next', tile: 'assets/tile-patterns.svg', patch: 'straw', noun: 'pattern' },
    { id: 'memory', title: 'Memory', blurb: 'Turn over cards and find 6 pairs', tile: 'assets/tile-memory.svg', patch: 'lilac', noun: 'memory' },
    { id: 'draw', title: 'Draw', blurb: 'Draw with a finger, a mouse or the arrow keys', tile: 'assets/tile-draw.svg', patch: 'sage', noun: 'drawing' },
    { id: 'color', title: 'Color', blurb: 'Fill in a garden picture with your own colors', tile: 'assets/tile-color.svg', patch: 'rose', noun: 'coloring' }
  ];
  function activity(id) {
    for (var i = 0; i < ACTIVITIES.length; i++) if (ACTIVITIES[i].id === id) return ACTIVITIES[i];
    return null;
  }

  /* ---------- progress store ---------- */

  var progress = (function () {
    var storage = null;
    try { storage = window.localStorage; } catch (e) { storage = null; }
    if (LP && typeof LP.createProgressStore === 'function') {
      try { return LP.createProgressStore(storage); } catch (e) { /* fall back below */ }
    }
    // Session-only stand-in so the screens still work if progress.js is missing.
    var counts = { count: 0, letters: 0, patterns: 0, memory: 0, draw: 0, color: 0 };
    function snap() { return { enabled: false, available: false, counts: Object.assign({}, counts) }; }
    return {
      getState: snap,
      setEnabled: function () { return snap(); },
      recordCompletion: function (a) { if (a in counts) counts[a] += 1; return snap(); },
      reset: function () { Object.keys(counts).forEach(function (k) { counts[k] = 0; }); return snap(); }
    };
  })();

  function record(activityId) {
    try { progress.recordCompletion(activityId); } catch (e) { /* counts are a nicety, never block play */ }
  }

  /* ---------- router ---------- */

  var cleanup = null;
  var firstRender = true;
  var currentRaw = null;

  // The skip link must never change the route: it would reset the current game or picture.
  function skipToContent(e) {
    if (e) e.preventDefault();
    var target = main.querySelector('h1') || main;
    if (target === main) main.setAttribute('tabindex', '-1');
    target.focus();
  }
  var skip = document.querySelector('.skip');
  if (skip) skip.addEventListener('click', skipToContent);

  function route() {
    var raw = (location.hash || '').replace(/^#\/?/, '');
    if (raw === 'main') {
      // Reached #main without the click handler (for example by typing it). Keep the
      // current view if there is one and put the previous address back without a reload.
      if (currentRaw !== null) {
        try { history.replaceState(null, '', currentRaw ? '#/' + currentRaw : location.pathname + location.search); } catch (err) { /* ignore */ }
        skipToContent();
        return;
      }
      raw = '';
    }
    var previous = currentRaw;
    currentRaw = raw;
    clearTimeout(announceTimer);
    announcer.textContent = '';
    if (typeof cleanup === 'function') { try { cleanup(); } catch (e) { /* ignore */ } }
    cleanup = null;
    clear(main);
    document.body.setAttribute('data-view', raw || 'home');

    if (!LG && raw !== 'grown-ups') {
      renderMissing();
    } else if (raw === '' ) {
      renderHome();
    } else if (raw === 'grown-ups') {
      renderGrownUps();
    } else if (raw === 'count' || raw === 'letters' || raw === 'patterns') {
      renderQuiz(raw);
    } else if (raw === 'memory') {
      renderMemory();
    } else if (raw === 'draw') {
      renderDraw();
    } else if (raw === 'color') {
      renderColor();
    } else {
      currentRaw = previous;
      location.replace('#/');
      return;
    }

    window.scrollTo(0, 0);
    if (!firstRender) {
      // Coming back to the game list puts focus on the tile just left, so keyboard
      // and screen reader users keep their place. Otherwise start at the view heading.
      var backTile = raw === '' && previous ? main.querySelector('.tile[href="#/' + previous + '"]') : null;
      var heading = backTile || main.querySelector('h1');
      if (heading) heading.focus({ preventScroll: !backTile });
    }
    firstRender = false;
  }

  function renderMissing() {
    main.appendChild(h('section', { class: 'view narrow' }, [
      h('h1', { tabindex: '-1', text: 'The games could not load' }),
      h('p', { class: 'lede', text: 'A file this page needs is missing. Try opening the folder again, or ask a grown-up to download a fresh copy.' })
    ]));
  }

  /* ---------- shared view chrome ---------- */

  function viewHeader(act, extra) {
    return h('div', { class: 'view-head' }, [
      h('a', { class: 'btn btn-quiet back', href: '#/' }, [icon('back'), h('span', { text: 'All games' })]),
      h('div', { class: 'view-title' }, [
        h('h1', { tabindex: '-1', text: act.title }),
        h('p', { class: 'view-blurb', text: act.blurb })
      ]),
      extra || null
    ]);
  }

  function stitchProgress(total) {
    var dots = [];
    for (var i = 0; i < total; i++) dots.push(h('span', { class: 'stitch' }));
    var label = h('span', { class: 'stitches-label' });
    var wrap = h('div', { class: 'stitches' }, [h('span', { class: 'stitch-row', 'aria-hidden': 'true' }, dots), label]);
    return {
      el: wrap,
      set: function (index, answered) {
        dots.forEach(function (d, i) {
          d.classList.toggle('is-done', i < index || (i === index && answered));
          d.classList.toggle('is-now', i === index && !answered);
        });
        label.textContent = 'Question ' + Math.min(index + 1, total) + ' of ' + total;
      }
    };
  }

  function celebration(act, onAgain, detail) {
    var squares = [];
    var cols = ['#d9654b', '#e8a93a', '#6e8f4e', '#5b7fa3', '#8a5a83'];
    for (var i = 0; i < 5; i++) {
      squares.push(s('rect', { x: 8 + i * 40, y: 30, width: 36, height: 36, rx: 4, fill: cols[i], class: 'cel-sq' }));
      squares.push(s('rect', { x: 12 + i * 40, y: 34, width: 28, height: 28, rx: 2, fill: 'none', stroke: '#fdfbf7', 'stroke-width': 1.4, 'stroke-dasharray': '3 3' }));
    }
    var art = s('svg', { viewBox: '0 0 216 96', class: 'cel-art', 'aria-hidden': 'true', focusable: 'false' }, [
      s('path', { d: 'M108 30V12', stroke: INK.moss, 'stroke-width': 3, 'stroke-linecap': 'round' }),
      s('path', { d: 'M108 18c-10 0-15-6-15-13 9 0 14 6 15 13z', fill: INK.moss }),
      s('path', { d: 'M108 22c8 0 12-5 12-11-7 0-11 5-12 11z', fill: INK.leaf })
    ].concat(squares));

    var again = h('button', { type: 'button', class: 'btn btn-primary', onclick: onAgain }, [icon('refresh'), h('span', { text: 'Play again' })]);
    var panel = h('div', { class: 'celebrate', role: 'group', 'aria-labelledby': 'cel-title' }, [
      art,
      h('h2', { id: 'cel-title', tabindex: '-1', text: 'Patch finished' }),
      h('p', { text: detail }),
      h('div', { class: 'actions' }, [
        again,
        h('a', { class: 'btn btn-secondary', href: '#/' }, [icon('home'), h('span', { text: 'Pick another game' })])
      ])
    ]);
    return { el: panel, focus: function () { again.focus(); } };
  }

  /* ---------- home ---------- */

  function renderHome() {
    var tiles = ACTIVITIES.map(function (a) {
      return h('li', null, [
        h('a', { class: 'tile patch-' + a.patch, href: '#/' + a.id }, [
          h('span', { class: 'tile-art' }, [h('img', { src: a.tile, alt: '', width: 160, height: 120 })]),
          h('span', { class: 'tile-text' }, [
            h('span', { class: 'tile-title', text: a.title }),
            h('span', { class: 'tile-blurb', text: a.blurb })
          ])
        ])
      ]);
    });

    main.appendChild(h('section', { class: 'view home' }, [
      h('div', { class: 'hero' }, [
        h('div', { class: 'hero-text' }, [
          h('h1', { tabindex: '-1', text: 'Pick a patch to play' }),
          h('p', { class: 'lede', text: 'Six small games for counting, letters, patterns, memory, drawing and coloring. Take your time. Every answer can be tried again.' })
        ]),
        h('img', { class: 'hero-art', src: 'assets/scene-home.svg', alt: 'A patchwork quilt lying on a green hill with sprouts, a flower, a snail and a warm sun', width: 480, height: 300 })
      ]),
      h('h2', { class: 'sr-only', text: 'Games' }),
      h('ul', { class: 'tiles', role: 'list' }, tiles)
    ]));
  }

  /* ---------- quiz: counting, letters, patterns ---------- */

  function renderQuiz(kind) {
    var act = activity(kind);
    var round;
    var steps = stitchProgress(5);
    var stage = h('div', { class: 'stage' });
    var view = h('section', { class: 'view quiz quiz-' + kind + ' patch-' + act.patch }, [viewHeader(act, steps.el), stage]);
    main.appendChild(view);

    function start() {
      round = LG.createRound(kind);
      showQuestion(false);
    }

    function current() { return round.questions[round.index]; }

    function buildVisual(q) {
      var v = q.visual || {};
      if (kind === 'count') {
        var items = Array.isArray(v.items) ? v.items : [];
        var slots = [];
        var cells = Math.max(10, items.length);
        for (var i = 0; i < cells; i++) {
          var it = items[i];
          if (it !== undefined) {
            var nm = itemName(it);
            slots.push(h('li', { class: 'frame-cell is-filled', 'aria-label': nameOf(nm) }, [symbol(nm, 'sym')]));
          } else {
            slots.push(h('li', { class: 'frame-cell', 'aria-hidden': 'true' }));
          }
        }
        var first = items.length ? nameOf(itemName(items[0])) : 'things';
        return h('div', { class: 'visual' }, [
          h('ul', { class: 'ten-frame', role: 'list', 'aria-label': 'A frame with ten spaces holding ' + first.toLowerCase() + ' pictures to count' }, slots)
        ]);
      }
      if (kind === 'letters') {
        var letter = String(v.letter || q.target || '').toUpperCase();
        return h('div', { class: 'visual' }, [
          h('div', { class: 'letter-card', role: 'img', 'aria-label': 'Big letter ' + letter }, [h('span', { 'aria-hidden': 'true', text: letter })])
        ]);
      }
      // patterns
      var seq = Array.isArray(v.sequence) ? v.sequence.slice() : [];
      var qIndex = seq.indexOf('?');
      if (qIndex === -1) { seq.push('?'); qIndex = seq.length - 1; }
      var spoken = seq.map(function (sh) { return sh === '?' ? 'what comes next' : nameOf(sh).toLowerCase(); }).join(', ');
      var row = seq.map(function (sh, i) {
        if (sh === '?') return h('li', { class: 'pat-cell is-gap', role: 'presentation', 'data-gap': String(i) }, [h('span', { 'aria-hidden': 'true', text: '?' })]);
        return h('li', { class: 'pat-cell', role: 'presentation' }, [symbol(sh, 'sym', 'pattern')]);
      });
      return h('div', { class: 'visual' }, [
        h('ol', { class: 'pattern-row', role: 'img', 'aria-label': 'Pattern: ' + spoken }, row)
      ]);
    }

    function choiceButton(q, c) {
      var kids;
      var label;
      if (kind === 'patterns') {
        var shapeName = c.value || c.label;
        label = c.label || nameOf(shapeName);
        kids = [symbol(shapeName, 'sym', 'pattern'), h('span', { class: 'choice-text', text: label })];
      } else if (kind === 'letters') {
        label = 'Letter ' + String(c.label);
        kids = [h('span', { class: 'choice-big', 'aria-hidden': 'true', text: String(c.label) })];
      } else {
        label = String(c.label);
        kids = [h('span', { class: 'choice-big', text: String(c.label) })];
      }
      var mark = h('span', { class: 'choice-mark', 'aria-hidden': 'true' });
      var btn = h('button', { type: 'button', class: 'choice', 'aria-label': label, 'data-id': String(c.id) }, kids.concat([mark]));
      btn.addEventListener('click', function () { choose(q, c, btn, label); });
      return btn;
    }

    var nextBtn = null;
    var feedback = null;

    function showQuestion(moveFocus) {
      var q = current();
      steps.set(round.index, false);
      clear(stage);
      feedback = h('p', { class: 'feedback', 'aria-hidden': 'true' });
      nextBtn = h('button', { type: 'button', class: 'btn btn-primary next', hidden: true, onclick: advance }, [
        h('span', { text: round.index + 1 >= round.total ? 'Finish' : 'Next question' }), icon('next')
      ]);
      var choices = h('div', { class: 'choices choices-' + q.choices.length, role: 'group', 'aria-label': 'Answers' },
        q.choices.map(function (c) { return choiceButton(q, c); }));
      stage.appendChild(h('div', { class: 'question' }, [
        h('h2', { class: 'prompt', id: 'q-prompt', tabindex: '-1', text: q.prompt }),
        buildVisual(q),
        choices,
        h('div', { class: 'after' }, [feedback, nextBtn])
      ]));
      if (moveFocus) stage.querySelector('.prompt').focus({ preventScroll: false });
    }

    function choose(q, c, btn, label) {
      if (round.answered || btn.classList.contains('is-right')) return;
      var res = LG.answerRound(round, c.id);
      round = res.state;
      if (res.alreadyAnswered) return;
      if (res.correct) {
        btn.classList.add('is-right');
        btn.setAttribute('aria-label', label + ', correct');
        btn.querySelector('.choice-mark').appendChild(icon('check'));
        Array.prototype.forEach.call(stage.querySelectorAll('.choice'), function (b) {
          if (b !== btn) b.disabled = true;
        });
        if (kind === 'patterns') {
          var gap = stage.querySelector('.pat-cell.is-gap');
          if (gap) {
            clear(gap);
            gap.classList.remove('is-gap');
            gap.classList.add('is-filled-in');
            gap.appendChild(symbol(c.value || c.label, 'sym', 'pattern'));
          }
        }
        feedback.textContent = 'Yes, ' + (kind === 'patterns' ? (c.label || nameOf(c.value)).toLowerCase() : String(c.label)) + ' is right';
        feedback.className = 'feedback is-right';
        steps.set(round.index, true);
        nextBtn.hidden = false;
        announce(feedback.textContent + '. ' + (round.index + 1 >= round.total ? 'Press Finish.' : 'Press Next question.'));
        nextBtn.focus();
      } else {
        btn.classList.add('is-wrong');
        btn.setAttribute('aria-label', label + ', not this one');
        clear(btn.querySelector('.choice-mark'));
        btn.querySelector('.choice-mark').appendChild(icon('x'));
        feedback.textContent = 'Not this one. Try another';
        feedback.className = 'feedback is-wrong';
        announce('Not this one. Try another.');
      }
    }

    function advance() {
      var before = round.index;
      round = LG.nextRound(round);
      if (round.complete || round.index >= round.total || round.index === before) {
        finish();
      } else {
        showQuestion(true);
      }
    }

    function finish() {
      record(kind);
      steps.set(5, true);
      clear(stage);
      var cel = celebration(act, function () { start(); stage.querySelector('.prompt').focus(); },
        'You worked through 5 ' + act.noun + ' questions.');
      stage.appendChild(cel.el);
      announce('Patch finished. You worked through 5 ' + act.noun + ' questions.');
      cel.focus();
    }

    start();
  }

  /* ---------- memory ---------- */

  function renderMemory() {
    var act = activity('memory');
    var state;
    var timer = null;
    var buttons = {};
    var status = h('p', { class: 'mem-status' });
    var grid = h('div', { class: 'mem-grid', role: 'group', 'aria-label': 'Cards. Use the arrow keys to move between cards.' });
    var stage = h('div', { class: 'stage' });
    var view = h('section', { class: 'view memory patch-' + act.patch }, [viewHeader(act, status), stage]);
    main.appendChild(view);

    function start() {
      if (timer) { clearTimeout(timer); timer = null; }
      state = LG.createMemory();
      buttons = {};
      clear(stage);
      clear(grid);
      state.cards.forEach(function (card, i) {
        var face = h('span', { class: 'card-face' }, [symbol(card.symbol, 'sym'), h('span', { class: 'card-name', text: nameOf(card.symbol) })]);
        var back = h('span', { class: 'card-back', 'aria-hidden': 'true' });
        var btn = h('button', { type: 'button', class: 'card', 'data-index': String(i) }, [
          h('span', { class: 'card-inner' }, [back, face])
        ]);
        btn.addEventListener('click', function () { flip(card.id); });
        buttons[card.id] = btn;
        grid.appendChild(btn);
      });
      stage.appendChild(grid);
      stage.appendChild(h('div', { class: 'mem-actions' }, [
        h('button', { type: 'button', class: 'btn btn-secondary', onclick: function () { start(); focusFirstCard(); announce('New cards. All cards are face down.'); } }, [icon('refresh'), h('span', { text: 'Mix new cards' })])
      ]));
      paint();
    }

    function focusFirstCard() { var b = grid.querySelector('.card'); if (b) b.focus(); }

    function cardById(id) {
      for (var i = 0; i < state.cards.length; i++) if (state.cards[i].id === id) return state.cards[i];
      return null;
    }

    function paint() {
      var flipped = state.flipped || [];
      state.cards.forEach(function (card, i) {
        var btn = buttons[card.id];
        var up = card.matched || flipped.indexOf(card.id) !== -1;
        btn.classList.toggle('is-up', up);
        btn.classList.toggle('is-matched', !!card.matched);
        var n = 'Card ' + (i + 1) + ', ';
        if (card.matched) btn.setAttribute('aria-label', n + nameOf(card.symbol) + ', pair found');
        else if (up) btn.setAttribute('aria-label', n + nameOf(card.symbol) + ', turned over');
        else btn.setAttribute('aria-label', n + 'face down');
        btn.setAttribute('aria-disabled', card.matched ? 'true' : 'false');
      });
      status.textContent = 'Pairs found: ' + state.matches + ' of ' + (state.cards.length / 2);
    }

    function flip(id) {
      if (timer || state.locked || state.complete) return;
      var card = cardById(id);
      if (!card || card.matched || (state.flipped || []).indexOf(id) !== -1) return;
      var before = state.matches;
      state = LG.revealCard(state, id);
      paint();
      var flipped = state.flipped || [];
      if (state.matches > before) {
        var name = nameOf(card.symbol).toLowerCase();
        if (flipped.length) state = LG.resolveMemory(state);
        paint();
        if (state.complete) return finish();
        announce('A pair of ' + name + ' cards. ' + state.matches + ' of ' + (state.cards.length / 2) + ' found.');
      } else if (flipped.length >= 2) {
        var a = cardById(flipped[0]), b = cardById(flipped[1]);
        announce(nameOf(a.symbol) + ' and ' + nameOf(b.symbol).toLowerCase() + '. Not a pair. They will turn back over.');
        timer = setTimeout(function () {
          timer = null;
          state = LG.resolveMemory(state);
          paint();
        }, 650);
      } else {
        announce(nameOf(card.symbol));
      }
    }

    function finish() {
      record('memory');
      var cel = celebration(act, function () { start(); focusFirstCard(); }, 'You found all ' + (state.cards.length / 2) + ' pairs.');
      stage.appendChild(cel.el);
      announce('Patch finished. You found all ' + (state.cards.length / 2) + ' pairs.');
      cel.focus();
    }

    grid.addEventListener('keydown', function (e) {
      var keys = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: 'up', ArrowDown: 'down', Home: 'home', End: 'end' };
      if (!(e.key in keys)) return;
      var cards = Array.prototype.slice.call(grid.querySelectorAll('.card'));
      var idx = cards.indexOf(document.activeElement);
      if (idx === -1) return;
      var cols = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 4;
      var k = keys[e.key], to = idx;
      if (k === 'up') to = idx - cols;
      else if (k === 'down') to = idx + cols;
      else if (k === 'home') to = 0;
      else if (k === 'end') to = cards.length - 1;
      else to = idx + k;
      if (to >= 0 && to < cards.length) { cards[to].focus(); }
      e.preventDefault();
    });

    cleanup = function () { if (timer) clearTimeout(timer); timer = null; };
    start();
  }

  /* ---------- palettes for draw and color ---------- */

  var PAINTS = [
    { name: 'Tomato red', hex: '#d9654b' },
    { name: 'Marigold', hex: '#e8a93a' },
    { name: 'Butter yellow', hex: '#f2d06b' },
    { name: 'Leaf green', hex: '#7da35a' },
    { name: 'Moss green', hex: '#3f6b3e' },
    { name: 'Sky blue', hex: '#8fb8d8' },
    { name: 'Deep blue', hex: '#3f6a92' },
    { name: 'Plum', hex: '#8a5a83' },
    { name: 'Rose pink', hex: '#e8a5a0' },
    { name: 'Clay brown', hex: '#9a6a4a' },
    { name: 'Cream', hex: '#f7efdc' },
    { name: 'Charcoal', hex: '#4a4440' }
  ];

  function paletteGroup(label, items, initialIndex, onPick) {
    var btns = [];
    var group = h('div', { class: 'palette', role: 'group', 'aria-label': label });
    items.forEach(function (p, i) {
      var sw = h('span', { class: 'swatch', 'aria-hidden': 'true' });
      sw.style.backgroundColor = p.hex;
      var b = h('button', { type: 'button', class: 'paint', 'aria-pressed': i === initialIndex ? 'true' : 'false' }, [sw, h('span', { class: 'paint-name', text: p.name })]);
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        onPick(p, i);
      });
      btns.push(b);
      group.appendChild(b);
    });
    return group;
  }

  function downloadSvg(svgEl, filename) {
    var text = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(svgEl);
    var blob = new Blob([text], { type: 'image/svg+xml' });
    var url = URL.createObjectURL(blob);
    var a = h('a', { href: url, download: filename, class: 'sr-only', tabindex: '-1' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function inlineConfirm(question, yesLabel, onYes, onNo) {
    var yes = h('button', { type: 'button', class: 'btn btn-danger' }, [h('span', { text: yesLabel })]);
    var no = h('button', { type: 'button', class: 'btn btn-secondary' }, [h('span', { text: 'Keep it' })]);
    var box = h('div', { class: 'confirm', role: 'group', 'aria-label': question }, [h('p', { text: question }), h('div', { class: 'actions' }, [yes, no])]);
    yes.addEventListener('click', onYes);
    no.addEventListener('click', onNo);
    return { el: box, focus: function () { no.focus(); } };
  }

  /* ---------- draw ---------- */

  function renderDraw() {
    var act = activity('draw');
    var W = 800, H = 560;
    var strokes = [];     // {color, size, points:[[x,y]...], el}
    var history = [];     // {type:'stroke'} | {type:'clear', strokes:[...]}
    var completed = false; // counted once per visit to this view
    var color = PAINTS[4].hex;
    var size = 10;
    var active = null;    // stroke being drawn by pointer
    var activePointer = null;
    var cursor = { x: W / 2, y: H / 2, down: false, stroke: null };

    var layer = s('g', { class: 'ink' });
    var cursorEl = s('g', { class: 'kb-cursor', 'aria-hidden': 'true' }, [
      s('circle', { r: 14, fill: 'none', stroke: INK.ink, 'stroke-width': 2, 'stroke-dasharray': '4 4' }),
      s('circle', { r: 3, fill: INK.ink })
    ]);
    var canvas = s('svg', {
      viewBox: '0 0 ' + W + ' ' + H, class: 'draw-canvas', tabindex: '0', role: 'img',
      'aria-label': 'Drawing paper', 'aria-describedby': 'draw-help'
    }, [s('rect', { x: 0, y: 0, width: W, height: H, fill: '#fffdf8' }), layer, cursorEl]);

    var undoBtn = h('button', { type: 'button', class: 'btn btn-secondary', disabled: true }, [icon('undo'), h('span', { text: 'Undo' })]);
    var clearBtn = h('button', { type: 'button', class: 'btn btn-secondary', disabled: true }, [icon('trash'), h('span', { text: 'Clear' })]);
    var saveBtn = h('button', { type: 'button', class: 'btn btn-secondary', disabled: true }, [icon('download'), h('span', { text: 'Save picture' })]);
    var doneBtn = h('button', { type: 'button', class: 'btn btn-primary', disabled: true }, [icon('flag'), h('span', { text: 'All done' })]);
    var penState = h('span', { class: 'pen-state', text: 'Pen up' });
    var confirmSlot = h('div', { class: 'confirm-slot' });
    var note = h('p', { class: 'quiet-note', text: 'Drawings are not kept when you leave this page. Save picture downloads an SVG file to this device.' });

    var sizes = [{ name: 'Thin', hex: '#4a4440', w: 5 }, { name: 'Medium', hex: '#4a4440', w: 10 }, { name: 'Thick', hex: '#4a4440', w: 22 }];
    var sizeGroup = h('div', { class: 'sizes', role: 'group', 'aria-label': 'Pen size' }, sizes.map(function (sz, i) {
      var dot = h('span', { class: 'size-dot', 'aria-hidden': 'true' });
      dot.style.width = dot.style.height = Math.max(6, Math.round(sz.w * 0.9)) + 'px';
      var b = h('button', { type: 'button', class: 'paint size', 'aria-pressed': i === 1 ? 'true' : 'false' }, [dot, h('span', { class: 'paint-name', text: sz.name })]);
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(sizeGroup.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        size = sz.w;
        announce(sz.name + ' pen');
      });
      return b;
    }));

    var view = h('section', { class: 'view draw patch-' + act.patch }, [
      viewHeader(act),
      h('div', { class: 'studio' }, [
        h('div', { class: 'paper-wrap' }, [
          h('div', { class: 'paper' }, [canvas]),
          h('p', { id: 'draw-help', class: 'help' }, [
            'Keyboard: click the paper or press Tab to reach it, then use the ',
            h('kbd', { text: 'Arrow' }), ' keys to move and ', h('kbd', { text: 'Space' }),
            ' to put the pen down or lift it. Hold ', h('kbd', { text: 'Shift' }), ' for small steps. ',
            penState
          ])
        ]),
        h('div', { class: 'tools' }, [
          h('h2', { class: 'tool-label', text: 'Color' }),
          paletteGroup('Pen color', PAINTS, 4, function (p) { color = p.hex; announce(p.name); }),
          h('h2', { class: 'tool-label', text: 'Pen size' }),
          sizeGroup,
          h('div', { class: 'tool-actions' }, [undoBtn, clearBtn]),
          confirmSlot,
          h('div', { class: 'tool-actions' }, [saveBtn, doneBtn]),
          note
        ])
      ])
    ]);
    main.appendChild(view);

    function pathData(pts) {
      if (pts.length === 1) return 'M' + pts[0][0] + ' ' + pts[0][1] + 'l0.01 0';
      var d = 'M' + pts[0][0] + ' ' + pts[0][1];
      for (var i = 1; i < pts.length - 1; i++) {
        var mx = ((pts[i][0] + pts[i + 1][0]) / 2).toFixed(1);
        var my = ((pts[i][1] + pts[i + 1][1]) / 2).toFixed(1);
        d += 'Q' + pts[i][0] + ' ' + pts[i][1] + ' ' + mx + ' ' + my;
      }
      var last = pts[pts.length - 1];
      return d + 'L' + last[0] + ' ' + last[1];
    }
    function newStroke(x, y) {
      var st = { color: color, size: size, points: [[x, y]] };
      st.el = s('path', { fill: 'none', stroke: st.color, 'stroke-width': st.size, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      st.el.setAttribute('d', pathData(st.points));
      layer.appendChild(st.el);
      strokes.push(st);
      history.push({ type: 'stroke' });
      return st;
    }
    function extend(st, x, y) {
      var last = st.points[st.points.length - 1];
      if (Math.abs(last[0] - x) < 1.5 && Math.abs(last[1] - y) < 1.5) return;
      st.points.push([x, y]);
      st.el.setAttribute('d', pathData(st.points));
    }
    function sync() {
      undoBtn.disabled = history.length === 0;
      clearBtn.disabled = strokes.length === 0;
      saveBtn.disabled = strokes.length === 0;
      doneBtn.disabled = completed || strokes.length === 0;
    }
    function point(e) {
      var rect = canvas.getBoundingClientRect();
      if (LG && typeof LG.normalizePoint === 'function') {
        var p = LG.normalizePoint(e.clientX, e.clientY, rect, W, H);
        return [Math.round(p.x), Math.round(p.y)];
      }
      var x = ((e.clientX - rect.left) / rect.width) * W;
      var y = ((e.clientY - rect.top) / rect.height) * H;
      return [Math.round(Math.min(W, Math.max(0, x))), Math.round(Math.min(H, Math.max(0, y)))];
    }

    canvas.addEventListener('pointerdown', function (e) {
      if (activePointer !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      // preventDefault cancels the normal focus move. Space must reach the paper,
      // rather than re-pressing the last toolbar button (for example, Undo).
      if (document.activeElement !== canvas) canvas.focus({ preventScroll: true });
      activePointer = e.pointerId;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      var p = point(e);
      active = newStroke(p[0], p[1]);
      dismissConfirm();
      sync();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (e.pointerId !== activePointer || !active) return;
      var list = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e];
      if (!list.length) list = [e];
      list.forEach(function (ev) { var p = point(ev); extend(active, p[0], p[1]); });
    });
    function endPointer(e) {
      if (e.pointerId !== activePointer) return;
      activePointer = null;
      active = null;
    }
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);

    function placeCursor() { cursorEl.setAttribute('transform', 'translate(' + cursor.x + ' ' + cursor.y + ')'); }
    function setPen(down) {
      cursor.down = down;
      canvas.classList.toggle('pen-down', down);
      penState.textContent = down ? 'Pen down' : 'Pen up';
      if (down) { cursor.stroke = newStroke(cursor.x, cursor.y); dismissConfirm(); sync(); }
      else cursor.stroke = null;
      announce(down ? 'Pen down. Move with the arrow keys to draw.' : 'Pen up.');
    }
    canvas.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 4 : 16;
      var dx = 0, dy = 0;
      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setPen(!cursor.down); return; }
      else if (e.key === 'Escape') { if (cursor.down) { setPen(false); e.preventDefault(); } return; }
      else return;
      e.preventDefault();
      cursor.x = Math.min(W, Math.max(0, cursor.x + dx));
      cursor.y = Math.min(H, Math.max(0, cursor.y + dy));
      placeCursor();
      if (cursor.down && cursor.stroke) extend(cursor.stroke, cursor.x, cursor.y);
    });
    canvas.addEventListener('blur', function () { if (cursor.down) setPen(false); });

    undoBtn.addEventListener('click', function () {
      var last = history.pop();
      if (!last) return;
      dismissConfirm();
      if (last.type === 'stroke') {
        var st = strokes.pop();
        if (st && st.el.parentNode) st.el.parentNode.removeChild(st.el);
        if (cursor.stroke === st) setPen(false);
        announce('Took back the last line.');
      } else if (last.type === 'clear') {
        last.strokes.forEach(function (st) { strokes.push(st); layer.appendChild(st.el); });
        announce('Drawing is back.');
      }
      sync();
    });

    function dismissConfirm() { clear(confirmSlot); }
    clearBtn.addEventListener('click', function () {
      if (!strokes.length) return;
      var c = inlineConfirm('Clear the whole drawing? Undo can bring it back.', 'Yes, clear it', function () {
        if (cursor.down) setPen(false);
        var removed = strokes.splice(0, strokes.length);
        removed.forEach(function (st) { if (st.el.parentNode) st.el.parentNode.removeChild(st.el); });
        history.push({ type: 'clear', strokes: removed });
        dismissConfirm();
        sync();
        announce('Paper cleared. Press Undo to bring the drawing back.');
        undoBtn.focus();
      }, function () { dismissConfirm(); clearBtn.focus(); });
      clear(confirmSlot);
      confirmSlot.appendChild(c.el);
      c.focus();
    });

    saveBtn.addEventListener('click', function () {
      var out = s('svg', { xmlns: SVG_NS, viewBox: '0 0 ' + W + ' ' + H, width: W, height: H }, [
        s('rect', { x: 0, y: 0, width: W, height: H, fill: '#fffdf8' })
      ].concat(strokes.map(function (st) {
        return s('path', { d: st.el.getAttribute('d'), fill: 'none', stroke: st.color, 'stroke-width': st.size, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      })));
      downloadSvg(out, 'wonder-patch-drawing.svg');
      announce('Your drawing is downloading as an SVG file.');
    });

    doneBtn.addEventListener('click', function () {
      if (completed) return;
      completed = true;
      record('draw');
      doneBtn.disabled = true;
      note.textContent = 'Lovely work. This drawing is counted as finished. You can keep drawing or save it. It counts once each time you open Draw.';
      announce('Drawing finished.');
    });

    placeCursor();
    sync();
    cleanup = function () { activePointer = null; active = null; };
  }

  /* ---------- color ---------- */

  function petalPath(cx, cy, dist, r, n) {
    var d = '';
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      var x = cx + dist * Math.cos(a), y = cy + dist * Math.sin(a);
      d += 'M' + (x - r).toFixed(1) + ' ' + y.toFixed(1) + 'a' + r + ' ' + r + ' 0 1 0 ' + (2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0z';
    }
    return d;
  }

  var ZONES = [
    { id: 'sky', name: 'Sky', d: 'M0 0H400V300H0Z' },
    { id: 'sun', name: 'Sun', d: 'M288 64a34 34 0 1 0 68 0a34 34 0 1 0-68 0Z' },
    { id: 'cloud', name: 'Cloud', d: 'M62 104c-12 0-14-17-1-19 1-16 21-21 31-9 9-14 34-9 35 8 13 1 15 20 3 20Z' },
    { id: 'far-hill', name: 'Far hill', d: 'M0 186C80 140 170 140 250 172S360 168 400 148V300H0Z' },
    { id: 'near-hill', name: 'Near hill', d: 'M0 236C90 206 200 206 290 228S370 236 400 226V300H0Z' },
    { id: 'trunk', name: 'Tree trunk', d: 'M88 232L93 160H107L112 232Z' },
    { id: 'treetop', name: 'Treetop', d: 'M58 150c-14-26 10-50 30-42 6-24 44-24 50 0 22-6 38 20 24 40 8 20-14 34-30 26-12 14-40 14-50 0-18 6-34-8-24-24Z' },
    { id: 'leaf', name: 'Flower leaf', d: 'M262 252c-18 0-26-9-26-20 15 0 24 9 26 20Z' },
    { id: 'petals', name: 'Petals', d: petalPath(262, 196, 17, 12, 5) },
    { id: 'middle', name: 'Flower middle', d: 'M252 196a10 10 0 1 0 20 0a10 10 0 1 0-20 0Z' },
    { id: 'snail-body', name: 'Snail body', d: 'M300 270c0-6 4-9 10-9h38c6 0 9-5 10-11l7 2c0 11-7 18-15 18Z' },
    { id: 'shell', name: 'Snail shell', d: 'M314 248a18 18 0 1 0 36 0a18 18 0 1 0-36 0Z' }
  ];
  var BLANK = '#fffdf8';

  function renderColor() {
    var act = activity('color');
    var fills = {};
    var history = [];
    var completed = false; // counted once per visit to this view
    var paint = PAINTS[0];
    var zoneEls = {};
    var zoneBtnSwatches = {};

    var art = s('g', null);
    ZONES.forEach(function (z) {
      fills[z.id] = BLANK;
      var el = s('path', { d: z.d, fill: BLANK, stroke: INK.ink, 'stroke-width': 3, 'stroke-linejoin': 'round', class: 'zone', 'data-zone': z.id });
      el.addEventListener('click', function () { fillZone(z); });
      zoneEls[z.id] = el;
      art.appendChild(el);
    });
    // decorative linework on top, not clickable
    var lines = s('g', { class: 'lines', 'pointer-events': 'none', fill: 'none', stroke: INK.ink, 'stroke-width': 3, 'stroke-linecap': 'round' }, [
      s('path', { d: 'M262 270V208', fill: 'none', stroke: INK.ink, 'stroke-width': 3, 'stroke-linecap': 'round', 'pointer-events': 'none' }),
      s('path', { d: 'M332 248a7 7 0 1 1 7-7', 'stroke-width': 2.5 }),
      s('path', { d: 'M360 252l4-12M354 252l-1-12', 'stroke-width': 2.5 })
    ]);
    // stem drawn under the leaf and petals: move it before those zones
    art.insertBefore(lines.firstChild, zoneEls.leaf);

    var picture = s('svg', { viewBox: '0 0 400 300', class: 'color-art', role: 'img', 'aria-label': 'Garden picture to color: sky, sun, cloud, two hills, a tree, a flower and a snail' }, [art, lines]);

    var zoneList = h('div', { class: 'zone-list', role: 'group', 'aria-label': 'Parts of the picture' }, ZONES.map(function (z) {
      var sw = h('span', { class: 'swatch', 'aria-hidden': 'true' });
      sw.style.backgroundColor = BLANK;
      zoneBtnSwatches[z.id] = sw;
      var b = h('button', { type: 'button', class: 'zone-btn', 'aria-label': 'Fill ' + z.name.toLowerCase() }, [sw, h('span', { text: z.name })]);
      b.addEventListener('click', function () { fillZone(z); });
      b.addEventListener('focus', function () { zoneEls[z.id].classList.add('is-hint'); });
      b.addEventListener('blur', function () { zoneEls[z.id].classList.remove('is-hint'); });
      b.addEventListener('mouseenter', function () { zoneEls[z.id].classList.add('is-hint'); });
      b.addEventListener('mouseleave', function () { zoneEls[z.id].classList.remove('is-hint'); });
      return b;
    }));

    var undoBtn = h('button', { type: 'button', class: 'btn btn-secondary', disabled: true }, [icon('undo'), h('span', { text: 'Undo' })]);
    var resetBtn = h('button', { type: 'button', class: 'btn btn-secondary', disabled: true }, [icon('refresh'), h('span', { text: 'Start over' })]);
    var saveBtn = h('button', { type: 'button', class: 'btn btn-secondary' }, [icon('download'), h('span', { text: 'Save picture' })]);
    var doneBtn = h('button', { type: 'button', class: 'btn btn-primary', disabled: true }, [icon('flag'), h('span', { text: 'All done' })]);
    var confirmSlot = h('div', { class: 'confirm-slot' });
    var note = h('p', { class: 'quiet-note', text: 'Pictures are not kept when you leave this page. Save picture downloads an SVG file to this device.' });
    var current = h('p', { class: 'current-paint' });

    function showCurrent() {
      clear(current);
      var sw = h('span', { class: 'swatch', 'aria-hidden': 'true' });
      sw.style.backgroundColor = paint.hex;
      append(current, [sw, h('span', { text: 'Painting with ' + paint.name.toLowerCase() })]);
    }

    var view = h('section', { class: 'view color patch-' + act.patch }, [
      viewHeader(act),
      h('div', { class: 'studio' }, [
        h('div', { class: 'paper-wrap' }, [
          h('div', { class: 'paper' }, [picture]),
          h('p', { class: 'help', text: 'Pick a color, then tap a part of the picture. You can also use the list of parts below.' }),
          h('h2', { class: 'tool-label', text: 'Parts of the picture' }),
          zoneList
        ]),
        h('div', { class: 'tools' }, [
          h('h2', { class: 'tool-label', text: 'Color' }),
          current,
          paletteGroup('Paint color', PAINTS, 0, function (p) { paint = p; showCurrent(); announce(p.name); }),
          h('div', { class: 'tool-actions' }, [undoBtn, resetBtn]),
          confirmSlot,
          h('div', { class: 'tool-actions' }, [saveBtn, doneBtn]),
          note
        ])
      ])
    ]);
    main.appendChild(view);

    function setFill(id, hex) {
      fills[id] = hex;
      zoneEls[id].setAttribute('fill', hex);
      zoneBtnSwatches[id].style.backgroundColor = hex;
    }
    function filledCount() { return ZONES.filter(function (z) { return fills[z.id] !== BLANK; }).length; }
    function sync() {
      undoBtn.disabled = history.length === 0;
      resetBtn.disabled = filledCount() === 0;
      doneBtn.disabled = completed || filledCount() === 0;
    }
    function fillZone(z) {
      if (fills[z.id] === paint.hex) { announce(z.name + ' is already ' + paint.name.toLowerCase()); return; }
      history.push({ type: 'fill', id: z.id, prev: fills[z.id] });
      setFill(z.id, paint.hex);
      clear(confirmSlot);
      sync();
      announce(z.name + ' is now ' + paint.name.toLowerCase());
    }

    undoBtn.addEventListener('click', function () {
      var last = history.pop();
      if (!last) return;
      clear(confirmSlot);
      if (last.type === 'fill') { setFill(last.id, last.prev); announce('Took back the last color.'); }
      else { Object.keys(last.prev).forEach(function (id) { setFill(id, last.prev[id]); }); announce('Colors are back.'); }
      sync();
    });

    resetBtn.addEventListener('click', function () {
      var c = inlineConfirm('Start over with a blank picture? Undo can bring the colors back.', 'Yes, start over', function () {
        var prev = Object.assign({}, fills);
        ZONES.forEach(function (z) { setFill(z.id, BLANK); });
        history.push({ type: 'reset', prev: prev });
        clear(confirmSlot);
        sync();
        announce('Picture is blank again. Press Undo to bring the colors back.');
        undoBtn.focus();
      }, function () { clear(confirmSlot); resetBtn.focus(); });
      clear(confirmSlot);
      confirmSlot.appendChild(c.el);
      c.focus();
    });

    saveBtn.addEventListener('click', function () {
      var out = picture.cloneNode(true);
      out.setAttribute('xmlns', SVG_NS);
      out.setAttribute('width', '800');
      out.setAttribute('height', '600');
      ['class', 'role', 'aria-label'].forEach(function (a) { out.removeAttribute(a); });
      Array.prototype.forEach.call(out.querySelectorAll('[class],[data-zone]'), function (n) {
        n.removeAttribute('class'); n.removeAttribute('data-zone');
      });
      downloadSvg(out, 'wonder-patch-garden.svg');
      announce('Your picture is downloading as an SVG file.');
    });

    doneBtn.addEventListener('click', function () {
      if (completed) return;
      completed = true;
      record('color');
      doneBtn.disabled = true;
      note.textContent = 'Lovely work. This picture is counted as finished. You can keep coloring or save it. It counts once each time you open Color.';
      announce('Picture finished.');
    });

    showCurrent();
    sync();
  }

  /* ---------- grown-ups ---------- */

  function renderGrownUps() {
    var toggle = h('input', { type: 'checkbox', id: 'save-toggle', class: 'switch-input', role: 'switch' });
    var statusLine = h('p', { class: 'store-status' });
    var tbody = h('tbody');
    var resetSlot = h('div', { class: 'confirm-slot' });
    var resetBtn = h('button', { type: 'button', class: 'btn btn-secondary' }, [icon('trash'), h('span', { text: 'Reset counts' })]);
    var countsCaption = h('caption', { class: 'counts-caption' });

    function paint() {
      var st;
      try { st = progress.getState(); } catch (e) { st = { enabled: false, available: false, counts: {} }; }
      toggle.checked = !!st.enabled;
      toggle.disabled = st.available === false && !st.enabled;
      if (st.available === false) {
        statusLine.textContent = 'This browser is not allowing saving right now, so counts last only while this page is open.';
        statusLine.className = 'store-status is-warn';
      } else if (st.enabled) {
        statusLine.textContent = 'Saving is on. Finished-round counts are kept in this browser on this device.';
        statusLine.className = 'store-status is-on';
      } else {
        statusLine.textContent = 'Saving is off. Counts below last only until this page is closed.';
        statusLine.className = 'store-status';
      }
      countsCaption.textContent = st.enabled ? 'Finished rounds saved on this device' : 'Finished rounds this visit';
      clear(tbody);
      ACTIVITIES.forEach(function (a) {
        var n = (st.counts && st.counts[a.id]) || 0;
        tbody.appendChild(h('tr', null, [h('th', { scope: 'row', text: a.title }), h('td', { text: String(n) })]));
      });
      return st;
    }

    toggle.addEventListener('change', function () {
      try { progress.setEnabled(toggle.checked); } catch (e) { /* reflected by paint */ }
      var st = paint();
      if (toggle.checked && !st.enabled) announce('Saving could not be turned on. This browser is not allowing it.');
      else if (st.available === false) announce('This browser is not allowing saving, so counts last only while this page is open.');
      else announce(st.enabled ? 'Saving on this device is on.' : 'Saving is off. Saved counts were removed from this device.');
    });

    resetBtn.addEventListener('click', function () {
      var c = inlineConfirm('Reset all counts to zero and turn saving off? This cannot be undone.', 'Yes, reset', function () {
        try { progress.reset(); } catch (e) { /* ignore */ }
        clear(resetSlot);
        paint();
        announce('All counts are back to zero and saving is off.');
        resetBtn.focus();
      }, function () { clear(resetSlot); resetBtn.focus(); });
      clear(resetSlot);
      resetSlot.appendChild(c.el);
      c.focus();
    });

    main.appendChild(h('section', { class: 'view grownups' }, [
      h('div', { class: 'view-head' }, [
        h('a', { class: 'btn btn-quiet back', href: '#/' }, [icon('back'), h('span', { text: 'All games' })]),
        h('div', { class: 'view-title' }, [
          h('h1', { tabindex: '-1', text: 'For grown-ups' }),
          h('p', { class: 'view-blurb', text: 'How Wonder Patch works and what it keeps' })
        ])
      ]),
      h('div', { class: 'gu-grid' }, [
        h('section', { class: 'panel', 'aria-labelledby': 'gu-what' }, [
          h('h2', { id: 'gu-what', text: 'What is here' }),
          h('p', { text: 'Six short activities: counting from 1 to 10, matching big and small letters, simple patterns, a memory game with 6 pairs, free drawing and coloring a picture.' }),
          h('p', { text: 'Counting, letters and patterns come in rounds of 5 questions. A wrong answer can always be tried again, and there are no timers or scores to beat.' }),
          h('p', { text: 'These are practice games. They are not a curriculum or an assessment.' })
        ]),
        h('section', { class: 'panel', 'aria-labelledby': 'gu-progress' }, [
          h('h2', { id: 'gu-progress', text: 'Progress on this device' }),
          h('div', { class: 'switch-row' }, [
            toggle,
            h('label', { for: 'save-toggle', class: 'switch-label' }, [
              h('span', { class: 'switch-track', 'aria-hidden': 'true' }, [h('span', { class: 'switch-thumb' })]),
              h('span', { text: 'Save progress on this device' })
            ])
          ]),
          statusLine,
          h('p', { class: 'quiet-note', text: 'Only the number of finished rounds for each game is saved. No names, ages, emails or other details are asked for or stored. Turning saving off removes the saved counts.' }),
          h('table', { class: 'counts' }, [
            countsCaption,
            h('thead', null, [h('tr', null, [h('th', { scope: 'col', text: 'Game' }), h('th', { scope: 'col', text: 'Finished' })])]),
            tbody
          ]),
          resetBtn,
          resetSlot
        ]),
        h('section', { class: 'panel', 'aria-labelledby': 'gu-privacy' }, [
          h('h2', { id: 'gu-privacy', text: 'Privacy' }),
          h('p', { text: 'The games run in this browser on this device. There are no accounts, ads or trackers, and the games make no calls to remote services. If you opened Wonder Patch from a website, that site still sends the page files to your browser, the same as any web page. There is no sound or microphone use.' }),
          h('p', { text: 'Wonder Patch does not keep drawings or colored pictures. When you leave the page they are gone. Save picture downloads an SVG file to this device, and that file stays wherever your browser saves downloads until you delete it.' })
        ])
      ])
    ]));
    paint();
  }

  /* ---------- boot ---------- */

  window.addEventListener('hashchange', route);
  route();
})();
