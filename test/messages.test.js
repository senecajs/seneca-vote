const Assert = require('assert-plus')
const Seneca = require('seneca')
const Entities = require('seneca-entity')
const SenecaPromisify = require('seneca-promisify')
const SenecaMsgTest = require('seneca-msg-test')
const { fetchProp } = require('./support/helpers')
const VotePlugin = require('../')

describe('message-level tests', () => {
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

  const poll_id = 'abcpoll123'


  let test_spec

  beforeEach(() => {
    test_spec = {
      print: false,
      pattern: 'sys:vote',
      data: {
        sys: {
          poll: {
            // TODO: Use shapes to validate the shape of a poll record.
            //
            [poll_id]: {
              id: poll_id,
              title: 'Lorem Ipsum',
              created_at: new Date()
            }
          }
        }
      },
      calls: [
        {
          pattern: 'vote:up',
          params: {
            fields: {
              poll_id,
              voter_id: 'bar',
              voter_type: 'sys/user'
            }
          },
          out: {
            ok: true,
            data: {
              poll_stats: { num_upvotes: 1, num_downvotes: 0 }
            }
          }
        }
      ]
    }
  })

  fit('is ok', done => { // fcs
    const seneca_under_test = senecaUnderTest(seneca, done)
    const runMsgTest = SenecaMsgTest(seneca_under_test, test_spec)

    runMsgTest().then(done).catch(done)
  })
})

