const Assert = require('assert-plus')
const Vote = require('../../entities/sys/vote')
const Poll = require('../../entities/sys/poll')
const { fetchProp } = require('../../lib/utils')
const { lock } = require('../../lib/lock')
const { NotFoundError } = require('../../lib/errors')
const PluginOptions = require('../../plugin_options')

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

    return await lock(async () => {
      const poll = await Poll.entity({ seneca }).load$(poll_id)

      if (!poll) {
        throw new NotFoundError(`Poll with id ${poll_id} does not exist.`)
      }

      const vote_attributes = {
        poll_id,
        voter_id,
        voter_type,
        type: vote_type,
        created_at: new Date()
      }

      const _new_vote = await Vote.entity({ seneca })
        .make$()
        .data$(vote_attributes)
        .save$()

      return
    }, { disabled: PluginOptions.areLocksDisabled(opts) })
  }
}

module.exports = CastVoteService
