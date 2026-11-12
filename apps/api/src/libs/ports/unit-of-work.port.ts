/**
 * One organization's database work, done together (ADR 0052, ADR 0055). `work` receives repositories
 * bound to one transaction confined to `organizationId`, the id the tenant guard returned, and must
 * use only those: when it resolves, everything it wrote is kept; when it throws, nothing is, and the
 * error is thrown on. Every tenant use case runs inside one, reads included. Nothing but database
 * work belongs inside.
 */
export interface UnitOfWork<Repositories> {
  run<T>(organizationId: string, work: (repositories: Repositories) => Promise<T>): Promise<T>
}
