const Assert = require('assert-plus')
const Vote = require('./vote_entity')
const Shapes = require('./shapes')
const { NotFoundError } = require('./errors')
const VoteStats = require('./vote_stats')
const PollRating = require('./poll_rating')
const Reply = require('./reply')

module.exports = function make_cast_vote(options) {
  async function cast_vote(msg, reply) {
    try {
      const { vote: vote_type } = msg
      const safe_params = await validateMessage(msg)

      const {
        fields: {
          poll_id,
          voter_id,
          voter_type,
          kind: vote_kind,
          code: vote_code
        }
      } = safe_params

      // TODO: Implement transactions.
      //

      await doCastVote({
        vote_type,
        poll_id,
        voter_id,
        voter_type,
        vote_kind,
        vote_code
      }, { seneca: this }, options)

      const poll_stats = await VoteStats
        .forPoll({ poll_id, vote_kind, vote_code }, { seneca: this }, options)


      if ('dependents' in msg) {
        const { dependents } = msg
        const poll_rating = poll_stats.num_total

        await PollRating.denormalizeToEntities({
          rating: poll_rating,
          entities: dependents,
          vote_kind,
          vote_code
        }, { seneca: this }, options)
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

        dependents: joi.object()
          .pattern(entityName(joi), idSchema(joi))
          .optional()
      }).unknown()
    }, { stripUnknown: true })

    return validate(msg)
  }


  async function doCastVote(args, ctx, options = {}) {
    Assert.object(args, 'args')
    Assert.object(ctx, 'ctx')
    Assert.object(options, 'options')

    const { seneca } = ctx

    const {
      voter_id,
      voter_type,
      poll_id,
      vote_type,
      vote_kind,
      vote_code
    } = args

    const poll = await seneca.make('sys/poll').load$(poll_id)

    if (!poll) {
      return seneca.fail('not_found', { what: 'poll' })
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


  return cast_vote
}

