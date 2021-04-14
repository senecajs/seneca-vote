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
              title: 'Best hairline of the Ist century A.D.',
              created_at: '2021-04-14T01:02:00.765Z'
            }
          }
        }
      },
      calls: [
        {
          pattern: 'vote:up',
          params: {},
          out: {
            ok: false,
            why: '"fields" is required'
          }
        },
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
        },
        {
          pattern: 'vote:up',
          params: {
            fields: {
              poll_id: 'does_not_exist',
              voter_id: 'bar',
              voter_type: 'sys/user'
            }
          },
          out: {
            ok: false,
            why: 'Poll with id does_not_exist does not exist.'
          }
        },
        {
          pattern: 'vote:down',
          params: {},
          out: {
            ok: false,
            why: '"fields" is required'
          }
        },
        {
          pattern: 'vote:down',
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
              poll_stats: { num_upvotes: 0, num_downvotes: 1 }
            }
          }
        },
        {
          pattern: 'vote:down',
          params: {
            fields: {
              poll_id: 'does_not_exist',
              voter_id: 'bar',
              voter_type: 'sys/user'
            }
          },
          out: {
            ok: false,
            why: 'Poll with id does_not_exist does not exist.'
          }
        },

        {
          pattern: 'get:poll',
          params: {},
          out: {
            ok: false,
            why: '"poll_id" is required'
          }
        },
        {
          pattern: 'get:poll',
          params: { poll_id },
          out: {
            ok: true,
            data: {
              poll: {
                id: poll_id,
                title: 'Best hairline of the Ist century A.D.',
                created_at: '2021-04-14T01:02:00.765Z'
              }
            }
          }
        },
        {
          pattern: 'get:poll',
          params: { poll_id: 'does_not_exist' },
          out: {
            ok: false,
            why: 'Poll does not exist'
          }
        },

        {
          pattern: 'open:poll',
          params: {
            fields: {
              title: 'Best hairline of the Ist century A.D.'
            }
          },
          out: {
            ok: true,
            data: {
              poll: {
                id: poll_id,
                title: 'Best hairline of the Ist century A.D.',
                created_at: '2021-04-14T01:02:00.765Z'
              }
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

