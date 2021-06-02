const Assert = require('assert-plus')
const Shapes = require('./shapes')
const { fetchProp } = require('./utils')
const { ValidationError } = require('./errors')
const Reply = require('./reply')

module.exports = function (opts = {}) {
  return async function (msg, reply) {
    try {
      const validateMessage = Shapes.makeValidator(joi => joi.object({
        poll_id: joi.string().max(64).required()
      }).unknown(), { stripUnknown: true })

      const safe_params = await validateMessage(msg)
      const poll_id = fetchProp(safe_params, 'poll_id', Assert.string)

      const poll = await this.make('sys/poll').load$(poll_id)

      if (!poll) {
        return reply(null, Reply.notFound({
          details: { what: 'poll' }
        }))
      }

      return reply(null, Reply.ok({
        data: { poll: poll.data$(false) }
      }))
    } catch (err) {
      if (err instanceof ValidationError) {
        return reply(null, Reply.invalidFieldOfValidationError(err))
      }

      return reply(err)
    }
  }
}

