const Assert = require('assert-plus')
const Vote = require('../../entities/sys/vote')
const Poll = require('../../entities/sys/poll')
const { fetchProp } = require('../../lib/utils')
const { lock } = require('../../lib/lock')

class OpenPollService {
  static async openPoll(args, ctx) {
    Assert.object(args, 'args')
    Assert.object(ctx, 'ctx')

    const seneca = fetchProp(ctx, 'seneca')
    const poll_title = fetchProp(args, 'poll_title', Assert.string)

    return await lock(async () => {
      const poll_entity = Poll.entity({ seneca })
      const existing_poll = await poll_entity.load$({ title: poll_title })

      if (existing_poll) {
        return existing_poll
      }

      const poll_attributes = {
        title: poll_title,
        created_at: new Date(),
        updated_at: null
      }

      await poll_entity.make$()
        .data$(poll_attributes)
        .save$()

      const new_poll = await poll_entity.load$(poll_attributes)

      return new_poll
    })
  }
}

module.exports = OpenPollService
