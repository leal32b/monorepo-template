/** Ports of the suite's own servers, apart from the dev ones (5173, 3001, 5433), so both can run. */
export const DB_PORT = 5435
export const API_PORT = 3005
export const WEB_PORT = 4173

/** The web origin the API trusts for writes: the browser must use exactly this one. */
export const WEB_ORIGIN = `http://127.0.0.1:${WEB_PORT}`

/** Where the sign-up session of the shared owner is saved by the setup project. */
export const OWNER_STATE = 'test-results/.auth/owner.json'

/**
 * What the suite's commands to the billing fake carry in `fake-billing-token`, sent as JSON to
 * `POST /api/webhooks/fake` with the organization they act on (ADR 0063, ADR 0067).
 */
export const FAKE_BILLING_TOKEN = 'e2e-fake-billing-token-0123'
