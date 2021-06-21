const Assert = require('assert-plus')
const { ValidationError, NotFoundError } = require('./errors')
const Shapes = require('./shapes')
const { fetchProp } = require('./utils')

class Reply {
  static ok(data) {
    Shapes.match(pattern => pattern.object().unknown().default({}), data)
    return { ...data, ok: true }
  }

  static invalidField(data) {
    Shapes.match(pattern => pattern.object({
      details: pattern.object({
        path: pattern.array().items(pattern.string().max(255)).required(),
        why_exactly: pattern.string().allow('', null).max(255).required()
      }).optional()
    }), data)

    const why = 'invalid-field'
    const details = data.details

    let shape

    shape = {}
    shape.ok = false
    shape.why = why
    if (details) shape.details = details

    return shape
  }

  static invalidFieldOfValidationError(err) {
    Assert(err instanceof ValidationError, 'err')

    const details = buildDetails()

    return Reply.invalidField({ details })


    function buildDetails() {
      const all_details = fetchProp(err, 'details', Assert.array)

      if (all_details.length === 0) {
        return { path: [], why_exactly: '' }
      }

      const details = all_details[0]
      const path = details.path || []

      const parts = (details.type || '').split('.')
      const why_exactly = parts[parts.length - 1]

      return { path, why_exactly }
    }
  }

  static notFound(data = {}) {
    Shapes.match(pattern => pattern.object({
      details: pattern.object({
        what: pattern.string().max(255).required()
      }).optional()
    }), data)

    const why = 'not-found'
    const details = buildDetails()

    let shape

    shape = {}
    shape.ok = false
    shape.why = why
    if (details) shape.details = details

    return shape


    function buildDetails() {
      if (!data.details) {
        return null
      }

      const validate = Shapes.makeValidator(schema => schema.object({
        what: schema.string().max(255).required()
      }))

      return validate(data.details)
    }
  }

  static handleAppError(err, reply) {
    //
    // NOTE: This function is meant to handle general app errors, e.g.
    // related to an entity not being found or failed validation.
    // If you have any action-specific errors that you want to handle,
    // please handle them in the corresponding message handler, e.g.
    // ```
    //   try { ... }
    //   catch (err) {
    //     if (err instanceof MyPreciousError) {
    //       return reply(null, ...)
    //     }
    //
    //     return handleAppError(err, reply)
    //   }
    // ```
    //
    if (err instanceof ValidationError) {
      return reply(null, Reply.invalidFieldOfValidationError(err))
    }

    if (err instanceof NotFoundError) {
      return reply(
        null,

        Reply.notFound({
          details: { what: err.message }
        })
      )
    }

    return reply(err)
  }
}

module.exports = Reply
