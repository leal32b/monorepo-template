/**
 * Several repository calls that commit or roll back together (ADR 0052). `work` receives repositories
 * bound to one transaction and must use only those: when it resolves, everything it wrote is kept;
 * when it throws, nothing is, and the error is thrown on. Nothing but database work belongs inside.
 */
export interface UnitOfWork<Repositories> {
  run<T>(work: (repositories: Repositories) => Promise<T>): Promise<T>
}
