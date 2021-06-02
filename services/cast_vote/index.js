const Assert = require('assert-plus')
const Vote = require('../../entities/sys/vote')
const { fetchProp } = require('../../lib/utils')
const { NotFoundError } = require('../../lib/errors')

class CastVoteService {
  static async castVote(args, ctx, opts = {}) {
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

    const _new_vote = seneca.make('sys/vote')
      .data$(vote_attributes)
      .save$()

    return
  }
}

module.exports = CastVoteService
