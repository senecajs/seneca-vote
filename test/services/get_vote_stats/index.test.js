const Assert = require('assert-plus')
const Seneca = require('seneca')
const Entities = require('seneca-entity')
const SenecaPromisify = require('seneca-promisify')
const Fixtures = require('../../support/fixtures')
const { fetchProp, yesterday, now } = require('../../support/helpers')
const GetVoteStats = require('../../../services/get_vote_stats')

fdescribe('the GetVoteStats service', () => { // fcs
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

        GetVoteStats
          .forPoll({ poll_id }, { seneca: si })
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

        GetVoteStats
          .forPoll({ poll_id }, { seneca: si })
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
          .data$(Fixtures.vote({ type: 'down' }))
          .save$()
      })

      it('returns correct vote counts for the requested poll', done => {
        const si = senecaUnderTest(seneca, done)

        GetVoteStats
          .forPoll({ poll_id }, { seneca: si })
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
          .data$(Fixtures.vote({ type: 'up', poll_id }))
          .save$()
      })

      beforeEach(async () => {
        await seneca.make('sys/vote')
          .data$(Fixtures.vote({ type: 'down' }))
          .save$()
      })

      it('returns correct vote counts', done => {
        const si = senecaUnderTest(seneca, done)

        GetVoteStats
          .forPoll({ poll_id }, { seneca: si })
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
          .data$(Fixtures.vote({
            type: 'up',
            poll_id,
            voter_id,
            created_at: yesterday()
          }))
          .save$()
      })

      beforeEach(async () => {
        await seneca.make('sys/vote')
          .data$(Fixtures.vote({
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

          GetVoteStats
            .forPoll({ poll_id }, { seneca: si })
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
            .data$(Fixtures.vote({ type: 'up', poll_id, voter_id: another_voter_id }))
            .save$()
        })


        it('returns correct vote counts', done => {
          const si = senecaUnderTest(seneca, done)

          GetVoteStats
            .forPoll({ poll_id }, { seneca: si })
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
            .data$(Fixtures.vote({ type: 'down', poll_id, voter_id: another_voter_id }))
            .save$()
        })


        it('returns correct vote counts', done => {
          const si = senecaUnderTest(seneca, done)

          GetVoteStats
            .forPoll({ poll_id }, { seneca: si })
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
            .data$(Fixtures.vote({
              type: 'up',
              poll_id,
              voter_id: another_voter_id,
              created_at: yesterday()
            }))
            .save$()
        })

        beforeEach(async () => {
          await seneca.make('sys/vote')
            .data$(Fixtures.vote({
              type: 'down',
              poll_id,
              voter_id: another_voter_id,
              created_at: now()
            }))
            .save$()
        })

        it('returns correct vote counts', done => {
          const si = senecaUnderTest(seneca, done)

          GetVoteStats
            .forPoll({ poll_id }, { seneca: si })
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
            .data$(Fixtures.vote({
              type: 'down',
              poll_id,
              voter_id: another_voter_id,
              created_at: yesterday()
            }))
            .save$()
        })

        beforeEach(async () => {
          await seneca.make('sys/vote')
            .data$(Fixtures.vote({
              type: 'up',
              poll_id,
              voter_id: another_voter_id,
              created_at: now()
            }))
            .save$()
        })

        it('returns correct vote counts', done => {
          const si = senecaUnderTest(seneca, done)

          GetVoteStats
            .forPoll({ poll_id }, { seneca: si })
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
          .data$(Fixtures.vote({
            type: 'down',
            poll_id,
            voter_id,
            created_at: yesterday()
          }))
          .save$()
      })

      beforeEach(async () => {
        await seneca.make('sys/vote')
          .data$(Fixtures.vote({
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

          GetVoteStats
            .forPoll({ poll_id }, { seneca: si })
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
            .data$(Fixtures.vote({ type: 'up', poll_id, voter_id: another_voter_id }))
            .save$()
        })


        it('returns correct vote counts', done => {
          const si = senecaUnderTest(seneca, done)

          GetVoteStats
            .forPoll({ poll_id }, { seneca: si })
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
            .data$(Fixtures.vote({ type: 'down', poll_id, voter_id: another_voter_id }))
            .save$()
        })


        it('returns correct vote counts', done => {
          const si = senecaUnderTest(seneca, done)

          GetVoteStats
            .forPoll({ poll_id }, { seneca: si })
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
            .data$(Fixtures.vote({
              type: 'up',
              poll_id,
              voter_id: another_voter_id,
              created_at: yesterday()
            }))
            .save$()
        })

        beforeEach(async () => {
          await seneca.make('sys/vote')
            .data$(Fixtures.vote({
              type: 'down',
              poll_id,
              voter_id: another_voter_id,
              created_at: now()
            }))
            .save$()
        })

        it('returns correct vote counts', done => {
          const si = senecaUnderTest(seneca, done)

          GetVoteStats
            .forPoll({ poll_id }, { seneca: si })
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
            .data$(Fixtures.vote({
              type: 'down',
              poll_id,
              voter_id: another_voter_id,
              created_at: yesterday()
            }))
            .save$()
        })

        beforeEach(async () => {
          await seneca.make('sys/vote')
            .data$(Fixtures.vote({
              type: 'up',
              poll_id,
              voter_id: another_voter_id,
              created_at: now()
            }))
            .save$()
        })

        it('returns correct vote counts', done => {
          const si = senecaUnderTest(seneca, done)

          GetVoteStats
            .forPoll({ poll_id }, { seneca: si })
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

        GetVoteStats
          .forPoll({ poll_id }, { seneca: si })
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
})

