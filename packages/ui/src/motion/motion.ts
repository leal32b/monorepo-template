/**
 * How long a layer takes to come and go, and how it eases (ADR 0031). Short, since the user is waiting
 * to act: entering is a little slower than leaving, and easing out on the way in and in on the way out
 * makes both feel quick. Only `transform` and `opacity` move, so nothing around a layer shifts.
 */
export const motion = {
  /** A panel that slides in from the edge, and the veil behind it. */
  enter: 200,
  exit: 150,
  /** A dialog that appears over the page. */
  dialogEnter: 150,
  dialogExit: 100,
  /** A menu that opens from its button. */
  popEnter: 120,
  popExit: 80,
  /** One sweep of the progress bar while the server works. */
  progress: 1200,
  /**
   * How long a wait runs before anything says so, the skeletons and the progress bar alike: a quick
   * answer shows nothing, and when the wait is long they come together.
   */
  waitDelay: 300,
  /**
   * How long a wait runs before it says why it is long: a server asleep takes up to a minute to wake, and
   * a skeleton alone looks stuck by then. Counted from the same start as `waitDelay`.
   */
  slowWaitDelay: 5000,
  /** Once shown, the progress bar stays this long at least, so it never flashes. */
  progressMinimum: 400,
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)'
} as const

/** A layer from Kobalte is `data-expanded` while it is open and `data-closed` while it leaves. */
const open = '[data-expanded]'
const closed = '[data-closed]'

/** `from` and `to` as the two ends of a keyframe. */
const keyframes = (name: string, from: string, to: string) => `@keyframes ${name}{from{${from}}to{${to}}}`

/** One layer: the animation it plays on entering and on leaving. `forwards` keeps it gone until removed. */
const layer = (name: string, enter: string, exit: number, entering: number) =>
  `.${name}${open}{animation:${enter} ${entering}ms ${motion.easeOut}}` +
  `.${name}${closed}{animation:${enter}-out ${exit}ms ${motion.easeIn} forwards}`

const hidden = 'opacity:0'
const shown = 'opacity:1'

/**
 * The classes that animate a layer, and their keyframes, for the preset's base styles. `ds-scrim` fades
 * the veil; `ds-sheet` slides a panel in from the left; `ds-dialog` lifts a dialog a little as it
 * fades; `ds-pop` grows a menu from its button (Kobalte's transform origin); `ds-progress`
 * sweeps the progress bar's stripe across, the one motion that is not a layer (ADR 0035). With `prefers-reduced-motion` every one of them
 * only fades, and the fade is as long.
 */
export const motionCss = [
  // The veil.
  keyframes('ds-scrim', hidden, shown),
  keyframes('ds-scrim-out', shown, hidden),
  layer('ds-scrim', 'ds-scrim', motion.exit, motion.enter),
  // A panel from the left edge.
  keyframes('ds-sheet', `${hidden};transform:translateX(-100%)`, `${shown};transform:translateX(0)`),
  keyframes('ds-sheet-out', `${shown};transform:translateX(0)`, `${hidden};transform:translateX(-100%)`),
  layer('ds-sheet', 'ds-sheet', motion.exit, motion.enter),
  // A dialog over the page.
  keyframes('ds-dialog', `${hidden};transform:translateY(-4px) scale(0.98)`, `${shown};transform:none`),
  keyframes('ds-dialog-out', `${shown};transform:none`, `${hidden};transform:translateY(-4px) scale(0.98)`),
  layer('ds-dialog', 'ds-dialog', motion.dialogExit, motion.dialogEnter),
  // A menu from its button.
  keyframes('ds-pop', `${hidden};transform:scale(0.96)`, `${shown};transform:none`),
  keyframes('ds-pop-out', `${shown};transform:none`, `${hidden};transform:scale(0.96)`),
  `.ds-pop{transform-origin:var(--kb-menu-content-transform-origin,center)}`,
  layer('ds-pop', 'ds-pop', motion.popExit, motion.popEnter),
  // The progress bar: a stripe that sweeps across while the server works.
  keyframes('ds-progress', 'transform:translateX(-100%)', 'transform:translateX(100%)'),
  keyframes('ds-progress-pulse', shown, 'opacity:0.4'),
  `.ds-progress{animation:ds-progress ${motion.progress}ms linear infinite}`,
  // Reduced motion: nothing moves, everything only fades; the progress bar stands still and pulses.
  `@media (prefers-reduced-motion: reduce){${['sheet', 'dialog', 'pop']
    .map((name) => `.ds-${name}${open}{animation-name:ds-scrim}.ds-${name}${closed}{animation-name:ds-scrim-out}`)
    .join(
      ''
    )}.ds-progress{animation:ds-progress-pulse ${motion.progress}ms ease-in-out infinite alternate;transform:none}}`
].join('')
