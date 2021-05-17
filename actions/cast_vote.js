const Assert = require('assert-plus')
const Vote = require('../entities/sys/vote')
const Shapes = require('../lib/shapes')
const { fetchProp } = require('../lib/utils')
const { ValidationError, NotFoundError } = require('../lib/errors')
const CastVoteService = require('../services/cast_vote')
const GetVoteStats = require('../services/get_vote_stats')
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

      await CastVoteService.castVote({
        vote_type,
        poll_id,
        voter_id,
        voter_type,
        vote_kind,
        vote_code
      }, { seneca: this }, opts)

      const poll_stats = await GetVoteStats
        .forPoll({ poll_id }, { seneca: this }, opts)


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
        return reply(null, Reply.notFound({
          details: { what: 'poll' }
        }))
      }

      return reply(err)
    }
  })


  const validateMessage = Shapes.makeValidator(joi => {
    const idSchema = () => joi.string().max(64)
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

      dependents: joi.object().pattern(entityNameSchema(), idSchema()).optional()
    }).unknown()
  }, { stripUnknown: true })
}
