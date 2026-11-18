/**
 * The plan page of an organization, where the owner chooses a plan (ADR 0063). A file of its own, so the
 * frame, which leads there from every screen, does not load the plan page's words with it.
 */
export const plansPath = (slug: string) => `/${slug}/settings/billing`
