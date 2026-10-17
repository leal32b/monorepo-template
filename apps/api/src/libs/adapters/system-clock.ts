import type { Clock } from '#libs/ports/clock.port'

export class SystemClock implements Clock {
  now(): Date {
    return new Date()
  }
}
