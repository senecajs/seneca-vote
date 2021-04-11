const Assert = require('assert-plus')
const Seneca = require('seneca')
const Entities = require('seneca-entity')
const SenecaPromisify = require('seneca-promisify')
const { fetchProp } = require('../support/helpers')
const VotePlugin = require('../../')

describe('the CastPoll action', () => {
  let seneca

  beforeEach(() => {
    seneca = Seneca({ log: 'test' })
      .use(Entities)
      .use(SenecaPromisify)
      .use(VotePlugin)
  })

  function senecaUnderTest(seneca, cb) {
    return seneca.test(cb)
  }

  async function countEntities(entity) {
    return entity.list$({}).then(xs => xs.length)
  }

  async function countVotes(seneca) {
    return countEntities(seneca.entity('sys/vote'))
  }

  async function countPolls(seneca) {
    return countEntities(seneca.entity('sys/poll'))
  }

  describe('upvoting', () => {
    async function messageUpVote(seneca, params) {
      return seneca.post({ sys: 'vote', vote: 'up', ...params })
    }

    function validParams() {
      return {
        fields: {
          poll_id: 'foo',
          voter_id: 'bar',
          voter_type: 'sys/user'
        }
      }
    }

    describe('when the "fields" parameter is missing', () => {
      it('responds with a validation error', done => {
        const params = validParams()

        delete params.fields

        messageUpVote(
          senecaUnderTest(seneca, done),
          params
        )
          .then(result => {
            expect(result).toEqual({
              status: 'failed',
              error: {
                message: '"fields" is required'
              }
            })

            return done()
          })
          .catch(done)
      })
    })

    describe('when the "poll_id" parameter is missing', () => {
      it('responds with a validation error', done => {
        const params = validParams()

        delete params.fields.poll_id

        messageUpVote(
          senecaUnderTest(seneca, done),
          params
        )
          .then(result => {
            expect(result).toEqual({
              status: 'failed',
              error: {
                message: '"fields.poll_id" is required'
              }
            })

            return done()
          })
          .catch(done)
      })
    })

    describe('when the "voter_id" parameter is missing', () => {
      it('responds with a validation error', done => {
        const params = validParams()

        delete params.fields.voter_id

        messageUpVote(
          senecaUnderTest(seneca, done),
          params
        )
          .then(result => {
            expect(result).toEqual({
              status: 'failed',
              error: {
                message: '"fields.voter_id" is required'
              }
            })

            return done()
          })
          .catch(done)
      })
    })

    describe('when the "voter_type" parameter is missing', () => {
      it('responds with a validation error', done => {
        const params = validParams()

        delete params.fields.voter_type

        messageUpVote(
          senecaUnderTest(seneca, done),
          params
        )
          .then(result => {
            expect(result).toEqual({
              status: 'failed',
              error: {
                message: '"fields.voter_type" is required'
              }
            })

            return done()
          })
          .catch(done)
      })
    })

    describe('when the specified "voter_type" is not supported', () => {
      it('responds with a validation error', done => {
        const params = validParams()

        params.fields.voter_type = 'foobar'

        messageUpVote(
          senecaUnderTest(seneca, done),
          params
        )
          .then(result => {
            expect(result).toEqual({
              status: 'failed',
              error: {
                message: '"fields.voter_type" must be [sys/user]'
              }
            })

            return done()
          })
          .catch(done)
      })
    })

    describe('when the poll does not exist', () => {
      it('responds with an error', done => {
        const seneca_under_test = senecaUnderTest(seneca, done)

        const params = validParams()
        const fake_poll_id = 'foo'
        params.fields.poll_id = fake_poll_id

        countPolls(seneca_under_test)
          .then(num_polls_initially => {
            Assert.strictEqual(0, num_polls_initially)
          })
          .then(() => messageUpVote(
            seneca_under_test,
            params
          ))
          .then(async (result) => {
            expect(result).toEqual({
              status: 'failed',
              error: {
                message: `Poll with id ${fake_poll_id} does not exist.` 
              }
            })

            expect(await countVotes(seneca_under_test)).toEqual(0)


            return done()
          })
          .catch(done)
      })
    })

    describe('when the poll exists', () => {
      let poll_id

      beforeEach(async () => {
        // TODO: Use a factory.
        //
        const poll = await seneca.entity('sys/poll')
          .make$({
            title: 'Lorem Ipsum',
            updated_at: null,
            created_at: new Date()
          })
          .save$()

        poll_id = fetchProp(poll, 'id')
      })

      beforeEach(async () => {
        const num_polls_initially = await countPolls(seneca)
        Assert.strictEqual(1, num_polls_initially)
      })

      describe('when the voter has already upvoted on this poll', () => {
        let vote_id

        const voter_id = 'v123abc'
        const voter_type = 'sys/user'

        beforeEach(async () => {
          // TODO: Use a factory.
          //
          const vote = await seneca.entity('sys/vote')
            .make$({
              poll_id,
              voter_id,
              voter_type,
              type: 'up',
              created_at: new Date(),
              updated_at: null
            })
            .save$()

          vote_id = fetchProp(vote, 'id')
        })

        it('does not cast a new upvote', done => {
          const seneca_under_test = senecaUnderTest(seneca, done)

          const params = validParams()
          params.fields.poll_id = poll_id
          params.fields.voter_id = voter_id
          params.fields.voter_type = voter_type

          countVotes(seneca_under_test)
            .then(num_votes_initially => {
              Assert.strictEqual(1, num_votes_initially)
            })
            .then(() => messageUpVote(
              seneca_under_test,
              params
            ))
            .then(async (result) => {
              expect(result).toEqual({
                status: 'success', data: { poll_stats: { num_upvotes: 1, num_downvotes: 0 } }
              })

              expect(await countVotes(seneca_under_test)).toEqual(1)

              return done()
            })
            .catch(done)
        })
      })

      describe('when the voter has already downvoted on this poll', () => {
        let vote_id

        const voter_id = 'v123abc'
        const voter_type = 'sys/user'

        beforeEach(async () => {
          // TODO: Use a factory.
          //
          const vote = await seneca.entity('sys/vote')
            .make$({
              poll_id,
              voter_id,
              voter_type,
              type: 'down',
              created_at: new Date(),
              updated_at: null
            })
            .save$()

          vote_id = fetchProp(vote, 'id')
        })

        it('does not cast a new upvote, but updates the existing downvote to upvote', done => {
          const seneca_under_test = senecaUnderTest(seneca, done)

          const params = validParams()
          params.fields.poll_id = poll_id
          params.fields.voter_id = voter_id
          params.fields.voter_type = voter_type

          countVotes(seneca_under_test)
            .then(num_votes_initially => {
              Assert.strictEqual(1, num_votes_initially)
            })
            .then(() => messageUpVote(
              seneca_under_test,
              params
            ))
            .then(async (result) => {
              expect(result).toEqual({
                status: 'success', data: { poll_stats: { num_upvotes: 1, num_downvotes: 0 } }
              })

              expect(await countVotes(seneca)).toEqual(1)

              const vote = await seneca.entity('sys/vote').load$({ id: vote_id })
              Assert.object(vote, 'vote')

              const vote_type = fetchProp(vote, 'type')
              expect(vote_type).toEqual('up')

              return done()
            })
            .catch(done)
        })
      })

      describe('when the voter is upvoting on this poll for the first time', () => {
        it('casts a new upvote', done => {
          const seneca_under_test = senecaUnderTest(seneca, done)

          const params = validParams()
          params.fields.poll_id = poll_id

          const voter_id = 'hsfa7tbga3'
          params.fields.voter_id = voter_id

          countVotes(seneca_under_test)
            .then(num_votes_initially => {
              Assert.strictEqual(0, num_votes_initially)
            })
            .then(() => messageUpVote(
              seneca_under_test,
              params
            ))
            .then(async (result) => {
              expect(result).toEqual({
                status: 'success', data: { poll_stats: { num_upvotes: 1, num_downvotes: 0 } }
              })

              expect(await countVotes(seneca)).toEqual(1)

              const vote = await seneca.entity('sys/vote').load$({ poll_id })
              Assert.object(vote, 'vote')

              expect(vote).toEqual(jasmine.objectContaining({
                id: jasmine.any(String),
                type: 'up',
                poll_id,
                voter_id,
                voter_type: 'sys/user',
                created_at: jasmine.any(Date),
                updated_at: null
              }))

              return done()
            })
            .catch(done)
        })
      })
    })
  })

  describe('downvoting', () => {
    async function messageDownVote(seneca, params) {
      return seneca.post({ sys: 'vote', vote: 'down', ...params })
    }

    function validParams() {
      return {
        fields: {
          poll_id: 'foo',
          voter_id: 'bar',
          voter_type: 'sys/user'
        }
      }
    }

    describe('when the "fields" parameter is missing', () => {
      it('responds with a validation error', done => {
        const params = validParams()

        delete params.fields

        messageDownVote(
          senecaUnderTest(seneca, done),
          params
        )
          .then(result => {
            expect(result).toEqual({
              status: 'failed',
              error: {
                message: '"fields" is required'
              }
            })

            return done()
          })
          .catch(done)
      })
    })

    describe('when the "poll_id" parameter is missing', () => {
      it('responds with a validation error', done => {
        const params = validParams()

        delete params.fields.poll_id

        messageDownVote(
          senecaUnderTest(seneca, done),
          params
        )
          .then(result => {
            expect(result).toEqual({
              status: 'failed',
              error: {
                message: '"fields.poll_id" is required'
              }
            })

            return done()
          })
          .catch(done)
      })
    })

    describe('when the "voter_id" parameter is missing', () => {
      it('responds with a validation error', done => {
        const params = validParams()

        delete params.fields.voter_id

        messageDownVote(
          senecaUnderTest(seneca, done),
          params
        )
          .then(result => {
            expect(result).toEqual({
              status: 'failed',
              error: {
                message: '"fields.voter_id" is required'
              }
            })

            return done()
          })
          .catch(done)
      })
    })

    describe('when the "voter_type" parameter is missing', () => {
      it('responds with a validation error', done => {
        const params = validParams()

        delete params.fields.voter_type

        messageDownVote(
          senecaUnderTest(seneca, done),
          params
        )
          .then(result => {
            expect(result).toEqual({
              status: 'failed',
              error: {
                message: '"fields.voter_type" is required'
              }
            })

            return done()
          })
          .catch(done)
      })
    })

    describe('when the specified "voter_type" is not supported', () => {
      it('responds with a validation error', done => {
        const params = validParams()

        params.fields.voter_type = 'foobar'

        messageDownVote(
          senecaUnderTest(seneca, done),
          params
        )
          .then(result => {
            expect(result).toEqual({
              status: 'failed',
              error: {
                message: '"fields.voter_type" must be [sys/user]'
              }
            })

            return done()
          })
          .catch(done)
      })
    })

    describe('when the poll does not exist', () => {
      it('responds with an error', done => {
        const seneca_under_test = senecaUnderTest(seneca, done)

        const params = validParams()
        const fake_poll_id = 'foo'
        params.fields.poll_id = fake_poll_id

        countPolls(seneca_under_test)
          .then(num_polls_initially => {
            Assert.strictEqual(0, num_polls_initially)
          })
          .then(() => messageDownVote(
            seneca_under_test,
            params
          ))
          .then(async (result) => {
            expect(result).toEqual({
              status: 'failed',
              error: {
                message: `Poll with id ${fake_poll_id} does not exist.` 
              }
            })

            expect(await countVotes(seneca_under_test)).toEqual(0)


            return done()
          })
          .catch(done)
      })
    })

    describe('when the poll exists', () => {
      let poll_id

      beforeEach(async () => {
        // TODO: Use a factory.
        //
        const poll = await seneca.entity('sys/poll')
          .make$({
            title: 'Lorem Ipsum',
            updated_at: null,
            created_at: new Date()
          })
          .save$()

        poll_id = fetchProp(poll, 'id')
      })

      beforeEach(async () => {
        const num_polls_initially = await countPolls(seneca)
        Assert.strictEqual(1, num_polls_initially)
      })

      describe('when the voter has already downvoted on this poll', () => {
        let vote_id

        const voter_id = 'v123abc'
        const voter_type = 'sys/user'

        beforeEach(async () => {
          // TODO: Use a factory.
          //
          const vote = await seneca.entity('sys/vote')
            .make$({
              poll_id,
              voter_id,
              voter_type,
              type: 'down',
              created_at: new Date(),
              updated_at: null
            })
            .save$()

          vote_id = fetchProp(vote, 'id')
        })

        it('does not cast a new downvote', done => {
          const seneca_under_test = senecaUnderTest(seneca, done)

          const params = validParams()
          params.fields.poll_id = poll_id
          params.fields.voter_id = voter_id
          params.fields.voter_type = voter_type

          countVotes(seneca_under_test)
            .then(num_votes_initially => {
              Assert.strictEqual(1, num_votes_initially)
            })
            .then(() => messageDownVote(
              seneca_under_test,
              params
            ))
            .then(async (result) => {
              expect(result).toEqual({
                status: 'success', data: { poll_stats: { num_upvotes: 0, num_downvotes: 1 } }
              })

              expect(await countVotes(seneca_under_test)).toEqual(1)

              return done()
            })
            .catch(done)
        })
      })

      describe('when the voter has already upvoted on this poll', () => {
        let vote_id

        const voter_id = 'v123abc'
        const voter_type = 'sys/user'

        beforeEach(async () => {
          // TODO: Use a factory.
          //
          const vote = await seneca.entity('sys/vote')
            .make$({
              poll_id,
              voter_id,
              voter_type,
              type: 'up',
              created_at: new Date(),
              updated_at: null
            })
            .save$()

          vote_id = fetchProp(vote, 'id')
        })

        it('does not cast a new upvote, but updates the existing downvote to upvote', done => {
          const seneca_under_test = senecaUnderTest(seneca, done)

          const params = validParams()
          params.fields.poll_id = poll_id
          params.fields.voter_id = voter_id
          params.fields.voter_type = voter_type

          countVotes(seneca_under_test)
            .then(num_votes_initially => {
              Assert.strictEqual(1, num_votes_initially)
            })
            .then(() => messageDownVote(
              seneca_under_test,
              params
            ))
            .then(async (result) => {
              expect(result).toEqual({
                status: 'success', data: { poll_stats: { num_upvotes: 0, num_downvotes: 1 } }
              })

              expect(await countVotes(seneca)).toEqual(1)

              const vote = await seneca.entity('sys/vote').load$({ id: vote_id })
              Assert.object(vote, 'vote')

              const vote_type = fetchProp(vote, 'type')
              expect(vote_type).toEqual('down')

              return done()
            })
            .catch(done)
        })
      })

      describe('when the voter is downvoting on this poll for the first time', () => {
        it('casts a new downvote', done => {
          const seneca_under_test = senecaUnderTest(seneca, done)

          const params = validParams()
          params.fields.poll_id = poll_id

          const voter_id = 'hsfa7tbga3'
          params.fields.voter_id = voter_id

          countVotes(seneca_under_test)
            .then(num_votes_initially => {
              Assert.strictEqual(0, num_votes_initially)
            })
            .then(() => messageDownVote(
              seneca_under_test,
              params
            ))
            .then(async (result) => {
              expect(result).toEqual({
                status: 'success', data: { poll_stats: { num_upvotes: 0, num_downvotes: 1 } }
              })

              expect(await countVotes(seneca)).toEqual(1)

              const vote = await seneca.entity('sys/vote').load$({ poll_id })
              Assert.object(vote, 'vote')

              expect(vote).toEqual(jasmine.objectContaining({
                id: jasmine.any(String),
                type: 'down',
                poll_id,
                voter_id,
                voter_type: 'sys/user',
                created_at: jasmine.any(Date),
                updated_at: null
              }))

              return done()
            })
            .catch(done)
        })
      })
    })
  })
})

