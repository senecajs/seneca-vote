const Assert = require('assert-plus')
const Joi = require('joi')
const Shapes = require('./shapes')
const { fetchProp } = require('./utils')
const { ValidationError } = require('./errors')
const OpenPoll = require('./open_poll')
const Reply = require('./reply')

module.exports = function (opts = {}) {
  return async function (msg, reply) {
    try {
      const validateMessage = Shapes.makeValidator(joi => joi.object({
        fields: joi.object({
          title: joi.string().max(255).required()
        }).required()
      }).unknown(), { stripUnknown: true })

      const safe_params = await validateMessage(msg)
      const poll_title = fetchProp(safe_params, ['fields', 'title'], Assert.string)

      const opened_poll = await OpenPoll
        .openPoll({ poll_title }, { seneca: this }, opts)

      return reply(null, Reply.ok({
        data: { poll: opened_poll.data$(false) }
      }))
    } catch (err) {
      if (err instanceof ValidationError) {
        return reply(null, Reply.invalidFieldOfValidationError(err))
      }

      return reply(err)
    }
  }
}

