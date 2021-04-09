const Assert = require('assert-plus')
const Joi = require('joi')
const Poll = require('../entities/sys/poll')
const { fetchProp } = require('../lib/utils')
const { lock } = require('../lib/lock')
const Shapes = require('../lib/shapes')

module.exports = function (opts = {}) {
  this.add('sys:vote,open:poll', async function (msg, reply) {
    // TODO:
    // - [ ] Use seneca-joi
    // - [ ] Proper handling of the validation errors.
    //
    Shapes.validate(joi => joi.object({
      fields: joi.object({
        title: joi.string().max(255).required()
      }).required()
    }))
      // WARNING: UNSAFE. TODO: Proper error handling.
      //
      .catch(reply)

    const poll_title = fetchProp(msg, ['fields', 'title'], Assert.string)

    await lock(async () => {
      const poll_entity = Poll.entity({ seneca: this })
      const existing_poll = await poll_entity.load$({ title: poll_title })

      if (existing_poll) {
        return reply(null, { poll: existing_poll.data$(false) })
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

      return reply(null, { poll: new_poll.data$(false) })
    })
  })
}

