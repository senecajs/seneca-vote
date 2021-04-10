const Assert = require('assert-plus')
const Joi = require('joi')
const Poll = require('../entities/sys/poll')
const { lock } = require('../lib/lock')
const Shapes = require('../lib/shapes')
const { fetchProp } = require('../lib/utils')
const { ValidationError } = require('../lib/errors')

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

      await lock(async () => {
        const poll_entity = Poll.entity({ seneca: this })
        const existing_poll = await poll_entity.load$({ title: poll_title })

        if (existing_poll) {
          return reply(null, {
            status: 'success',
            data: { poll: existing_poll.data$(false) }
          })
        }

        const poll_attributes = {
          title: poll_title,
          created_at: new Date(),
          updated_at: null
        }

        await poll_entity.make$()
          .data$(poll_attributes)
          .save$()

        const new_poll = await poll_entity.load$(poll_attributes)

        return reply(null, {
          status: 'success',
          data: { poll: new_poll.data$(false) }
        })
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

