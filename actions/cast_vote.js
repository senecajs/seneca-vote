const Assert = require('assert-plus')
const Vote = require('../entities/sys/vote')
const Poll = require('../entities/sys/poll')
const Shapes = require('../lib/shapes')
const { fetchProp } = require('../lib/utils')
const { ValidationError } = require('../lib/errors')
const { lock } = require('../lib/lock')

module.exports = function (opts = {}) {
  this.add('sys:vote,vote:up', castVote)
  this.add('sys:vote,vote:down', castVote)

  async function castVote(msg, reply) {
    try {
      // TODO:
      // - [ ] Use seneca-joi
      //
      const validateMessage = Shapes.makeValidator(joi => joi.object({
        vote: joi.string().valid('up', 'down').required(),
        fields: joi.object({
          poll_id: joi.string().max(64).required(),
          voter_id: joi.string().max(64).required(),
          voter_type: joi.valid('sys/user').required()
        }).required()
      }).unknown(), { stripUnknown: true })

      const vote_type = fetchProp(msg, 'vote')
      const safe_params = await validateMessage(msg)

      await lock(async () => {
        const poll_id = fetchProp(safe_params, ['fields', 'poll_id'])
        const poll = await Poll.entity({ seneca: this }).load$({ id: poll_id })

        if (!poll) {
          return reply(null, {
            status: 'failed',
            error: {
              message: `Poll with id ${poll_id} does not exist.` 
            }
          })
        }


        const voter_id = fetchProp(safe_params, ['fields', 'voter_id'])
        const voter_type = fetchProp(safe_params, ['fields', 'voter_type'])

        const existing_vote = await Vote.entity({ seneca: this })
          .load$({
            voter_id,
            voter_type,
            poll_id
          })

        if (existing_vote) {
          const existing_vote_type = fetchProp(existing_vote, 'type')

          if (vote_type !== existing_vote_type) {
            await existing_vote 
              .data$({ type: vote_type })
              .save$()
          }

          return reply(null, { status: 'success' })
        }

        const vote_attributes = {
          poll_id,
          type: vote_type,
          voter_id,
          voter_type,
          created_at: new Date(),
          updated_at: null
        }

        const _new_vote = await Vote.entity({ seneca: this })
          .make$()
          .data$(vote_attributes)
          .save$()
      })

      return reply(null, { status: 'success' })
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
  }
}


