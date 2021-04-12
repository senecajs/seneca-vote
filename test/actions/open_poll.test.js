const Assert = require('assert-plus')
const Seneca = require('seneca')
const Entities = require('seneca-entity')
const SenecaPromisify = require('seneca-promisify')
const { fetchProp } = require('../support/helpers')
const VotePlugin = require('../../')

describe('the OpenPoll action', () => {
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

  async function countPolls(seneca) {
    return countEntities(seneca.entity('sys/poll'))
  }

  function openPollPattern(params) {
    return { sys: 'vote', open: 'poll', ...params }
  }

  async function messageOpenPoll(seneca, params) {
    return seneca.post(openPollPattern(params))
  }

  describe('when the fields parameter is missing from the message', () => {
    it('responds with a validation error', done => {
      messageOpenPoll(
        senecaUnderTest(seneca, done),

        {}
      )
        .then(result => {
          expect(result).toEqual({
            ok: false,
            why: '"fields" is required'
          })

          return done()
        })
        .catch(done)
    })
  })

  describe('when the poll title parameter is missing from the message', () => {
    it('responds with a validation error', done => {
      messageOpenPoll(
        senecaUnderTest(seneca, done),

        { fields: {} }
      )
        .then(result => {
          expect(result).toEqual({
            ok: false,
            why: '"fields.title" is required'
          })

          return done()
        })
        .catch(done)
    })
  })

  describe('when the poll with the given title does not exist', () => {
    const poll_title = 'Dolor Sit Amet'

    describe('normally', () => {
      it('creates a new poll with the given title', done => {
        const seneca_under_test = senecaUnderTest(seneca, done)

        countPolls(seneca_under_test)
          .then(num_polls_initially => {
            Assert.strictEqual(0, num_polls_initially)
          })
          .then(() => messageOpenPoll(
            seneca_under_test,
            { fields: { title: poll_title } }
          ))
          .then(async (result) => {
            expect(await countPolls(seneca_under_test)).toEqual(1)

            expect(result).toEqual({
              ok: true,
              data: {
                poll: {
                  id: jasmine.any(String),
                  title: poll_title,
                  created_at: jasmine.any(Date),
                  updated_at: null
                }
              }
            })

            return done()
          })
          .catch(done)
      })
    })

    describe('when bombarded with messages to create a poll with the same title', () => {
      describe('when the lock is enabled', () => {
        it('only creates one poll', done => {
          const seneca_under_test = senecaUnderTest(seneca, done)

          countPolls(seneca_under_test)
            .then(num_polls_initially => {
              Assert.strictEqual(0, num_polls_initially)
            })
            .then(() => new Promise((resolve, _reject) => {
              let num_calls = 0

              const onBombsAway = (err, _result) => err ? done(err) : num_calls--
              const registerTracedAction = cb => { num_calls++; return cb }


              const action_params = { fields: { title: poll_title } }

              seneca_under_test
                .act(openPollPattern(action_params), registerTracedAction(onBombsAway))
                .act(openPollPattern(action_params), registerTracedAction(onBombsAway))
                .act(openPollPattern(action_params), registerTracedAction(onBombsAway))

              return waitOnBombardmentToBeOver(resolve)


              function waitOnBombardmentToBeOver(cb) {
                if (num_calls === 0) {
                  return cb()
                }

                return setImmediate(() => waitOnBombardmentToBeOver(cb))
              }
            }))
            .then(async () => {
              expect(await countPolls(seneca_under_test)).toEqual(1)

              return done()
            })
            .catch(done)
        })
      })
    })
  })

  describe('when the poll with the given title already exists', () => {
    let poll_id

    const poll_title = 'Dolor Sit Amet'

    beforeEach(async () => {
      // TODO:
      // - [ ] Use a factory.
      // - [ ] Validate the shape of the poll.
      //
      const poll = await seneca.entity('sys/poll')
        .make$({
          title: poll_title,
          updated_at: null,
          created_at: new Date()
        })
        .save$()

      poll_id = fetchProp(poll, 'id')
    })

    it('creates a new poll with the given title', done => {
      const seneca_under_test = senecaUnderTest(seneca, done)

      countPolls(seneca_under_test)
        .then(num_polls_initially => {
          Assert.strictEqual(1, num_polls_initially)
        })
        .then(() => messageOpenPoll(
          seneca_under_test,
          { fields: { title: poll_title } }
        ))
        .then(async (result) => {
          expect(await countPolls(seneca_under_test)).toEqual(1)

          expect(result).toEqual({
            ok: true,
            data: {
              poll: {
                id: poll_id,
                title: poll_title,
                created_at: jasmine.any(Date),
                updated_at: null
              }
            }
          })

          return done()
        })
        .catch(done)
    })
  })
})

