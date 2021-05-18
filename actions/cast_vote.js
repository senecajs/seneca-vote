const Assert = require('assert-plus')
const Vote = require('../entities/sys/vote')
const Shapes = require('../lib/shapes')
const { fetchProp } = require('../lib/utils')
const { ValidationError, NotFoundError } = require('../lib/errors')
const CastVoteService = require('../services/cast_vote')
const GetVoteStats = require('../services/get_vote_stats')
const SavePollRating = require('../services/save_poll_rating')
const Reply = require('../lib/reply')

module.exports = function (opts = {}) {
  this.add('sys:vote,vote:*', async function (msg, reply) {
    try {
      const vote_type = fetchProp(msg, 'vote')
      const safe_params = await validateMessage(msg)
      const poll_id = fetchProp(safe_params, ['fields', 'poll_id'])
      const voter_id = fetchProp(safe_params, ['fields', 'voter_id'])
      const voter_type = fetchProp(safe_params, ['fields', 'voter_type'])
      const vote_kind = fetchProp(safe_params, ['fields', 'kind'])
      const vote_code = fetchProp(safe_params, ['fields', 'code'])

      // TODO: Implement transactions.
      //

      await CastVoteService.castVote({
        vote_type,
        poll_id,
        voter_id,
        voter_type,
        vote_kind,
        vote_code
      }, { seneca: this }, opts)

      const poll_stats = await GetVoteStats
        .forPoll({ poll_id, vote_kind, vote_code }, { seneca: this }, opts)


      if ('save_poll_rating_to' in msg) {
        const poll_rating = GetVoteStats.pollRatingBasedOnStats(poll_stats)
        const save_poll_rating_to = fetchProp(msg, 'save_poll_rating_to')

        await SavePollRating.toEntities({
          rating: poll_rating,
          entities: save_poll_rating_to,
          vote_kind,
          vote_code
        }, { seneca: this }, opts)
      }


      return reply(null, Reply.ok({
        data: { poll_stats }
      }))
    } catch (err) {
      // TODO: DRY up this pattern.
      //
      if (err instanceof ValidationError) {
        return reply(null, Reply.invalidFieldOfValidationError(err))
      }

      if (err instanceof NotFoundError) {
        const details = (() => {
          if (typeof err.message === 'string') {
            return { details: { what: err.message } }
          }

          return {}
        })()

        return reply(null, Reply.notFound(details))
      }

      return reply(err)
    }
  })


  const validateMessage = Shapes.makeValidator(joi => {
    const idSchema = () => joi.string().max(64)

    // TODO: Make sure the entity name is well-formed (i.e. valid).
    //
    const entityNameSchema = () => joi.string().max(64)

    return joi.object({
      vote: joi.string().valid(Vote.TYPE_UP(), Vote.TYPE_DOWN()).required(),

      fields: joi.object({
        poll_id: idSchema().required(),
        voter_id: joi.string().max(64).required(),
        voter_type: joi.valid('sys/user').required(),
        kind: joi.string().max(64).required(),
        code: joi.string().max(64).required()
      }).required(),

      save_poll_rating_to: joi.object().pattern(entityNameSchema(), idSchema()).optional()
    }).unknown()
  }, { stripUnknown: true })
}
