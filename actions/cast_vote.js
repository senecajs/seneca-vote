const Assert = require('assert-plus')
const Vote = require('../entities/sys/vote')
const Shapes = require('../lib/shapes')
const { fetchProp } = require('../lib/utils')
const { ValidationError, NotFoundError } = require('../lib/errors')
const CastVoteService = require('../services/cast_vote')
const GetVoteStatsForPollService = require('../services/get_vote_stats_for_poll')

module.exports = function (opts = {}) {
  this.add('sys:vote,vote:*', async function(msg, reply) {
    try {
      // TODO:
      // - [ ] Use seneca-joi
      //
      const validateMessage = Shapes.makeValidator(joi => joi.object({
        vote: joi.string().valid(Vote.TYPE_UP(), Vote.TYPE_DOWN()).required(),
        fields: joi.object({
          poll_id: joi.string().max(64).required(),
          voter_id: joi.string().max(64).required(),
          voter_type: joi.valid('sys/user').required()
        }).required()
      }).unknown(), { stripUnknown: true })

      const vote_type = fetchProp(msg, 'vote')
      const safe_params = await validateMessage(msg)
      const poll_id = fetchProp(safe_params, ['fields', 'poll_id'])
      const voter_id = fetchProp(safe_params, ['fields', 'voter_id'])
      const voter_type = fetchProp(safe_params, ['fields', 'voter_type'])

      await CastVoteService.castVote({
        vote_type,
        poll_id,
        voter_id,
        voter_type
      }, { seneca: this })

      const poll_stats = await GetVoteStatsForPollService
        .getVoteStatsForPoll({ poll_id }, { seneca: this })


      return reply(null, {
        status: 'success',
        data: { poll_stats }
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

      if (err instanceof NotFoundError) {
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

