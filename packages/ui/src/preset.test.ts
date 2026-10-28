import { createGenerator } from '@unocss/core'
import { presetUi } from './preset'

describe('presetUi', () => {
  it('generates the utilities the components are written with', async () => {
    const uno = await createGenerator({ presets: [presetUi()] })

    const { css } = await uno.generate('px-3', { preflights: false })

    expect(css).toContain('.px-3{padding-inline:calc(var(--spacing) * 3);}')
  })
})
