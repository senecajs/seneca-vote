const Assert = require('assert-plus')
const Vote = require('./vote_entity')
const Shapes = require('./shapes')
const { fetchProp } = require('./utils')
const { NotFoundError } = require('./errors')
const VoteStats = require('./vote_stats')
const PollRating = require('./poll_rating')
const Reply = require('./reply')

module.exports = function (opts) {
  async function handler(msg, reply) {
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

      await castVote({
        vote_type,
        poll_id,
        voter_id,
        voter_type,
        vote_kind,
        vote_code
      }, { seneca: this }, opts)

      const poll_stats = await VoteStats
        .forPoll({ poll_id, vote_kind, vote_code }, { seneca: this }, opts)


      if ('save_poll_rating_to' in msg) {
        const save_poll_rating_to = fetchProp(msg, 'save_poll_rating_to')
        const poll_rating = fetchProp(poll_stats, 'num_total')

        await PollRating.denormalizeToEntities({
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
      return Reply.handleAppError(err, reply)
    }
  }


  function validateMessage(msg) {
    const {
      entityIdSchema: idSchema,
      entityNameSchema: entityName,
      voteKindSchema: voteKind,
      voteCodeSchema: voteCode
    } = Shapes

    const validate = Shapes.makeValidator(joi => {
      return joi.object({
        vote: joi.string().valid(Vote.TYPE_UP(), Vote.TYPE_DOWN()).required(),

        fields: joi.object({
          poll_id: idSchema(joi).required(),
          voter_id: idSchema(joi).required(),
          voter_type: joi.valid('sys/user').required(),
          kind: voteKind(joi).required(),
          code: voteCode(joi).required()
        }).required(),

        save_poll_rating_to: joi.object()
          .pattern(entityName(joi), idSchema(joi))
          .optional()
      }).unknown()
    }, { stripUnknown: true })

    return validate(msg)
  }


  async function castVote(args, ctx, opts = {}) {
    Assert.object(args, 'args')
    Assert.object(ctx, 'ctx')
    Assert.object(opts, 'opts')

    const seneca = fetchProp(ctx, 'seneca')

    const voter_id = fetchProp(args, 'voter_id')
    const voter_type = fetchProp(args, 'voter_type')
    const poll_id = fetchProp(args, 'poll_id')
    const vote_type = fetchProp(args, 'vote_type')
    const vote_kind = fetchProp(args, 'vote_kind')
    const vote_code = fetchProp(args, 'vote_code')

    const poll = await seneca.make('sys/poll').load$(poll_id)

    if (!poll) {
      throw new NotFoundError('poll')
    }

    const vote_attributes = {
      poll_id,
      voter_id,
      voter_type,
      type: vote_type,
      kind: vote_kind,
      code: vote_code,
      created_at: new Date()
    }

    const _new_vote = await seneca.make('sys/vote')
      .data$(vote_attributes)
      .save$()

    return
  }


  return handler
}

