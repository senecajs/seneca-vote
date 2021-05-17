const Assert = require('assert-plus')
const Seneca = require('seneca')
const Entities = require('seneca-entity')
const SenecaPromisify = require('seneca-promisify')
const Fixtures = require('../support/fixtures')
const { fetchProp, yesterday } = require('../support/helpers')
const GetPollVoteStats = require('../../services/get_vote_stats_for_poll')

fdescribe('the GetPollVoteStats service', () => { // fcs
  let seneca

  beforeEach(() => {
    seneca = Seneca({ log: 'test' })
      .use(Entities)
      .use(SenecaPromisify)
  })

  function senecaUnderTest(seneca, cb) {
    return seneca.test(cb)
  }

  describe('an upvote exists for the poll', () => {
    let poll_id

    beforeEach(async () => {
      const poll = await seneca.make('sys/poll')
        .data$(Fixtures.poll())
        .save$()

      poll_id = fetchProp(poll, 'id')
    })

    describe('an upvote exists for the poll', () => {
      beforeEach(async () => {
        await seneca.make('sys/vote')
          .data$(Fixtures.vote({ type: 'up', poll_id }))
          .save$()
      })

      it('returns correct vote counts', done => {
        const si = senecaUnderTest(seneca, done)

        GetPollVoteStats
          .getVoteStatsForPoll({ poll_id }, { seneca: si })
          .then(result => {
            expect(result).toEqual(jasmine.objectContaining({
              num_upvotes: 1,
              num_downvotes: 0
            }))
            return done()
          }).catch(done)
      })
    })

    describe('a downvote exists for the poll', () => {
      beforeEach(async () => {
        await seneca.make('sys/vote')
          .data$(Fixtures.vote({ type: 'down', poll_id }))
          .save$()
      })

      it('returns correct vote counts', done => {
        const si = senecaUnderTest(seneca, done)

        GetPollVoteStats
          .getVoteStatsForPoll({ poll_id }, { seneca: si })
          .then(result => {
            expect(result).toEqual(jasmine.objectContaining({
              num_upvotes: 0,
              num_downvotes: 1
            }))
            return done()
          }).catch(done)
      })
    })

    describe('a voter first upvoted, then changed his mind and downvoted', () => {
      const voter_id = 'some_voter_id'

      beforeEach(async () => {
        await seneca.make('sys/vote')
          .data$(Fixtures.vote({ type: 'up', poll_id, voter_id }))
          .save$()
      })

      beforeEach(async () => {
        await seneca.make('sys/vote')
          .data$(Fixtures.vote({ type: 'down', poll_id, voter_id }))
          .save$()
      })

      fit('returns correct vote counts', done => { // fcs
        const si = senecaUnderTest(seneca, done)

        GetPollVoteStats
          .getVoteStatsForPoll({ poll_id }, { seneca: si })
          .then(result => {
            expect(result).toEqual(jasmine.objectContaining({
              num_upvotes: 0,
              num_downvotes: 1
            }))
            return done()
          }).catch(done)
      })
    })

    describe('no votes exist', () => {
      it('returns correct vote counts', done => {
        const si = senecaUnderTest(seneca, done)

        GetPollVoteStats
          .getVoteStatsForPoll({ poll_id }, { seneca: si })
          .then(result => {
            expect(result).toEqual(jasmine.objectContaining({
              num_upvotes: 0,
              num_downvotes: 0
            }))
            return done()
          }).catch(done)
      })
    })
  })
})

