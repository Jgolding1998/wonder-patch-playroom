# Design research

These projects informed the interaction checks. No code, artwork, fonts, audio or other assets were copied from them.

## Sugarizer

[Sugarizer](https://github.com/llaske/sugarizer) organizes a large set of educational activities behind a consistent activity launcher. Its breadth, collaboration and classroom features are much larger than this app's scope.

[Issue 2178](https://github.com/llaske/sugarizer/issues/2178) reports keyboard listeners surviving a view change and causing repeated actions. The maintainer's comment says they could not reproduce the crash, so this is a useful test scenario rather than a confirmed diagnosis of Sugarizer. Here, browser tests switch repeatedly between activities and leave a memory game during its pending mismatch reset. Input and timers must belong to the active activity.

The project's [release notes](https://github.com/llaske/sugarizer/releases) also record mobile tutorial, touch and resizing fixes. This app uses large labelled buttons, short instructions and an ordinary back control instead of a tutorial overlay.

## Kolibri

[Kolibri](https://github.com/learningequality/kolibri) is an offline-oriented learning platform with lessons, content management and classroom reporting. Wonder Patch is six short practice and art activities; it does not replace that learning platform or claim equivalent educational evidence.

[PR 15485](https://github.com/learningequality/kolibri/pull/15485) and its review discussion address focus after navigation while retaining focus for in-place quiz controls. That distinction matters here too: a new activity should announce its heading, while answering a question should keep the next usable control reachable. [Issue 15265](https://github.com/learningequality/kolibri/issues/15265) highlights the value of an honest, visible completion state. Our completion counters are optional and local; there are no streaks, rankings or child profiles.

## Excalidraw

[Excalidraw](https://github.com/excalidraw/excalidraw) is a substantially more capable drawing tool. Its [touch-support collection, issue 9705](https://github.com/excalidraw/excalidraw/issues/9705), records concerns about coordinate offsets, unintended strokes and different pen/touch behavior. The small drawing surface here uses normalized coordinates, one active pointer and an explicit Undo control. The [project changelog](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/CHANGELOG.md) also documents improvements to visible pressed states and mobile Undo/Redo controls. Those are interaction lessons, not imported implementations.

We test drawing after resizing and on a touch-sized viewport. Physical stylus palm rejection and every mobile browser are not claimed to be verified.

## A further focus check

[Scratch GUI issue 10047](https://github.com/scratchfoundation/scratch-gui/issues/10047) describes keyboard events being affected by a UI selection. That repository is archived following migration to [scratch-editor](https://github.com/scratchfoundation/scratch-editor); it is a historical interaction report, not a recommendation to depend on the archived package. This app has no Scratch dependency.

## What the comparison does and does not show

The useful tradeoff here is a smaller, directly downloadable app with no runtime dependencies or network services. The other projects offer much deeper learning, creation or classroom capabilities. This research does not establish that Wonder Patch is educationally more effective, more secure in every environment or better than those tools. The repository's tests provide concrete checks for its narrower scope.
