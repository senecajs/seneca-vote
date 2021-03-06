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

      const processVote = 'undo' === vote_type
        ? undoVote : doVote

      await processVote({
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
        vote: joi.string()
          .valid(Vote.TYPE_UP(), Vote.TYPE_DOWN(), 'undo').required(),

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


  async function doVote(args, ctx, options = {}) {
    Assert.object(args, 'args')
    Assert.object(ctx, 'ctx')
    Assert.object(options, 'options')

    const { seneca } = ctx

    const {
      poll_id,
      voter_id,
      voter_type,
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
      created_at: new Date(),
      undone_at: null
    }

    const _new_vote = await seneca.make('sys/vote')
      .data$(vote_attributes)
      .save$()

    return
  }

  async function undoVote(args, ctx, options = {}) {
    Assert.object(args, 'args')
    Assert.object(ctx, 'ctx')
    Assert.object(options, 'options')

    const { seneca } = ctx

    const {
      poll_id,
      voter_id,
      voter_type,
      vote_kind,
      vote_code
    } = args

    const vote_attributes = {
      poll_id,
      voter_id,
      voter_type,
      kind: vote_kind,
      code: vote_code
    }

    const current_vote = await seneca.make('sys/vote')
      .load$({
        ...vote_attributes,
        sort$: { created_at: -1 }
      })

    /* NOTE: Notice how we omit the :undone_at key in the load$ query. It makes
     * sense because a voter may only cancel his current vote. If his current
     * vote is already void (i.e. "undone") - we just do nothing, and return
     * successfully.
     */

    if (!current_vote) {
      // NOTE: If the user never voted but nonetheless tried to have his non-
      // existing vote canceled - we do nothing and return as normally.
      //
      return
    }


    const already_void = null != current_vote.undone_at

    if (!already_void) {
      /* NOTE: If the voter's current vote is already void (i.e. "undone"),
       * ignore it and do not overwrite the timestamp. From the business
       * perspective, a vote can only be "undone" once, but it will result
       * in no error to try and undo a vote multiple times.
       *
       * The guarantee, given by this function, is that if a voter voted
       * on a given poll before, then upon successful exit from the function,
       * his most recent vote, void or not, will be void.
       */

      await current_vote.data$({ undone_at: new Date() }).save$()
    }


    return
  }


  return cast_vote
}

