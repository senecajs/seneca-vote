const Assert = require('assert-plus')
const Joi = require('joi')
const Shapes = require('../lib/shapes')
const { fetchProp } = require('../lib/utils')
const { ValidationError } = require('../lib/errors')
const OpenPollService = require('../services/open_poll')

module.exports = function (opts = {}) {
  this.add('sys:vote,open:poll', async function (msg, reply) {
    try {
      // TODO:
      // - [ ] Use seneca-joi
      //
      const validateMessage = Shapes.makeValidator(joi => joi.object({
        fields: joi.object({
          title: joi.string().max(255).required()
        }).required()
      }).unknown(), { stripUnknown: true })

      const safe_params = await validateMessage(msg)
      const poll_title = fetchProp(safe_params, ['fields', 'title'], Assert.string)

      const opened_poll = await OpenPollService.openPoll({ poll_title }, { seneca: this })

      return reply(null, {
        status: 'success',
        data: { poll: opened_poll.data$(false) }
      })
    } catch (err) {
      // TODO: DRY up this pattern.
      //
      if (err instanceof ValidationError) {
        const error_message = fetchProp(err, 'message')

        return reply(null, {
          status: 'failed',
          error: { message: error_message }
        })
      }

      return reply(err)
    }
  })
}

