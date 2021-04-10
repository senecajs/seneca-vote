const Assert = require('assert-plus')
const Seneca = require('seneca')
const Entities = require('seneca-entity')
const SenecaPromisify = require('seneca-promisify')
const GetPoll = require('../../actions/get_poll')

describe('the GetPoll action', () => {
  function senecaUnderTest(cb) {
    return Seneca({ log: 'test' })
      .test(cb)
      .use(SenecaPromisify)
      .use(Entities)
      .use(GetPoll)
  }

  async function messageGetPoll(params) {
    return new Promise((resolve, reject) => {
      return senecaUnderTest(reject)
        .post({ sys: 'vote', get: 'poll', ...params })
        .then(resolve)
    })
  }

  describe('when the poll does not exist', () => {
    it('responds with an error', async () => {
      const result = await messageGetPoll({ poll_id: 'abcd' })

      expect(result).toEqual({
        status: 'failed',
        error: { message: 'Poll does not exist' }
      })
    })
  })

  describe('when the poll exists', () => {
    let poll_id

    beforeEach(async () => {
      
    })

    it('responds with an error', async () => {
      const result = await messageGetPoll({ poll_id: 'abcd' })

      expect(result).toEqual({
        status: 'failed',
        error: { message: 'Poll does not exist' }
      })
    })
  })
})
