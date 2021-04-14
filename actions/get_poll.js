const Assert = require('assert-plus')
const Poll = require('../entities/sys/poll')
const Shapes = require('../lib/shapes')
const { fetchProp } = require('../lib/utils')
const { ValidationError } = require('../lib/errors')
const Reply = require('../lib/reply')

module.exports = function (opts = {}) {
  this.add('sys:vote,get:poll', async function (msg, reply) {
    try {
      // TODO:
      // - [ ] Use seneca-joi
      //
      const validateMessage = Shapes.makeValidator(joi => joi.object({
        poll_id: joi.string().max(64).required()
      }).unknown(), { stripUnknown: true })

      const safe_params = await validateMessage(msg)
      const poll_id = fetchProp(safe_params, 'poll_id', Assert.string)

      const poll_entity = Poll.entity({ seneca: this })
      const poll = await poll_entity.load$(poll_id)

      if (!poll) {
        return reply(null, Reply.notFound({
          details: { what: 'poll' }
        }))
      }

      return reply(null, Reply.ok({
        data: { poll: poll.data$(false) }
      }))
    } catch (err) {
      // TODO: DRY up this pattern.
      //
      if (err instanceof ValidationError) {
        return reply(null, Reply.invalidFieldOfValidationError(err))
      }

      return reply(err)
    }
  })
}

