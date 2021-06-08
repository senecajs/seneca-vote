const Reply = require('../../lib/reply')
const { ValidationError } = require('../../lib/errors')

describe('invalidFieldOfValidationError', () => {
  it('can handle validation errors with empty details', () => {
    const err = new ValidationError()
    const result = Reply.invalidFieldOfValidationError(err)

    expect({
      ok: false,
      why: 'invalid-field',
      details: { path: [], why_exactly: '' }
    })
  })

  it('handles validation error with details', () => {
    const err = new ValidationError(
      null, null, null, 
      {
        details: [
          { path: ['foo', 'baz'], type: 'foo.base' }
        ]
      }
    )

    const result = Reply.invalidFieldOfValidationError(err)

    expect(result).toEqual({
      ok: false,
      why: 'invalid-field',
      details: { path: ['foo', 'baz'], why_exactly: 'base' }
    })
  })

  it('handles validation error without details[i].paths', () => {
    const err = new ValidationError(
      null, null, null, 
      {
        details: [
          { type: 'foo.base' }
        ]
      }
    )

    const result = Reply.invalidFieldOfValidationError(err)

    expect(result).toEqual({
      ok: false,
      why: 'invalid-field',
      details: { path: [], why_exactly: 'base' }
    })
  })

  it('handles validation error without details[i].type', () => {
    const err = new ValidationError(
      null, null, null, 
      {
        details: [
          { path: ['foo', 'baz'] }
        ]
      }
    )

    const result = Reply.invalidFieldOfValidationError(err)

    expect(result).toEqual({
      ok: false,
      why: 'invalid-field',
      details: { path: ['foo', 'baz'], why_exactly: '' }
    })
  })
})

describe('notFound', () => {
  it('can handle missing details', () => {
    const result = Reply.notFound()

    expect(result).toEqual({ ok: false, why: 'not-found' })
  })
})

describe('invalidField', () => {
  it('can handle missing details', () => {
    const result = Reply.invalidField({})

    expect(result).toEqual({ ok: false, why: 'invalid-field' })
  })
})

