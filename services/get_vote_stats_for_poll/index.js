const Assert = require('assert-plus')
const Poll = require('../../entities/sys/poll')
const Vote = require('../../entities/sys/vote')
const { fetchProp } = require('../../lib/utils')

class GetPollVoteStats {
  static async getVoteStatsForPoll(args, ctx) {
    Assert.object(args, 'args')
    Assert.object(ctx, 'ctx')

    const seneca = fetchProp(ctx, 'seneca')
    const poll_id = fetchProp(args, 'poll_id')

    const numVotesForThePollWhere = poll_attrs =>
      Vote.entity({ seneca })
        .list$({ ...poll_attrs, poll_id })
        .then(votes => votes.length)

    const num_upvotes = await numVotesForThePollWhere({ type: Vote.TYPE_UP() })
    const num_downvotes = await numVotesForThePollWhere({ type: Vote.TYPE_DOWN() })

    return { num_upvotes, num_downvotes }
  }
}

module.exports = GetPollVoteStats
