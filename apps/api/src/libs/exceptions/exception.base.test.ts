import { ArgumentInvalidException, ConflictException, NotFoundException } from './exception.base'

class ProjectNotFound extends NotFoundException {
  readonly code = 'project_not_found'
}

class NameInvalid extends ArgumentInvalidException {
  readonly code = 'name_invalid'
}

class NameTaken extends ConflictException {
  readonly code = 'name_taken'
}

describe('exceptions', () => {
  it('carry a stable code and use the subclass name', () => {
    const error = new ProjectNotFound('No such project')

    expect(error.code).toBe('project_not_found')
    expect(error.name).toBe('ProjectNotFound')
    expect(error.message).toBe('No such project')
    expect(error).toBeInstanceOf(NotFoundException)
  })

  it('may name the request field they are about', () => {
    expect(new NameInvalid('Too short', { field: 'name' }).field).toBe('name')
    expect(new NameTaken('Already used').field).toBeUndefined()
  })

  it('keep the original error as cause', () => {
    const cause = new Error('boom')

    expect(new NameTaken('Already used', { cause }).cause).toBe(cause)
  })

  it('has no cause unless one is given', () => {
    expect(new NameTaken('Already used').cause).toBeUndefined()
  })
})
