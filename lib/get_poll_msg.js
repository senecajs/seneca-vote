const Assert = require('assert-plus')
const Shapes = require('./shapes')
const Reply = require('./reply')

module.exports = function (options) {
  return async function (msg, reply) {
    try {
      const validateMessage = Shapes.makeValidator(joi => joi.object({
        poll_id: joi.string().max(64).required()
      }).unknown(), { stripUnknown: true })

      const safe_params = await validateMessage(msg)
      const { poll_id } = safe_params

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
      return Reply.handleAppError(err, reply)
    }
  }
}

