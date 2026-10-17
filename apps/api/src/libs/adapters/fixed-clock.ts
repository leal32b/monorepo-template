import type { Clock } from '#libs/ports/clock.port'

export class FixedClock implements Clock {
  private time: number

  constructor(at: Date) {
    this.time = at.getTime()
  }

  now(): Date {
    return new Date(this.time)
  }

  advance(ms: number): void {
    this.time += ms
  }
}
