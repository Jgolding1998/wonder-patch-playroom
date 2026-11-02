# Working on Wonder Patch

This is a small static app, not a hosted learning service. Keep it useful without an account, subscription, backend, package CDN or internet connection.

- Runtime files are `index.html`, `styles.css`, `src/*.js` and original SVGs in `assets/`. Use classic deferred scripts so opening the downloaded HTML still works.
- `src/learning.js` is pure game state, shared with the Node tests. `src/progress.js` stores only bounded completion counters, only after an explicit opt-in. Storage errors must never block play.
- Keep all game controls usable by keyboard and touch, with visible focus and text labels. Keep art controls usable without precision pointer input. Honor reduced motion.
- Do not add names, ages, emails, photos, recordings, analytics, ads, external embeds, third-party fonts or automatic progress saving.
- Use original procedural artwork. Do not copy assets, code, data or history from private prototypes. Document any future third-party code and its license.
- Never insert user-controlled HTML. Keep the restrictive CSP, local URL paths, static server allowlist and no-network browser tests.
- Run `npm test`, `npm run check`, `npm run build` and `npm run test:browser` after meaningful changes. Browser test output goes outside the source directory.
- Do not describe the app as a certified curriculum, a released mobile app or compliant with a child-privacy law without a separate verified basis.
- Put screenshots, logs, tools and review notes outside this source tree. Publish only intentionally reviewed source, tests and documentation.
