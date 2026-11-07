import * as z from 'zod/mini'

/**
 * The reference module of Phase 7 (ADR 0044): a customer of an organization. Every shape here is
 * what crosses the wire; the API and the web both parse with them, so a new module copies this file
 * first.
 */

/** How long each text may be; the web says it when a field is too long. */
export const customerLength = { name: 120, phone: 40, company: 120, notes: 2000 } as const

/** Customers per page of the list. */
export const customerPageSize = 25

const blankToNull = z.transform((value: string) => (value === '' ? null : value))

/** A text that may be left out: blank reads as none, so a cleared form field needs no special case. */
const optionalText = (max: number) => z.optional(z.pipe(z.string().check(z.trim(), z.maxLength(max)), blankToNull))

const optionalEmail = z.optional(
  z.pipe(z.pipe(z.string().check(z.trim(), z.toLowerCase()), blankToNull), z.nullable(z.email()))
)

/**
 * `POST` and `PUT` bodies: the whole customer, both times, so an edit is the form's values and
 * nothing else. The id, the organization and the dates are never the client's to choose.
 */
export const customerInputSchema = z.strictObject({
  name: z.string().check(z.trim(), z.minLength(1), z.maxLength(customerLength.name)),
  email: optionalEmail,
  phone: optionalText(customerLength.phone),
  company: optionalText(customerLength.company),
  notes: optionalText(customerLength.notes)
})

export type CustomerInput = z.input<typeof customerInputSchema>

/** A customer as the API returns it. Dates are ISO 8601; `archivedAt` is null while it is active. */
export const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.nullable(z.string()),
  phone: z.nullable(z.string()),
  company: z.nullable(z.string()),
  notes: z.nullable(z.string()),
  createdAt: z.iso.datetime(),
  archivedAt: z.nullable(z.iso.datetime())
})

export type Customer = z.infer<typeof customerSchema>

export const customerStatuses = ['active', 'archived'] as const

export type CustomerStatus = (typeof customerStatuses)[number]

/** `GET .../customers?status=&search=&page=`: the query string is text, so the page is read as a number. */
export const listCustomersQuerySchema = z.strictObject({
  status: z._default(z.enum(customerStatuses), 'active'),
  search: z.optional(z.string().check(z.trim(), z.minLength(1))),
  page: z._default(z.pipe(z.coerce.number(), z.int().check(z.minimum(1))), 1)
})

export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>

/** One page of customers, with the total of the whole filter, so the web can draw the pager. */
export const customerListSchema = z.object({
  items: z.array(customerSchema),
  total: z.int().check(z.minimum(0)),
  page: z.int().check(z.minimum(1)),
  pageSize: z.int().check(z.minimum(1))
})

export type CustomerList = z.infer<typeof customerListSchema>
