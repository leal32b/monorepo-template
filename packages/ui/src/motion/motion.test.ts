import { motion, motionCss } from './motion'

describe('motion', () => {
  it('keeps layers quick: entering is never longer than 200 ms, and leaving is shorter than entering', () => {
    expect(motion.enter).toBeLessThanOrEqual(200)
    expect(motion.exit).toBeLessThan(motion.enter)
    expect(motion.dialogExit).toBeLessThan(motion.dialogEnter)
    expect(motion.popExit).toBeLessThan(motion.popEnter)
  })
})

describe('motionCss', () => {
  it.each(['ds-scrim', 'ds-sheet', 'ds-dialog', 'ds-pop'])(
    'animates %s in while open and out while it leaves',
    (name) => {
      expect(motionCss).toContain(`.${name}[data-expanded]{animation:${name} `)
      expect(motionCss).toContain(`.${name}[data-closed]{animation:${name}-out `)
      expect(motionCss).toContain(`@keyframes ${name}{`)
      expect(motionCss).toContain(`@keyframes ${name}-out{`)
    }
  )

  it('times each layer from the tokens: the veil and the panel as the panel, the dialog, the pop', () => {
    expect(motionCss).toContain(`.ds-sheet[data-expanded]{animation:ds-sheet ${motion.enter}ms`)
    expect(motionCss).toContain(`.ds-sheet[data-closed]{animation:ds-sheet-out ${motion.exit}ms`)
    expect(motionCss).toContain(`.ds-dialog[data-expanded]{animation:ds-dialog ${motion.dialogEnter}ms`)
    expect(motionCss).toContain(`.ds-pop[data-closed]{animation:ds-pop-out ${motion.popExit}ms`)
  })

  it('grows a menu from its button, by the origin Kobalte computes', () => {
    expect(motionCss).toContain('.ds-pop{transform-origin:var(--kb-menu-content-transform-origin')
  })

  it('moves only transform and opacity, so nothing around a layer shifts', () => {
    const properties = [...motionCss.matchAll(/([a-z-]+):[^;{}]+[;}]/g)].map((match) => match[1])
    const moving = new Set(
      properties.filter((name) => !['animation', 'animation-name', 'transform-origin'].includes(name ?? ''))
    )

    expect([...moving].sort()).toEqual(['opacity', 'transform'])
  })

  it('fades in what opens in a page, with no way out', () => {
    expect(motionCss).toContain(`.ds-reveal{animation:ds-scrim ${motion.reveal}ms`)
    expect(motionCss).not.toContain('.ds-reveal[data-closed]')
  })

  it('only fades with reduced motion, for every layer that moves', () => {
    const reduced = motionCss.slice(motionCss.indexOf('@media (prefers-reduced-motion: reduce)'))

    for (const name of ['sheet', 'dialog', 'pop']) {
      expect(reduced).toContain(`.ds-${name}[data-expanded]{animation-name:ds-scrim}`)
      expect(reduced).toContain(`.ds-${name}[data-closed]{animation-name:ds-scrim-out}`)
    }
  })
})
