import { type Kysely, sql } from 'kysely'
import { KyselyAuditTrail } from '#libs/database/kysely-audit-trail'
import type { JobQueue } from '#libs/ports/job-queue.port'
import type { BackOfficeUnitOfWork } from '../back-office-unit-of-work.port'
import { KyselyBackOfficeDirectory } from './kysely-back-office-directory'
import { KyselyImpersonations } from './kysely-impersonations'
import { KyselyOperators } from './kysely-operators'

/**
 * The role the back office runs as: created, and granted named columns, by `0019_operator_back_office.sql`
 * (ADR 0077). Only this module reaches it (`api-operator-role-stays-in-the-back-office`).
 */
const OPERATOR_ROLE = 'app_operator'

const asOperator = (transaction: Kysely<unknown>) =>
  sql`select set_config('role', ${OPERATOR_ROLE}, true)`.execute(transaction)

/**
 * The back office's transactions (ADR 0077), each switched to `app_operator` for itself alone, as a tenant's
 * is to `app_tenant` (ADR 0055): `read` is also `read only`, so a write fails twice over; `write` holds only
 * what entering and leaving an organization need.
 */
export function kyselyBackOfficeUnitOfWork(
  db: Kysely<unknown>,
  jobsOn: (transaction: Kysely<unknown>) => JobQueue
): BackOfficeUnitOfWork {
  return {
    read: (work) =>
      db
        .transaction()
        .setAccessMode('read only')
        .execute(async (transaction) => {
          await asOperator(transaction)
          return work({
            operators: new KyselyOperators(transaction),
            directory: new KyselyBackOfficeDirectory(transaction),
            impersonations: new KyselyImpersonations(transaction)
          })
        }),
    write: (work) =>
      db.transaction().execute(async (transaction) => {
        await asOperator(transaction)
        return work({
          impersonations: new KyselyImpersonations(transaction),
          audit: new KyselyAuditTrail(transaction),
          jobs: jobsOn(transaction)
        })
      })
  }
}
