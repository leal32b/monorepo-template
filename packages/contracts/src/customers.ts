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
const customerName = z.string().check(z.trim(), z.minLength(1), z.maxLength(customerLength.name))

export const customerInputSchema = z.strictObject({
  name: customerName,
  email: optionalEmail,
  phone: optionalText(customerLength.phone),
  company: optionalText(customerLength.company),
  notes: optionalText(customerLength.notes)
})

export type CustomerInput = z.input<typeof customerInputSchema>

/** The body once parsed: a blank optional field is `null`, a missing one `undefined`. */
export type CustomerValues = z.output<typeof customerInputSchema>

/**
 * `PUT` body: the whole customer and the `version` it was read at (ADR 0048). A customer saved by
 * someone else since then is refused with 409 `customer_changed`, so no edit is lost in silence.
 */
export const customerUpdateSchema = z.extend(customerInputSchema, { version: z.int().check(z.minimum(1)) })

export type CustomerUpdateInput = z.input<typeof customerUpdateSchema>

export type CustomerUpdate = z.output<typeof customerUpdateSchema>

/**
 * A customer as the API returns it. Dates are ISO 8601; `archivedAt` is null while it is active;
 * `version` goes back in the next `PUT`.
 */
export const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.nullable(z.string()),
  phone: z.nullable(z.string()),
  company: z.nullable(z.string()),
  notes: z.nullable(z.string()),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  archivedAt: z.nullable(z.iso.datetime()),
  version: z.int().check(z.minimum(1))
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

/**
 * `POST /api/public/organizations/:organizationSlug/customer-registrations`: what a visitor, with no
 * session, may say to become a customer (ADR 0059): a name and a way to reach them. Company and
 * notes stay the members' fields. `referralCode` is a honeypot: the web renders it where no person
 * sees or reaches it, with autofill off, and a request that fills it is answered like any other and
 * writes nothing. Its name means nothing to a browser's autofill, which would fill it for a person.
 */
export const publicCustomerRegistrationInputSchema = z
  .strictObject({
    name: customerName,
    email: optionalEmail,
    phone: optionalText(customerLength.phone),
    referralCode: z.optional(z.string().check(z.maxLength(200)))
  })
  .check(
    z.refine((values) => (values.email ?? null) !== null || (values.phone ?? null) !== null, {
      path: ['email'],
      error: 'An email or a phone is required.'
    })
  )

export type PublicCustomerRegistrationInput = z.input<typeof publicCustomerRegistrationInputSchema>

export type PublicCustomerRegistrationValues = z.output<typeof publicCustomerRegistrationInputSchema>

/**
 * The answer to a registration, 202: the request was taken in. The same whether a customer was
 * created, the email was already a customer of the organization, or the honeypot was filled, so the
 * form cannot be asked who is a customer (ADR 0059).
 */
export const publicCustomerRegistrationSchema = z.object({ received: z.literal(true) })

export type PublicCustomerRegistration = z.infer<typeof publicCustomerRegistrationSchema>
