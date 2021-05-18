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

  fdescribe('toEntities', () => { // fcs
    describe('when an entity with the given id exists', () => {
      let poll_id

      beforeEach(async () => {
        const poll = await seneca.entity('sys/poll')
          .make$(Fixtures.poll())
          .save$()

        poll_id = fetchProp(poll, 'id')
      })

      it('saves the rating to the entity', done => {
        const seneca_under_test = senecaUnderTest(seneca, done)

        const rating = 37
        const entities = { 'sys/poll': poll_id }

        SavePollRating.toEntities({ rating, entities }, { seneca: seneca_under_test })
          .then(async () => {
            const poll = await seneca.make('sys/poll').load$(poll_id)

            expect(poll._rating).toEqual(rating)

            return done()
          })
          .catch(done)
      })
    })

    describe('when an entity with the given id does not exist', () => {
      it('throws an error', done => {
        const seneca_under_test = senecaUnderTest(seneca, done)

        const rating = 37
        const entities = { 'sys/poll': 'idonotexist' }

        SavePollRating.toEntities({ rating, entities }, { seneca: seneca_under_test })
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

