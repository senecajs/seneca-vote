const Assert = require('assert-plus')
const Poll = require('../entities/sys/poll')
const { fetchProp } = require('../lib/utils')
const Shapes = require('../lib/shapes')

module.exports = function (opts = {}) {
  this.add('sys:vote,get:poll', async function (msg, reply) {
    try {
      // TODO:
      // - [ ] Use seneca-joi
      // - [ ] Proper handling of the validation errors.
      //
      await Shapes.validate(joi => joi.object({
        poll_id: joi.string().max(64).required()
      }).unknown(), msg, { stripUnknown: true })
    } catch (err) {
      if (err && err.isJoi) {
        return reply(null, {
          status: 'failed',
          error: { message: err.message }
        })
      }

      return reply(err)
    }

    const poll_id = fetchProp(msg, 'poll_id', Assert.string)
    const poll_entity = Poll.entity({ seneca: this })
 
    const poll = await poll_entity.load$({ id$: poll_id })

    if (!poll) {
      // TODO: Improve this code. Please use the following for details:
      // https://github.com/voxgig/seneca-member/blob/429ca68fc07311d97a8f18a3fea3f43a24fa21db/member.js#L272
      //
      return reply(null, {
        status: 'failed',
        error: { message: 'Poll does not exist' }
      })
    }

    return reply(null, {
      status: 'success',
      data: { poll: poll.data$(false) }
    })
  })
}

