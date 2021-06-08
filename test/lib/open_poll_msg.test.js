const Assert = require('assert-plus')
const Seneca = require('seneca')
const Entities = require('seneca-entity')
const SenecaPromisify = require('seneca-promisify')
const { fetchProp } = require('../support/helpers')
const VotePlugin = require('../../')
const MemStore = require('seneca-mem-store')

describe('the OpenPoll action', () => {
  let seneca

  beforeEach(() => {
    seneca = makeSeneca()
  })

  function makeSeneca(args = {}) {
    Assert.object(args, 'args')

    return Seneca({ log: 'test' })
      .use(Entities)
      .use(SenecaPromisify)
      .use(VotePlugin)
      .use(MemStore)
  }

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

  describe('when the poll title parameter is missing from the message', () => {
    it('responds with a validation error', done => {
      messageOpenPoll(
        senecaUnderTest(seneca, done),

        { fields: {} }
      )
        .then(result => {
          expect(result).toEqual({
            ok: false,
            why: 'invalid-field',
            details: {
              path: ['fields', 'title'],
              why_exactly: 'required'
            }
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
      function bombardOpenPolls(args, done) {
        const seneca = fetchProp(args, 'seneca', Assert.ok)
        const num_calls = fetchProp(args, 'num_calls', Assert.number)

        Assert(num_calls >= 0, 'num_calls')

        return new Promise((resolve, _reject) => {
          let cur_ncalls
          cur_ncalls = num_calls

          const onBombsAway = (err, _result) => err ? done(err) : cur_ncalls--


          const action_params = { fields: { title: poll_title } }

          for (let times = 0; times < num_calls; times++) {
            seneca.act(openPollPattern(action_params), onBombsAway)
          }

          return waitOnBombardmentToBeOver(resolve)


          function waitOnBombardmentToBeOver(cb) {
            if (cur_ncalls === 0) {
              return cb()
            }

            return setImmediate(() => waitOnBombardmentToBeOver(cb))
          }
        })
      }


      let seneca

      beforeEach(() => {
        seneca = makeSeneca()
      })

      it('does not result in a race condition', done => {
        const seneca_under_test = senecaUnderTest(seneca, done)
        const num_calls = 3

        countPolls(seneca_under_test)
          .then(num_polls_initially => {
            Assert.strictEqual(0, num_polls_initially)
          })
          .then(() => bombardOpenPolls({ seneca, num_calls }))
          .then(async () => {
            expect(await countPolls(seneca_under_test)).toEqual(1)

            return done()
          })
          .catch(done)
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

