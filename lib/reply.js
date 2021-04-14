const Assert = require('assert-plus')
const { ValidationError, NotFoundError } = require('./errors')
const Shapes = require('./shapes')
const { fetchProp } = require('./utils')

class Reply {
  static ok(data = {}) {
    return { ...data, ok: true }
  }

  static invalidField(data = {}) {
    const why = 'invalid-field'

    const details = (() => {
      if (!data.details) {
        return null
      }

      const validate = Shapes.makeValidator(schema => schema.object({
        path: schema.array().items(schema.string().max(255)).required(),
        why_exactly: schema.string().max(255).required()
      }))

      return validate(data.details)
    })()

    let shape

    shape = {}
    shape.ok = false
    shape.why = why
    if (details) shape.details = details

    return shape
  }

  static invalidFieldOfValidationError(err) {
    const details = (() => {
      Assert(err instanceof ValidationError, 'err')

      const all_details = fetchProp(err, 'details', Assert.array)

      if (all_details.length === 0) {
        return { path: [], why_exactly: '' }
      }

      const details = all_details[0]
      const path = details.path || []

      const why_exactly = (() => {
        const parts = (details.type || '').split('.')
        return parts[parts.length - 1]
      })()

      return { path, why_exactly }
    })()

    return Reply.invalidField({ details })
  }

  static notFound(data) {
    const why = 'not-found'

    const details = (() => {
      if (!data.details) {
        return null
      }

      const validate = Shapes.makeValidator(schema => schema.object({
        what: schema.string().max(255).required()
      }))

      return validate(data.details)
    })()

    let shape

    shape = {}
    shape.ok = false
    shape.why = why
    if (details) shape.details = details

    return shape
  }

  static notFoundOfNotFoundError(err) {
    Assert(err instanceof NotFoundError, 'err')

    throw new Error('not implemented')
  }
}

module.exports = Reply
