/** Whether the database answers right now. Never throws: any failure is `false`. */
export interface DatabaseProbe {
  isReachable(): Promise<boolean>
}
