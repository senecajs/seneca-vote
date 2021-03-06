const Assert = require('assert-plus')
const Seneca = require('seneca')
const Entities = require('seneca-entity')
const SenecaPromisify = require('seneca-promisify')
const { yesterday } = require('../support/helpers')
const Fixtures = require('../support/fixtures')
const VotePlugin = require('../../')
const PollRating = require('../../lib/poll_rating')

describe('the CastVote action', () => {
  const seneca = makeSeneca()

  beforeEach(() => clearStore(seneca))
  afterEach(() => clearStore(seneca))


  const seneca_with_negative_vote_totals = makeSeneca({
    vote_plugin_opts: {
      allow_negative_num_total_votes: true
    }
  })

  beforeEach(() => clearStore(seneca_with_negative_vote_totals))
  afterEach(() => clearStore(seneca_with_negative_vote_totals))


  function makeSeneca(opts = {}) {
    const { vote_plugin_opts = {} } = opts

    return Seneca({ log: 'test' })
      .use(Entities)
      .use(SenecaPromisify)
      .use(VotePlugin, vote_plugin_opts)
  }

  function senecaUnderTest(seneca, cb) {
    return seneca.test(cb)
  }

  function validParams(overrides = {}) {
    return {
      fields: {
        poll_id: 'foo',
        voter_id: 'bar',
        voter_type: 'sys/user',
        kind: 'red',
        code: 'mars'
      },
      ...overrides
    }
  }

  async function messageUndoVote(seneca, params) {
    return seneca.post({ sys: 'vote', vote: 'undo', ...params })
  }

  async function messageUpVote(seneca, params) {
    return seneca.post({ sys: 'vote', vote: 'up', ...params })
  }

  async function messageDownVote(seneca, params) {
    return seneca.post({ sys: 'vote', vote: 'down', ...params })
  }


  describe('upvoting', () => {
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
              ok: false,
              why: 'invalid-field',
              details: {
                path: ['fields'],
                why_exactly: 'required'
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
              ok: false,
              why: 'invalid-field',
              details: {
                path: ['fields', 'poll_id'],
                why_exactly: 'required'
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
              ok: false,
              why: 'invalid-field',
              details: {
                path: ['fields', 'voter_id'],
                why_exactly: 'required'
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
              ok: false,
              why: 'invalid-field',
              details: {
                path: ['fields', 'voter_type'],
                why_exactly: 'required'
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
              ok: false,
              why: 'invalid-field',
              details: {
                path: ['fields', 'voter_type'],
                why_exactly: 'only'
              }
            })

            return done()
          })
          .catch(done)
      })
    })

    describe('when the poll does not exist', () => {
      it('fails with an error', done => {
        const seneca_under_test = senecaUnderTest(seneca, done)


        let failed = false

        spyOn(seneca_under_test, 'fail')
          .withArgs('not_found', { what: 'poll' })
          .and.callFake((..._args) => {
            failed = true
          })


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
            if (!failed) {
              return done(new Error('Expected seneca to fail with an error.'))
            }

            expect(await countVotes(seneca_under_test)).toEqual(0)

            return done()
          })
          .catch(done)
      })
    })

    describe('when the poll exists', () => {
      let poll_id

      beforeEach(async () => {
        const poll = await seneca.entity('sys/poll')
          .make$(Fixtures.poll())
          .save$()

        poll_id = poll.id
      })

      beforeEach(async () => {
        const num_polls_initially = await countPolls(seneca)
        Assert.strictEqual(1, num_polls_initially)
      })

      describe('when the voter has already upvoted on this poll', () => {
        const now = new Date()

        beforeEach(() => {
          jasmine.clock().install()
          jasmine.clock().mockDate(now)
        })

        afterEach(() => {
          jasmine.clock().uninstall()
        })


        let vote_id

        const voter_id = 'v123abc'
        const voter_type = 'sys/user'

        beforeEach(async () => {
          await seneca.entity('sys/vote')
            .make$(Fixtures.vote({
              poll_id,
              voter_id,
              voter_type,
              type: 'up',
              created_at: yesterday(now)
            }))
            .save$()
        })

        it('creates a new downvote, the existing upvote is considered a "tombstone"', done => {
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
                ok: true,
                data: {
                  poll_stats: { num_upvotes: 1, num_downvotes: 0, num_total: 1 }
                }
              })

              expect(await countVotes(seneca)).toEqual(2)


              const vote = await seneca.entity('sys/vote')
                .load$({ type: 'up', created_at: now })

              expect(vote.data$(false)).toEqual(jasmine.objectContaining({
                poll_id,
                voter_id,
                voter_type,
                type: 'up'
              }))


              const older_vote = await seneca.entity('sys/vote')
                .load$({ type: 'up', created_at: yesterday(now) })

              expect(older_vote.data$(false)).toEqual(jasmine.objectContaining({
                poll_id,
                voter_id,
                voter_type,
                type: 'up'
              }))


              return done()
            })
            .catch(done)
        })
      })

      describe('when the voter has already downvoted on this poll', () => {
        const now = new Date()

        beforeEach(() => {
          jasmine.clock().install()
          jasmine.clock().mockDate(now)
        })

        afterEach(() => {
          jasmine.clock().uninstall()
        })


        let vote_id

        const voter_id = 'v123abc'
        const voter_type = 'sys/user'

        beforeEach(async () => {
          const vote = await seneca.entity('sys/vote')
            .make$(Fixtures.vote({
              poll_id,
              voter_id,
              voter_type,
              type: 'down',
              created_at: yesterday(now)
            }))
            .save$()

          vote_id = vote.id
        })

        it('creates a new upvote, the existing downvote is considered a "tombstone"', done => {
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
                ok: true,
                data: {
                  poll_stats: { num_upvotes: 1, num_downvotes: 0, num_total: 1 }
                }
              })

              expect(await countVotes(seneca)).toEqual(2)


              const vote = await seneca.entity('sys/vote')
                .load$({ type: 'up' })

              expect(vote.data$(false)).toEqual(jasmine.objectContaining({
                poll_id,
                voter_id,
                voter_type,
                type: 'up',
                created_at: now
              }))


              const older_vote = await seneca.entity('sys/vote')
                .load$({ type: 'down' })

              expect(older_vote.data$(false)).toEqual(jasmine.objectContaining({
                poll_id,
                voter_id,
                voter_type,
                type: 'down',
                created_at: yesterday(now)
              }))


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
                ok: true,
                data: {
                  poll_stats: { num_upvotes: 1, num_downvotes: 0, num_total: 1 }
                }
              })

              expect(await countVotes(seneca)).toEqual(1)

              const vote = await seneca.entity('sys/vote').load$({ poll_id })
              Assert.object(vote, 'vote')

              expect(vote.entity$).toEqual('-/sys/vote')

              expect(vote.data$(false)).toEqual({
                id: jasmine.any(String),
                type: 'up',
                poll_id,
                voter_id,
                voter_type: 'sys/user',
                kind: jasmine.any(String),
                code: jasmine.any(String),
                created_at: jasmine.any(Date),
                undone_at: null
              })

              return done()
            })
            .catch(done)
        })
      })

      // NOTE: This use case has been tested in more detail in the tests for
      // the delegatee utility.
      //
      describe('when requested to denormalize the rating', () => {
        const vote_kind = 'red'
        const vote_code = 'mars'
        const save_to_field = '_rating'

        const vote_plugin_opts = {
          dependents: {
            [vote_kind]: {
              [vote_code]: {
                totals: {
                  'sys/poll': { field: save_to_field }
                }
              }
            }
          }
        }

        const seneca = makeSeneca({ vote_plugin_opts })

        beforeEach(() => clearStore(seneca))
        afterEach(() => clearStore(seneca))


        beforeEach(() => {
          const denormalizeToEntities = PollRating.denormalizeToEntities

          spyOn(PollRating, 'denormalizeToEntities').and.callFake((...args) => {
            expect(args.length > 0).toEqual(true)


            const plugin_opts_arg = args[args.length - 1]

            expect(plugin_opts_arg)
              .toEqual(jasmine.objectContaining(vote_plugin_opts))


            return denormalizeToEntities(...args)
          })
        })


        let poll_id

        beforeEach(async () => {
          const poll = await seneca.entity('sys/poll')
            .make$(Fixtures.poll())
            .save$()

          poll_id = poll.id
        })


        let save_to_poll_id

        beforeEach(async () => {
          const poll = await seneca.entity('sys/poll')
            .make$(Fixtures.poll())
            .save$()

          save_to_poll_id = poll.id
        })


        describe('normally', () => {
          it('delegates the poll-rating-saving-logic to another utility', done => {
            const seneca_under_test = senecaUnderTest(seneca, done)


            const params = validParams({
              kind: vote_kind,
              code: vote_code,
              dependents: { 'sys/poll': save_to_poll_id }
            })

            params.fields.poll_id = poll_id


            messageUpVote(seneca_under_test, params)
              .then(async (result) => {
                expect(result.ok).toEqual(true)
                expect(PollRating.denormalizeToEntities).toHaveBeenCalled()

                const poll = await seneca.make('sys/poll').load$(save_to_poll_id)
                expect(save_to_field in poll).toEqual(true)

                return done()
              })
              .catch(done)
          })
        })

        describe('when no entity with a given id exists', () => {
          it('responds with an error', done => {
            const seneca_under_test = senecaUnderTest(seneca, done)

            const params = validParams({
              kind: vote_kind,
              code: vote_code,
              dependents: { 'sys/poll': 'idonotexist' }
            })

            params.fields.poll_id = poll_id

            messageUpVote(seneca_under_test, params)
              .then(async (result) => {
                expect(result).toEqual({
                  ok: false,
                  why: 'not-found',
                  details: { what: 'sys/poll' }
                })

                expect(PollRating.denormalizeToEntities).toHaveBeenCalled()

                return done()
              })
              .catch(done)
          })
        })

        describe('when the given entity id is null', () => {
          it('responds with an error', done => {
            const seneca_under_test = senecaUnderTest(seneca, done)

            const params = validParams({
              kind: vote_kind,
              code: vote_code,
              dependents: { 'sys/poll': null }
            })

            params.fields.poll_id = poll_id

            messageUpVote(seneca_under_test, params)
              .then(async (result) => {
                expect(result).toEqual({
                  ok: false,
                  why: 'invalid-field',
                  details: {
                    path: ['dependents', 'sys/poll'],
                    why_exactly: 'base'
                  }
                })

                expect(PollRating.denormalizeToEntities).not.toHaveBeenCalled()

                return done()
              })
              .catch(done)
          })
        })
      })

      describe('requested to denormalize the rating, but no option', () => {
        const vote_kind = 'red'
        const vote_code = 'mars'
        const save_to_field = '_rating'


        const seneca = makeSeneca({ vote_plugin_opts: {} })

        beforeEach(() => clearStore(seneca))
        afterEach(() => clearStore(seneca))


        beforeEach(() => {
          spyOn(PollRating, 'denormalizeToEntities').and.callThrough()
        })


        let poll_id

        beforeEach(async () => {
          const poll = await seneca.entity('sys/poll')
            .make$(Fixtures.poll())
            .save$()

          poll_id = poll.id
        })


        let save_to_poll_id

        beforeEach(async () => {
          const poll = await seneca.entity('sys/poll')
            .make$(Fixtures.poll())
            .save$()

          save_to_poll_id = poll.id
        })


        it('ignores the request to denormalize', done => {
          const seneca_under_test = senecaUnderTest(seneca, done)


          const params = validParams({
            kind: vote_kind,
            code: vote_code,
            dependents: { 'sys/poll': save_to_poll_id }
          })

          params.fields.poll_id = poll_id


          messageUpVote(seneca_under_test, params)
            .then(async (result) => {
              expect(result.ok).toEqual(true)
              expect(PollRating.denormalizeToEntities).toHaveBeenCalled()

              const poll = await seneca.make('sys/poll').load$(save_to_poll_id)
              expect(save_to_field in poll).toEqual(false)

              return done()
            })
            .catch(done)
        })
      })
    })
  })

  describe('downvoting', () => {
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
              ok: false,
              why: 'invalid-field',
              details: {
                path: ['fields'],
                why_exactly: 'required'
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
              ok: false,
              why: 'invalid-field',
              details: {
                path: ['fields', 'poll_id'],
                why_exactly: 'required'
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
              ok: false,
              why: 'invalid-field',
              details: {
                path: ['fields', 'voter_id'],
                why_exactly: 'required'
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
              ok: false,
              why: 'invalid-field',
              details: {
                path: ['fields', 'voter_type'],
                why_exactly: 'required'
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
              ok: false,
              why: 'invalid-field',
              details: {
                path: ['fields', 'voter_type'],
                why_exactly: 'only'
              }
            })

            return done()
          })
          .catch(done)
      })
    })

    describe('when the poll does not exist', () => {
      it('fails with an error', done => {
        const seneca_under_test = senecaUnderTest(seneca, done)


        let failed = false

        spyOn(seneca_under_test, 'fail')
          .withArgs('not_found', { what: 'poll' })
          .and.callFake((..._args) => {
            failed = true
          })


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
            if (!failed) {
              return done(new Error('Expected seneca to fail with an error.'))
            }

            expect(await countVotes(seneca_under_test)).toEqual(0)

            return done()
          })
          .catch(done)
      })
    })

    describe('when the poll exists', () => {
      let poll_id

      beforeEach(async () => {
        const poll = await seneca.entity('sys/poll')
          .make$(Fixtures.poll())
          .save$()

        poll_id = poll.id
      })

      beforeEach(async () => {
        const num_polls_initially = await countPolls(seneca)
        Assert.strictEqual(1, num_polls_initially)
      })

      describe('when the voter has already downvoted on this poll', () => {
        const now = new Date()

        beforeEach(() => {
          jasmine.clock().install()
          jasmine.clock().mockDate(now)
        })

        afterEach(() => {
          jasmine.clock().uninstall()
        })


        let vote_id

        const voter_id = 'v123abc'
        const voter_type = 'sys/user'

        beforeEach(async () => {
          const vote = await seneca.entity('sys/vote')
            .make$(Fixtures.vote({
              poll_id,
              voter_id,
              voter_type,
              type: 'down',
              created_at: yesterday(now)
            }))
            .save$()

          vote_id = vote.id
        })

        it('creates a new downvote, the existing downvote is considered a "tombstone"', done => {
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
                ok: true,
                data: {
                  poll_stats: { num_upvotes: 0, num_downvotes: 1, num_total: 0 }
                }
              })

              expect(await countVotes(seneca)).toEqual(2)


              const vote = await seneca.entity('sys/vote')
                .load$({ type: 'down', created_at: now })

              expect(vote.data$(false)).toEqual(jasmine.objectContaining({
                poll_id,
                voter_id,
                voter_type,
                type: 'down'
              }))


              const older_vote = await seneca.entity('sys/vote')
                .load$({ type: 'down', created_at: yesterday(now) })

              expect(older_vote.data$(false)).toEqual(jasmine.objectContaining({
                poll_id,
                voter_id,
                voter_type,
                type: 'down'
              }))


              return done()
            })
            .catch(done)
        })
      })

      describe('when the voter has already upvoted on this poll', () => {
        const now = new Date()

        beforeEach(() => {
          jasmine.clock().install()
          jasmine.clock().mockDate(now)
        })

        afterEach(() => {
          jasmine.clock().uninstall()
        })


        let vote_id

        const voter_id = 'v123abc'
        const voter_type = 'sys/user'

        beforeEach(async () => {
          await seneca.entity('sys/vote')
            .make$(Fixtures.vote({
              poll_id,
              voter_id,
              voter_type,
              type: 'up',
              created_at: yesterday(now)
            }))
            .save$()
        })

        it('creates a new downvote, the existing upvote is considered a "tombstone"', done => {
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
                ok: true,
                data: {
                  poll_stats: { num_upvotes: 0, num_downvotes: 1, num_total: 0 }
                }
              })

              expect(await countVotes(seneca)).toEqual(2)


              const vote = await seneca.entity('sys/vote')
                .load$({ type: 'down' })

              expect(vote.data$(false)).toEqual(jasmine.objectContaining({
                poll_id,
                voter_id,
                voter_type,
                type: 'down',
                created_at: now
              }))


              const older_vote = await seneca.entity('sys/vote')
                .load$({ type: 'up' })

              expect(older_vote.data$(false)).toEqual(jasmine.objectContaining({
                poll_id,
                voter_id,
                voter_type,
                type: 'up',
                created_at: yesterday(now)
              }))


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
                ok: true,
                data: {
                  poll_stats: { num_upvotes: 0, num_downvotes: 1, num_total: 0 }
                }
              })

              expect(await countVotes(seneca)).toEqual(1)

              const vote = await seneca.entity('sys/vote').load$({ poll_id })
              Assert.object(vote, 'vote')

              expect(vote.entity$).toEqual('-/sys/vote')

              expect(vote.data$(false)).toEqual({
                id: jasmine.any(String),
                type: 'down',
                poll_id,
                voter_id,
                voter_type: 'sys/user',
                kind: jasmine.any(String),
                code: jasmine.any(String),
                created_at: jasmine.any(Date),
                undone_at: null
              })

              return done()
            })
            .catch(done)
        })
      })
    })
  })

  describe('trying to undo a vote when not previously voted', () => {
    it('succeeds but does nothing', done => {
      const seneca_under_test = senecaUnderTest(seneca, done)
      const params = validParams()

      countVotes(seneca_under_test)
        .then(num_votes_initially => {
          Assert.strictEqual(0, num_votes_initially)
        })
        .then(() => messageUndoVote(
          seneca_under_test,
          params
        ))
        .then(async (result) => {
          expect(result).toEqual({
            ok: true,
            data: {
              poll_stats: { num_upvotes: 0, num_downvotes: 0, num_total: 0 }
            }
          })

          expect(await countVotes(seneca)).toEqual(0)

          return done()
        })
        .catch(done)
    })
  })

  describe('undoing a vote for a poll but only voted on another poll', () => {
    const now = new Date()

    beforeEach(() => {
      jasmine.clock().install()
      jasmine.clock().mockDate(now)
    })

    afterEach(() => {
      jasmine.clock().uninstall()
    })


    let poll_id

    beforeEach(async () => {
      const poll = await seneca.entity('sys/poll')
        .make$(Fixtures.poll())
        .save$()

      poll_id = poll.id
    })


    let another_poll_id

    beforeEach(async () => {
      const another_poll = await seneca.entity('sys/poll')
        .make$(Fixtures.poll())
        .save$()

      another_poll_id = another_poll.id
    })


    const voter_id = 'v123abc'
    const voter_type = 'sys/user'
    const vote_kind = 'red'
    const vote_code = 'mars'

    beforeEach(userUpvotesAnotherPollOnce)


    it("succeeds but does not undo the voter's other vote", done => {
      const seneca_under_test = senecaUnderTest(seneca, done)

      const params = validParams()
      params.fields.poll_id = poll_id
      params.fields.voter_id = voter_id
      params.fields.voter_type = voter_type
      params.fields.kind = vote_kind
      params.fields.code = vote_code

      countVotes(seneca_under_test)
        .then(num_votes_initially => {
          Assert.strictEqual(1, num_votes_initially)
        })
        .then(() => messageUndoVote(
          seneca_under_test,
          params
        ))
        .then(async (result) => {
          expect(result).toEqual({
            ok: true,
            data: {
              poll_stats: { num_upvotes: 0, num_downvotes: 0, num_total: 0 }
            }
          })

          expect(await countVotes(seneca)).toEqual(1)


          const [vote] = await seneca.entity('sys/vote')
            .list$({})

          expect(vote.data$(false)).toEqual(jasmine.objectContaining({
            poll_id: another_poll_id,
            voter_id,
            voter_type,
            type: 'up',
            undone_at: null
          }))

          return done()
        })
        .catch(done)
    })

    async function userUpvotesAnotherPollOnce() {
      await seneca.entity('sys/vote')
        .make$(Fixtures.vote({
          poll_id: another_poll_id,
          voter_id,
          voter_type,
          kind: vote_kind,
          code: vote_code,
          type: 'up',
          created_at: yesterday(now)
        }))
        .save$()
    }
  })

  describe('the voter not previously voted, someone else did', () => {
    const now = new Date()

    beforeEach(() => {
      jasmine.clock().install()
      jasmine.clock().mockDate(now)
    })

    afterEach(() => {
      jasmine.clock().uninstall()
    })


    let poll_id

    beforeEach(async () => {
      const poll = await seneca.entity('sys/poll')
        .make$(Fixtures.poll())
        .save$()

      poll_id = poll.id
    })


    const another_voter_id = 'franksinatra123'
    const voter_id = 'v123abc'
    const voter_type = 'sys/user'
    const vote_kind = 'red'
    const vote_code = 'mars'

    beforeEach(anotherUserUpvotesOnce)

    it('does nothing', done => {
      const seneca_under_test = senecaUnderTest(seneca, done)

      const params = validParams()
      params.fields.poll_id = poll_id
      params.fields.voter_id = voter_id
      params.fields.voter_type = voter_type
      params.fields.kind = vote_kind
      params.fields.code = vote_code

      countVotes(seneca_under_test)
        .then(num_votes_initially => {
          Assert.strictEqual(1, num_votes_initially)
        })
        .then(() => messageUndoVote(
          seneca_under_test,
          params
        ))
        .then(async (result) => {
          expect(result).toEqual({
            ok: true,
            data: {
              poll_stats: { num_upvotes: 1, num_downvotes: 0, num_total: 1 }
            }
          })

          expect(await countVotes(seneca)).toEqual(1)


          const [vote] = await seneca.entity('sys/vote')
            .list$({})

          expect(vote.data$(false)).toEqual(jasmine.objectContaining({
            poll_id,
            voter_id: another_voter_id,
            voter_type,
            type: 'up',
            undone_at: null
          }))


          return done()
        })
        .catch(done)
    })

    async function anotherUserUpvotesOnce() {
      await seneca.entity('sys/vote')
        .make$(Fixtures.vote({
          poll_id,
          voter_id: another_voter_id,
          voter_type,
          kind: vote_kind,
          code: vote_code,
          type: 'up',
          created_at: yesterday(now)
        }))
        .save$()
    }
  })

  describe('undoing an upvote', () => {
    const now = new Date()

    beforeEach(() => {
      jasmine.clock().install()
      jasmine.clock().mockDate(now)
    })

    afterEach(() => {
      jasmine.clock().uninstall()
    })


    let poll_id

    beforeEach(async () => {
      const poll = await seneca.entity('sys/poll')
        .make$(Fixtures.poll())
        .save$()

      poll_id = poll.id
    })


    const voter_id = 'v123abc'
    const voter_type = 'sys/user'
    const vote_kind = 'red'
    const vote_code = 'mars'

    beforeEach(userUpvotesOnce)

    beforeEach(userUpvotesAgain)

    it("undoes the user's current upvote", done => {
      const seneca_under_test = senecaUnderTest(seneca, done)

      const params = validParams()
      params.fields.poll_id = poll_id
      params.fields.voter_id = voter_id
      params.fields.voter_type = voter_type
      params.fields.kind = vote_kind
      params.fields.code = vote_code

      countVotes(seneca_under_test)
        .then(num_votes_initially => {
          Assert.strictEqual(2, num_votes_initially)
        })
        .then(() => messageUndoVote(
          seneca_under_test,
          params
        ))
        .then(async (result) => {
          expect(result).toEqual({
            ok: true,
            data: {
              poll_stats: { num_upvotes: 0, num_downvotes: 0, num_total: 0 }
            }
          })

          expect(await countVotes(seneca)).toEqual(2)


          const [vote, older_vote] = await seneca.entity('sys/vote')
            .list$({ sort$: { created_at: -1 } })

          expect(vote.data$(false)).toEqual(jasmine.objectContaining({
            poll_id,
            voter_id,
            voter_type,
            type: 'up',
            undone_at: now
          }))

          expect(older_vote.data$(false)).toEqual(jasmine.objectContaining({
            poll_id,
            voter_id,
            voter_type,
            type: 'up',
            undone_at: null
          }))


          return done()
        })
        .catch(done)
    })

    async function userUpvotesOnce() {
      await seneca.entity('sys/vote')
        .make$(Fixtures.vote({
          poll_id,
          voter_id,
          voter_type,
          kind: vote_kind,
          code: vote_code,
          type: 'up',
          created_at: yesterday(now)
        }))
        .save$()
    }

    async function userUpvotesAgain() {
      await seneca.entity('sys/vote')
        .make$(Fixtures.vote({
          poll_id,
          voter_id,
          voter_type,
          kind: vote_kind,
          code: vote_code,
          type: 'up',
          created_at: now
        }))
        .save$()
    }
  })

  describe('undoing a downvote', () => {
    const now = new Date()

    beforeEach(() => {
      jasmine.clock().install()
      jasmine.clock().mockDate(now)
    })

    afterEach(() => {
      jasmine.clock().uninstall()
    })


    let poll_id

    beforeEach(async () => {
      const poll = await seneca.entity('sys/poll')
        .make$(Fixtures.poll())
        .save$()

      poll_id = poll.id
    })


    const voter_id = 'v123abc'
    const voter_type = 'sys/user'
    const vote_kind = 'red'
    const vote_code = 'mars'

    beforeEach(userDownvotesOnce)

    beforeEach(userDownvotesAgain)

    it("undoes the user's current downvote", done => {
      const seneca_under_test = senecaUnderTest(seneca, done)

      const params = validParams()
      params.fields.poll_id = poll_id
      params.fields.voter_id = voter_id
      params.fields.voter_type = voter_type
      params.fields.kind = vote_kind
      params.fields.code = vote_code

      countVotes(seneca_under_test)
        .then(num_votes_initially => {
          Assert.strictEqual(2, num_votes_initially)
        })
        .then(() => messageUndoVote(
          seneca_under_test,
          params
        ))
        .then(async (result) => {
          expect(result).toEqual({
            ok: true,
            data: {
              poll_stats: { num_upvotes: 0, num_downvotes: 0, num_total: 0 }
            }
          })

          expect(await countVotes(seneca)).toEqual(2)


          const [vote, older_vote] = await seneca.entity('sys/vote')
            .list$({ sort$: { created_at: -1 } })

          expect(vote.data$(false)).toEqual(jasmine.objectContaining({
            poll_id,
            voter_id,
            voter_type,
            type: 'down',
            undone_at: now
          }))

          expect(older_vote.data$(false)).toEqual(jasmine.objectContaining({
            poll_id,
            voter_id,
            voter_type,
            type: 'down',
            undone_at: null
          }))


          return done()
        })
        .catch(done)
    })

    async function userDownvotesOnce() {
      await seneca.entity('sys/vote')
        .make$(Fixtures.vote({
          poll_id,
          voter_id,
          voter_type,
          kind: vote_kind,
          code: vote_code,
          type: 'down',
          created_at: yesterday(now)
        }))
        .save$()
    }

    async function userDownvotesAgain() {
      await seneca.entity('sys/vote')
        .make$(Fixtures.vote({
          poll_id,
          voter_id,
          voter_type,
          kind: vote_kind,
          code: vote_code,
          type: 'down',
          created_at: now
        }))
        .save$()
    }
  })

  describe('trying to undo an undone downvote', () => {
    /* NOTE: The logic for this scenario may be understood as follows. The
     * driving idea behind the logic, from the business perspective, is that
     * only the most recent vote on a given poll by a given voter counts.
     *
     * Assume Jimi upvotes once, then downvotes. Since Jimi's downvote is
     * most recent, we consider Jimi to have downvoted on a poll. Any of Jimi's
     * votes that came before it are completely void.
     *
     * Now assume that shortly thereafter Jimi undoes his most recent vote.
     * This action effectively undoes Jimi's downvote. Now assume that Jimi
     * tries to undo his most recent vote again. However, his most recent
     * vote is already void (i.e. "undone"), hence it just do nothing. And
     * nope we do not undo Jimi's upvote that was preceding the downvote.
     *
     */
    const now = new Date()

    beforeEach(() => {
      jasmine.clock().install()
      jasmine.clock().mockDate(now)
    })

    afterEach(() => {
      jasmine.clock().uninstall()
    })


    let poll_id

    beforeEach(async () => {
      const poll = await seneca.entity('sys/poll')
        .make$(Fixtures.poll())
        .save$()

      poll_id = poll.id
    })


    const voter_id = 'v123abc'
    const voter_type = 'sys/user'
    const vote_kind = 'red'
    const vote_code = 'mars'


    let upvote_id

    beforeEach(userUpvotes)


    let downvote_id

    beforeEach(userDownvotes)


    beforeEach(userCancelsHisVote)

    it('does not "undo" previous votes of the voter', done => {
      const seneca_under_test = senecaUnderTest(seneca, done)

      const params = validParams()
      params.fields.poll_id = poll_id
      params.fields.voter_id = voter_id
      params.fields.voter_type = voter_type
      params.fields.kind = vote_kind
      params.fields.code = vote_code

      countVotes(seneca_under_test)
        .then(num_votes_initially => {
          Assert.strictEqual(2, num_votes_initially)
        })
        .then(() => messageUndoVote(
          seneca_under_test,
          params
        ))
        .then(async (result) => {
          expect(result).toEqual({
            ok: true,
            data: {
              poll_stats: { num_upvotes: 0, num_downvotes: 0, num_total: 0 }
            }
          })

          expect(await countVotes(seneca)).toEqual(2)


          Assert(upvote_id, 'upvote_id')

          const upvote = await seneca.make('sys/vote').load$(upvote_id)

          Assert(upvote, 'upvote')
          expect(upvote.undone_at).toEqual(null)


          Assert(downvote_id, 'downvote_id')

          const downvote = await seneca.make('sys/vote').load$(downvote_id)

          Assert(downvote, 'downvote')
          expect(downvote.undone_at).toEqual(jasmine.any(Date))


          return done()
        })
        .catch(done)
    })

    async function userUpvotes() {
      const upvote = await seneca.entity('sys/vote')
        .make$(Fixtures.vote({
          poll_id,
          voter_id,
          voter_type,
          kind: vote_kind,
          code: vote_code,
          type: 'down',
          created_at: yesterday(now)
        }))
        .save$()

      upvote_id = upvote.id
    }

    async function userDownvotes() {
      const downvote = await seneca.entity('sys/vote')
        .make$(Fixtures.vote({
          poll_id,
          voter_id,
          voter_type,
          kind: vote_kind,
          code: vote_code,
          type: 'up',
          created_at: now
        }))
        .save$()

      downvote_id = downvote.id
    }

    async function userCancelsHisVote() {
      Assert(downvote_id, 'downvote_id')

      const downvote = await seneca.entity('sys/vote')
        .load$(downvote_id)

      Assert(downvote, 'downvote')

      await downvote
        .data$({ undone_at: new Date() })
        .save$()
    }
  })

  async function clearStore(seneca) {
    await seneca.make('sys/vote').remove$({ all$: true })
    await seneca.make('sys/poll').remove$({ all$: true })
  }

  async function countEntities(entity) {
    return entity.list$({ all$: true }).then(xs => xs.length)
  }

  async function countVotes(seneca) {
    return countEntities(seneca.entity('sys/vote'))
  }

  async function countPolls(seneca) {
    return countEntities(seneca.entity('sys/poll'))
  }
})

