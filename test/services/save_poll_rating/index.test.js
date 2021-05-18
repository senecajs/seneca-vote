const Assert = require('assert-plus')
const Seneca = require('seneca')
const Entities = require('seneca-entity')
const SenecaPromisify = require('seneca-promisify')
const Faker = require('faker')
const Fixtures = require('../../support/fixtures')
const { fetchProp } = require('../../support/helpers')
const SavePollRating = require('../../../services/save_poll_rating')
const { NotFoundError } = require('../../../lib/errors')

describe('SavePollRating service', () => {
  let seneca

  beforeEach(() => {
    seneca = Seneca({ log: 'test' })
      .use(Entities)
      .use(SenecaPromisify)
  })

  function senecaUnderTest(seneca, cb) {
    return seneca.test(cb)
  }


  const vote_kind = 'red'
  const vote_code = 'mars'
  const save_to_field = '_rating'

  const plugin_opts = {
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

  describe('toEntities', () => {
    describe('when an entity with the given id exists', () => {
      let poll_id

      beforeEach(async () => {
        const poll = await seneca.entity('sys/poll')
          .make$(Fixtures.poll())
          .save$()

        poll_id = fetchProp(poll, 'id')
      })

      describe('requested vote kind does not match the one specified in the plugin options', () => {
        it('does not save the rating', done => {
          const seneca_under_test = senecaUnderTest(seneca, done)

          const rating = 37
          const entities = { 'sys/poll': poll_id }

          SavePollRating.toEntities(
            { rating, entities, vote_kind: 'nope', vote_code },
            { seneca: seneca_under_test },
            plugin_opts
          )
            .then(async () => {
              const poll = await seneca.make('sys/poll').load$(poll_id)

              expect(save_to_field in poll).toEqual(false)

              return done()
            })
            .catch(done)
        })
      })

      describe('requested vote code does not match the one specified in the plugin options', () => {
        it('does not save the rating', done => {
          const seneca_under_test = senecaUnderTest(seneca, done)

          const rating = 37
          const entities = { 'sys/poll': poll_id }

          SavePollRating.toEntities(
            { rating, entities, vote_kind, vote_code: 'nope' },
            { seneca: seneca_under_test },
            plugin_opts
          )
            .then(async () => {
              const poll = await seneca.make('sys/poll').load$(poll_id)

              expect(save_to_field in poll).toEqual(false)

              return done()
            })
            .catch(done)
        })
      })

      describe('when the requested entity is not listed in the plugin options', () => {
        let vote_id

        beforeEach(async () => {
          const vote = await seneca.entity('sys/vote')
            .make$(Fixtures.vote())
            .save$()

          vote_id = fetchProp(vote, 'id')
        })

        it('does not save the rating', done => {
          const seneca_under_test = senecaUnderTest(seneca, done)

          const rating = 37
          const entities = { 'sys/vote': vote_id }

          SavePollRating.toEntities(
            { rating, entities, vote_kind, vote_code },
            { seneca: seneca_under_test },
            plugin_opts
          )
            .then(async () => {
              const vote = await seneca.make('sys/vote').load$(vote_id)

              expect(save_to_field in vote).toEqual(false)

              return done()
            })
            .catch(done)
        })
      })

      describe('normally', () => {
        it('saves the rating to the entity', done => {
          const seneca_under_test = senecaUnderTest(seneca, done)

          const rating = 37
          const entities = { 'sys/poll': poll_id }

          SavePollRating.toEntities(
            { rating, entities, vote_kind, vote_code },
            { seneca: seneca_under_test },
            plugin_opts
          )
            .then(async () => {
              const poll = await seneca.make('sys/poll').load$(poll_id)

              expect(poll[save_to_field]).toEqual(rating)

              return done()
            })
            .catch(done)
        })
      })
    })

    describe('when an entity with the given id does not exist', () => {
      it('throws an error', done => {
        const seneca_under_test = senecaUnderTest(seneca, done)

        const rating = 37
        const entities = { 'sys/poll': 'idonotexist' }

        SavePollRating.toEntities(
          { rating, entities, vote_kind, vote_code },
          { seneca: seneca_under_test },
          plugin_opts
        )
          .then(async () => {
            done(new Error('Expected an error to be thrown'))
          })
          .catch(err => {
            if (err instanceof NotFoundError) {
              expect(err.message).toEqual('sys/poll')
              return done()
            }

            return done(err)
          })
      })
    })
  })
})

