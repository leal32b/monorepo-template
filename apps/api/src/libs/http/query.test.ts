import type { IncomingMessage } from 'node:http'
import * as z from 'zod/mini'
import { HttpProblem } from './problem'
import { readValidQuery } from './query'

const schema = z.strictObject({
  page: z._default(z.pipe(z.coerce.number(), z.int()), 1),
  search: z.optional(z.string())
})
const request = (url: string) => ({ url }) as IncomingMessage

describe('readValidQuery', () => {
  it('parses the query string with the schema, defaults included', () => {
    expect(readValidQuery(request('/x'), schema)).toEqual({ page: 1 })
    expect(readValidQuery(request('/x?page=2&search=ada%20l'), schema)).toEqual({ page: 2, search: 'ada l' })
  })

  it('answers a 400 that lists each problem', () => {
    const fail = () => readValidQuery(request('/x?page=1.5&other=1'), schema)

    expect(fail).toThrow(HttpProblem)
    try {
      fail()
    } catch (error) {
      const problem = error as HttpProblem
      expect(problem.status).toBe(400)
      expect(problem.code).toBe('validation_failed')
      expect(problem.errors?.map((e) => e.path).sort()).toEqual(['', 'page'])
    }
  })
})
