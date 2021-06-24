const Assert = require('assert-plus')
const Seneca = require('seneca')
const { Joi } = Seneca.util
const Shapes = require('./shapes')
const Vote = require('./vote_entity')
const Reply = require('./reply')

module.exports = function make_open_poll(options) {
  async function open_poll(msg, reply) {
    try {
      const validateMessage = Shapes.makeValidator(joi => joi.object({
        fields: joi.object({
          title: joi.string().max(255).required()
        }).required()
      }).unknown(), { stripUnknown: true })

      const safe_params = await validateMessage(msg)
      const { fields: { title: poll_title } } = safe_params

      const opened_poll = await doOpenPoll({ poll_title },
        { seneca: this }, options)

      return reply(null, Reply.ok({
        data: { poll: opened_poll.data$(false) }
      }))
    } catch (err) {
      return Reply.handleAppError(err, reply)
    }
  }


  async function doOpenPoll(args, ctx, options = {}) {
    Assert.object(args, 'args')
    Assert.object(ctx, 'ctx')
    Assert.object(options, 'options')

    const { seneca } = ctx
    const { poll_title } = args

    const existing_poll = await seneca.make('sys/poll')
      .load$({ title: poll_title })

    if (existing_poll) {
      return existing_poll
    }

    const poll_attributes = {
      title: poll_title,
      created_at: new Date(),
      updated_at: null
    }

    await seneca.make('sys/poll')
      .data$(poll_attributes)
      .save$({ upsert$: ['title'] })

    const new_poll = await seneca.make('sys/poll')
      .load$(poll_attributes)

    return new_poll
  }


  return open_poll
}

