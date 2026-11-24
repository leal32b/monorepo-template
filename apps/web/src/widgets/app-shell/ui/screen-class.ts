/** The column an app screen sits in, mobile first: the screen and its placeholder alike, so nothing moves. */
export const screenClass = 'mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-6 pb-8 sm:px-6 md:pt-8 md:pb-12'

/** The room the tab bar takes at the foot of a phone's screen (ADR 0080), so the end of a screen is not under it. */
export const tabBarRoom = 'pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0'
