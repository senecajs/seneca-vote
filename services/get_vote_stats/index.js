const Assert = require('assert-plus')
const Poll = require('../../entities/sys/poll')
const Vote = require('../../entities/sys/vote')
const groupBy = require('lodash.groupby')
const { fetchProp, countMatching } = require('../../lib/utils')

class GetVoteStats {
  static async forPoll(args, ctx, opts = {}) {
    const current_votes = await currentVotesForPoll(args, ctx)

    const num_upvotes = countMatching({ type: Vote.TYPE_UP() }, current_votes)
    const num_downvotes = countMatching({ type: Vote.TYPE_DOWN() }, current_votes)

    return GetVoteStats.Shapes.stats({ num_upvotes, num_downvotes })


    function currentVotesForPoll(args, ctx) {
      Assert.object(ctx, 'ctx')
      const seneca = fetchProp(ctx, 'seneca')

      Assert.object(args, 'args')
      const poll_id = fetchProp(args, 'poll_id')
      const vote_kind = fetchProp(args, 'vote_kind')
      const vote_code = fetchProp(args, 'vote_code')

      return Vote.entity({ seneca })
        .list$({ poll_id, kind: vote_kind, code: vote_code })
        .then(groupVotesByVoter)
        .then(votes_by_voter => {
          return votes_by_voter.map(votes => {
            Assert.array(votes, 'votes')
            Assert(votes.length > 0, 'votes.length')

            const [actual_vote,] = votes.sort(desc(byDateOfVote))

            return actual_vote
          })
        })
    }

    function groupVotesByVoter(votes) {
      Assert.array(votes, 'votes')

      const groups = groupBy(votes, byVoter)

      return Object.values(groups)
    }

    function byVoter(vote) {
      Assert.object(vote, 'vote')

      const voter_id = fetchProp(vote, 'voter_id', Assert.string)
      const voter_type = fetchProp(vote, 'voter_type', Assert.string)

      return [voter_id, voter_type].join('.')
    }

    function byDateOfVote(vote1, vote2) {
      Assert.object(vote1, 'vote1')
      Assert.object(vote2, 'vote2')

      const voted_at1 = fetchProp(vote1, 'created_at', Assert.date)
      const voted_at2 = fetchProp(vote2, 'created_at', Assert.date)

      return voted_at1.getTime() - voted_at2.getTime()
    }

    function desc(cmp) {
      return (x, y) => -1 * cmp(x, y)
    }
  }

  static async pollRatingBasedOnStats(stats) {
    Assert.object(stats, 'stats')

    const num_upvotes = fetchProp(stats, 'num_upvotes')
    const num_downvotes = fetchProp(stats, 'num_downvotes')

    return num_upvotes - num_downvotes
  }
}

GetVoteStats.Shapes = class {
  static stats(data) {
    Assert.object(data, 'data')
    Assert.number(data.num_upvotes, 'data.num_upvotes')
    Assert.number(data.num_downvotes, 'data.num_downvotes')

    return data
  }
}

module.exports = GetVoteStats
