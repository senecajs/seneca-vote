const Assert = require('assert-plus')
const Vote = require('./vote_entity')
const groupBy = require('lodash.groupby')
const isMatch = require('lodash.ismatch')
const { countBy } = require('./utils')

class VoteStats {
  static async forPoll(args, ctx, options = {}) {
    const current_votes = await currentVotesForPoll(args, ctx)

    const num_upvotes = countBy(vote => {
      return Vote.TYPE_UP() === vote.type &&
        null == vote.undone_at
    }, current_votes)

    const num_downvotes = countBy(vote => {
      return Vote.TYPE_DOWN() === vote.type &&
        null == vote.undone_at
    }, current_votes)

    const num_total = calculateNumTotal({ num_upvotes, num_downvotes },
      ctx, options)

    return VoteStats.Shapes.stats({ num_upvotes, num_downvotes, num_total })


    function calculateNumTotal(args, _ctx, options = {}) {
      Assert.object(args, 'args')
      Assert.number(args.num_upvotes, 'args.num_upvotes')
      Assert.number(args.num_downvotes, 'args.num_downvotes')

      const { num_upvotes, num_downvotes } = args
      const actual_total = num_upvotes - num_downvotes

      if (options.allow_negative_num_total_votes) {
        return actual_total
      }

      return Math.max(0, actual_total)
    }


    function currentVotesForPoll(args, ctx) {
      Assert.object(ctx, 'ctx')
      const { seneca } = ctx

      Assert.object(args, 'args')
      const { poll_id, vote_kind, vote_code } = args

      return seneca.make('sys/vote')
        .list$({
          poll_id,
          kind: vote_kind,
          code: vote_code
        })
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

      const voter_id = vote.voter_id
      const voter_type = vote.voter_type

      return [voter_id, voter_type].join('.')
    }

    function byDateOfVote(vote1, vote2) {
      Assert.object(vote1, 'vote1')
      Assert.object(vote2, 'vote2')

      const voted_at1 = vote1.created_at
      const voted_at2 = vote2.created_at

      return voted_at1.getTime() - voted_at2.getTime()
    }

    function desc(cmp) {
      return (x, y) => -1 * cmp(x, y)
    }
  }
}

VoteStats.Shapes = class {
  static stats(data) {
    Assert.object(data, 'data')
    Assert.number(data.num_upvotes, 'data.num_upvotes')
    Assert.number(data.num_downvotes, 'data.num_downvotes')
    Assert.number(data.num_total, 'data.num_total')

    return data
  }
}

module.exports = VoteStats
