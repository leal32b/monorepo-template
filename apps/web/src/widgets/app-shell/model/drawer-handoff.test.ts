import { keepDrawerOpenOnNextScreen, takeDrawerHandoff } from './drawer-handoff'

describe('the drawer handoff', () => {
  it('is not asked for until a drawer asks', () => {
    expect(takeDrawerHandoff()).toBe(false)
  })

  it('hands the request to the next screen once, and is spent', () => {
    keepDrawerOpenOnNextScreen()

    expect(takeDrawerHandoff()).toBe(true)
    expect(takeDrawerHandoff()).toBe(false)
  })
})
