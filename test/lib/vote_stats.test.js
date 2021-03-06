const Assert = require('assert-plus')
const Seneca = require('seneca')
const Entities = require('seneca-entity')
const SenecaPromisify = require('seneca-promisify')
const Faker = require('faker')
const Fixtures = require('../support/fixtures')
const { yesterday, now } = require('../support/helpers')
const VoteStats = require('../../lib/vote_stats')

describe('VoteStats', () => {
  let seneca

  beforeEach(() => {
    seneca = Seneca({ log: 'test' })
      .use(Entities)
      .use(SenecaPromisify)
  })

  function senecaUnderTest(seneca, cb) {
    return seneca.test(cb)
  }


  let poll_id

  beforeEach(async () => {
    const poll = await seneca.make('sys/poll')
      .data$(Fixtures.poll())
      .save$()

    poll_id = poll.id
  })

  describe('forPoll', () => {
    describe('requested vote "code" mismatches with the one in the existing vote', () => {
      const vote_kind = 'blue'

      function validParams(overrides = {}) {
        return {
          vote_kind,
          vote_code: Faker.random.alphaNumeric(8),
          poll_id: Faker.random.alphaNumeric(8),
          ...overrides
        }
      }

      function voteFixture(overrides = {}) {
        return Fixtures.vote({ kind: vote_kind, ...overrides })
      }

      describe('an upvote exists for the poll', () => {
        beforeEach(async () => {
          await seneca.make('sys/vote')
            .data$(voteFixture({ type: 'up', poll_id, code: 'green' }))
            .save$()
        })

        it('returns correct vote counts', done => {
          const si = senecaUnderTest(seneca, done)

          VoteStats
            .forPoll(validParams({ poll_id, vote_code: 'yellow' }), { seneca: si })
            .then(result => {
              expect(result).toEqual(jasmine.objectContaining({
                num_upvotes: 0,
                num_downvotes: 0
              }))
              return done()
            })
            .catch(done)
        })
      })
    })

    describe('requested vote "kind" mismatches with the one in the existing vote', () => {
      const vote_code = 'jupiter'

      function validParams(overrides = {}) {
        return {
          vote_code,
          vote_kind: Faker.random.alphaNumeric(8),
          poll_id: Faker.random.alphaNumeric(8),
          ...overrides
        }
      }

      function voteFixture(overrides = {}) {
        return Fixtures.vote({ kind: vote_code, ...overrides })
      }

      describe('an upvote exists for the poll', () => {
        beforeEach(async () => {
          await seneca.make('sys/vote')
            .data$(voteFixture({ type: 'up', poll_id, kind: 'pluto' }))
            .save$()
        })

        it('returns correct vote counts', done => {
          const si = senecaUnderTest(seneca, done)

          VoteStats
            .forPoll(validParams({ poll_id, vote_kind: 'saturn' }), { seneca: si })
            .then(result => {
              expect(result).toEqual(jasmine.objectContaining({
                num_upvotes: 0,
                num_downvotes: 0
              }))
              return done()
            })
            .catch(done)
        })
      })
    })

    describe('all votes have the same "code" and "kind"', () => {
      const vote_kind = 'red'
      const vote_code = 'mars'

      function validParams(overrides = {}) {
        return {
          vote_kind,
          vote_code,
          poll_id: Faker.random.alphaNumeric(8),
          ...overrides
        }
      }

      function voteFixture(overrides = {}) {
        return Fixtures.vote({ kind: vote_kind, code: vote_code, ...overrides })
      }

      describe('an upvote exists for the poll', () => {
        beforeEach(async () => {
          await seneca.make('sys/vote')
            .data$(voteFixture({ type: 'up', poll_id }))
            .save$()
        })

        it('returns correct vote counts', done => {
          const si = senecaUnderTest(seneca, done)

          VoteStats
            .forPoll(validParams({ poll_id }), { seneca: si })
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
            .data$(voteFixture({ type: 'down', poll_id }))
            .save$()
        })

        it('returns correct vote counts', done => {
          const si = senecaUnderTest(seneca, done)

          VoteStats
            .forPoll(validParams({ poll_id }), { seneca: si })
            .then(result => {
              expect(result).toEqual(jasmine.objectContaining({
                num_upvotes: 0,
                num_downvotes: 1
              }))
              return done()
            })
            .catch(done)
        })
      })

      describe('a downvote exists for another poll', () => {
        beforeEach(async () => {
          await seneca.make('sys/vote')
            .data$(voteFixture({ type: 'down' }))
            .save$()
        })

        it('returns correct vote counts for the requested poll', done => {
          const si = senecaUnderTest(seneca, done)

          VoteStats
            .forPoll(validParams({ poll_id }), { seneca: si })
            .then(result => {
              expect(result).toEqual(jasmine.objectContaining({
                num_upvotes: 0,
                num_downvotes: 0
              }))
              return done()
            })
            .catch(done)
        })
      })

      describe('a voter upvoted on the requested poll, and downvoted on another', () => {
        beforeEach(async () => {
          await seneca.make('sys/vote')
            .data$(voteFixture({ type: 'up', poll_id }))
            .save$()
        })

        beforeEach(async () => {
          await seneca.make('sys/vote')
            .data$(voteFixture({ type: 'down' }))
            .save$()
        })

        it('returns correct vote counts', done => {
          const si = senecaUnderTest(seneca, done)

          VoteStats
            .forPoll(validParams({ poll_id }), { seneca: si })
            .then(result => {
              expect(result).toEqual(jasmine.objectContaining({
                num_upvotes: 1,
                num_downvotes: 0
              }))
              return done()
            })
            .catch(done)
        })
      })

      describe('a voter first upvoted, then changed his mind and downvoted', () => {
        const voter_id = 'some_voter_id'

        beforeEach(async () => {
          await seneca.make('sys/vote')
            .data$(voteFixture({
              type: 'up',
              poll_id,
              voter_id,
              created_at: yesterday()
            }))
            .save$()
        })

        beforeEach(async () => {
          await seneca.make('sys/vote')
            .data$(voteFixture({
              type: 'down',
              poll_id,
              voter_id,
              created_at: now()
            }))
            .save$()
        })


        describe('no other voter exists', () => {
          it('returns correct vote counts', done => {
            const si = senecaUnderTest(seneca, done)

            VoteStats
              .forPoll(validParams({ poll_id }), { seneca: si })
              .then(result => {
                expect(result).toEqual(jasmine.objectContaining({
                  num_upvotes: 0,
                  num_downvotes: 1
                }))
                return done()
              })
              .catch(done)
          })
        })

        describe('another voter upvoted once', () => {
          const another_voter_id = 'some_id_of_another_voter'

          beforeEach(async () => {
            await seneca.make('sys/vote')
              .data$(voteFixture({ type: 'up', poll_id, voter_id: another_voter_id }))
              .save$()
          })


          it('returns correct vote counts', done => {
            const si = senecaUnderTest(seneca, done)

            VoteStats
              .forPoll(validParams({ poll_id }), { seneca: si })
              .then(result => {
                expect(result).toEqual(jasmine.objectContaining({
                  num_upvotes: 1,
                  num_downvotes: 1
                }))
                return done()
              }).catch(done)
          })
        })

        describe('another voter downvoted once', () => {
          const another_voter_id = 'some_id_of_another_voter'

          beforeEach(async () => {
            await seneca.make('sys/vote')
              .data$(voteFixture({ type: 'down', poll_id, voter_id: another_voter_id }))
              .save$()
          })


          it('returns correct vote counts', done => {
            const si = senecaUnderTest(seneca, done)

            VoteStats
              .forPoll(validParams({ poll_id }), { seneca: si })
              .then(result => {
                expect(result).toEqual(jasmine.objectContaining({
                  num_upvotes: 0,
                  num_downvotes: 2
                }))
                return done()
              })
              .catch(done)
          })
        })

        describe('another voter also - first upvoted, then changed his mind and downvoted', () => {
          const another_voter_id = 'some_id_of_another_voter'

          beforeEach(async () => {
            await seneca.make('sys/vote')
              .data$(voteFixture({
                type: 'up',
                poll_id,
                voter_id: another_voter_id,
                created_at: yesterday()
              }))
              .save$()
          })

          beforeEach(async () => {
            await seneca.make('sys/vote')
              .data$(voteFixture({
                type: 'down',
                poll_id,
                voter_id: another_voter_id,
                created_at: now()
              }))
              .save$()
          })

          it('returns correct vote counts', done => {
            const si = senecaUnderTest(seneca, done)

            VoteStats
              .forPoll(validParams({ poll_id }), { seneca: si })
              .then(result => {
                expect(result).toEqual(jasmine.objectContaining({
                  num_upvotes: 0,
                  num_downvotes: 2
                }))
                return done()
              })
              .catch(done)
          })
        })

        describe('another voter first downvoted, then changed his mind and upvoted', () => {
          const another_voter_id = 'some_id_of_another_voter'

          beforeEach(async () => {
            await seneca.make('sys/vote')
              .data$(voteFixture({
                type: 'down',
                poll_id,
                voter_id: another_voter_id,
                created_at: yesterday()
              }))
              .save$()
          })

          beforeEach(async () => {
            await seneca.make('sys/vote')
              .data$(voteFixture({
                type: 'up',
                poll_id,
                voter_id: another_voter_id,
                created_at: now()
              }))
              .save$()
          })

          it('returns correct vote counts', done => {
            const si = senecaUnderTest(seneca, done)

            VoteStats
              .forPoll(validParams({ poll_id }), { seneca: si })
              .then(result => {
                expect(result).toEqual(jasmine.objectContaining({
                  num_upvotes: 1,
                  num_downvotes: 1
                }))
                return done()
              })
              .catch(done)
          })
        })
      })

      describe('a voter first downvoted, then changed his mind and upvoted', () => {
        const voter_id = 'some_voter_id'

        beforeEach(async () => {
          await seneca.make('sys/vote')
            .data$(voteFixture({
              type: 'down',
              poll_id,
              voter_id,
              created_at: yesterday()
            }))
            .save$()
        })

        beforeEach(async () => {
          await seneca.make('sys/vote')
            .data$(voteFixture({
              type: 'up',
              poll_id,
              voter_id,
              created_at: now()
            }))
            .save$()
        })


        describe('no other voter exists', () => {
          it('returns correct vote counts', done => {
            const si = senecaUnderTest(seneca, done)

            VoteStats
              .forPoll(validParams({ poll_id }), { seneca: si })
              .then(result => {
                expect(result).toEqual(jasmine.objectContaining({
                  num_upvotes: 1,
                  num_downvotes: 0
                }))
                return done()
              })
              .catch(done)
          })
        })

        describe('another voter upvoted once', () => {
          const another_voter_id = 'some_id_of_another_voter'

          beforeEach(async () => {
            await seneca.make('sys/vote')
              .data$(voteFixture({ type: 'up', poll_id, voter_id: another_voter_id }))
              .save$()
          })


          it('returns correct vote counts', done => {
            const si = senecaUnderTest(seneca, done)

            VoteStats
              .forPoll(validParams({ poll_id }), { seneca: si })
              .then(result => {
                expect(result).toEqual(jasmine.objectContaining({
                  num_upvotes: 2,
                  num_downvotes: 0
                }))
                return done()
              }).catch(done)
          })
        })

        describe('another voter downvoted once', () => {
          const another_voter_id = 'some_id_of_another_voter'

          beforeEach(async () => {
            await seneca.make('sys/vote')
              .data$(voteFixture({ type: 'down', poll_id, voter_id: another_voter_id }))
              .save$()
          })


          it('returns correct vote counts', done => {
            const si = senecaUnderTest(seneca, done)

            VoteStats
              .forPoll(validParams({ poll_id }), { seneca: si })
              .then(result => {
                expect(result).toEqual(jasmine.objectContaining({
                  num_upvotes: 1,
                  num_downvotes: 1
                }))
                return done()
              })
              .catch(done)
          })
        })

        describe('another voter first upvoted, then changed his mind and downvoted', () => {
          const another_voter_id = 'some_id_of_another_voter'

          beforeEach(async () => {
            await seneca.make('sys/vote')
              .data$(voteFixture({
                type: 'up',
                poll_id,
                voter_id: another_voter_id,
                created_at: yesterday()
              }))
              .save$()
          })

          beforeEach(async () => {
            await seneca.make('sys/vote')
              .data$(voteFixture({
                type: 'down',
                poll_id,
                voter_id: another_voter_id,
                created_at: now()
              }))
              .save$()
          })

          it('returns correct vote counts', done => {
            const si = senecaUnderTest(seneca, done)

            VoteStats
              .forPoll(validParams({ poll_id }), { seneca: si })
              .then(result => {
                expect(result).toEqual(jasmine.objectContaining({
                  num_upvotes: 1,
                  num_downvotes: 1
                }))
                return done()
              })
              .catch(done)
          })
        })

        describe('another voter also - first downvoted, then changed his mind and upvoted', () => {
          const another_voter_id = 'some_id_of_another_voter'

          beforeEach(async () => {
            await seneca.make('sys/vote')
              .data$(voteFixture({
                type: 'down',
                poll_id,
                voter_id: another_voter_id,
                created_at: yesterday()
              }))
              .save$()
          })

          beforeEach(async () => {
            await seneca.make('sys/vote')
              .data$(voteFixture({
                type: 'up',
                poll_id,
                voter_id: another_voter_id,
                created_at: now()
              }))
              .save$()
          })

          it('returns correct vote counts', done => {
            const si = senecaUnderTest(seneca, done)

            VoteStats
              .forPoll(validParams({ poll_id }), { seneca: si })
              .then(result => {
                expect(result).toEqual(jasmine.objectContaining({
                  num_upvotes: 2,
                  num_downvotes: 0
                }))
                return done()
              })
              .catch(done)
          })
        })
      })

      describe('no votes exist', () => {
        it('returns correct vote counts', done => {
          const si = senecaUnderTest(seneca, done)

          VoteStats
            .forPoll(validParams({ poll_id }), { seneca: si })
            .then(result => {
              expect(result).toEqual(jasmine.objectContaining({
                num_upvotes: 0,
                num_downvotes: 0
              }))
              return done()
            })
            .catch(done)
        })
      })

      describe('negative values for vote total enabled', () => {
        beforeEach(async () => {
          await seneca.make('sys/vote')
            .data$(voteFixture({
              type: 'down',
              poll_id,
              created_at: yesterday()
            }))
            .save$()
        })

        it('returns a correct total for a downvote', done => {
          const si = senecaUnderTest(seneca, done)
          const ctx = { seneca: si }
          const options = { allow_negative_num_total_votes: true }

          VoteStats
            .forPoll(validParams({ poll_id }), ctx, options)
            .then(result => {
              expect(result).toEqual(jasmine.objectContaining({
                num_downvotes: 1,
                num_total: -1
              }))

              return done()
            })
            .catch(done)
        })
      })

      describe('negative values for vote total disabled (default)', () => {
        beforeEach(async () => {
          await seneca.make('sys/vote')
            .data$(voteFixture({
              type: 'down',
              poll_id,
              created_at: yesterday()
            }))
            .save$()
        })

        it('returns a correct total for a downvote', done => {
          const si = senecaUnderTest(seneca, done)

          VoteStats
            .forPoll(validParams({ poll_id }), { seneca: si })
            .then(result => {
              expect(result).toEqual(jasmine.objectContaining({
                num_downvotes: 1,
                num_total: 0
              }))

              return done()
            })
            .catch(done)
        })
      })
    })
  })
})

