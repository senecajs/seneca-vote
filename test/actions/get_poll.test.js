const Assert = require('assert-plus')
const Seneca = require('seneca')
const Entities = require('seneca-entity')
const SenecaPromisify = require('seneca-promisify')
const { fetchProp } = require('../support/helpers')
const VotePlugin = require('../../')

describe('the GetPoll action', () => {
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

  async function messageGetPoll(seneca, params) {
    return seneca.post({ sys: 'vote', get: 'poll', ...params })
  }

  describe('when the poll id parameter is missing from the message', () => {
    it('responds with a validation error', done => {
      messageGetPoll(
        senecaUnderTest(seneca, done),

        {}
      )
        .then(result => {
          expect(result).toEqual({
            ok: false,
            why: '"poll_id" is required'
          })

          return done()
        })
        .catch(done)
    })
  })

  describe('when the poll does not exist', () => {
    it('responds with an error', done => {
      messageGetPoll(
        senecaUnderTest(seneca, done),

        { poll_id: 'abcd' }
      )
        .then(result => {
          expect(result).toEqual({
            ok: false,
            why: 'Poll does not exist'
          })

          return done()
        })
        .catch(done)
    })
  })

  describe('when the poll exists', () => {
    let poll_id

    const poll_title = 'Lorem Ipsum Dolor'
    const poll_created_at = new Date()

    beforeEach(async () => {
      // TODO:
      // - [ ] Use a factory.
      // - [ ] Validate the shape of the poll.
      //
      const poll = await seneca.entity('sys/poll')
        .make$({
          title: poll_title,
          updated_at: null,
          created_at: poll_created_at
        })
        .save$()

      poll_id = fetchProp(poll, 'id')
    })

    it('responds with poll-related info', done => {
      messageGetPoll(
        senecaUnderTest(seneca, done),

        { poll_id }
      )
        .then(result => {
          expect(result).toEqual({
            ok: true,
            data: {
              poll: {
                title: poll_title,
                updated_at: null,
                created_at: poll_created_at,
                id: poll_id
              }
            }
          })

          return done()
        })
        .catch(done)
    })
  })
})

