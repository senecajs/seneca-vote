const Assert = require('assert-plus')
const Vote = require('../../lib/entities/sys/vote')
const { fetchProp } = require('../../lib/utils')

class OpenPollService {
  static async openPoll(args, ctx, opts = {}) {
    Assert.object(args, 'args')
    Assert.object(ctx, 'ctx')
    Assert.object(opts, 'opts')

    const seneca = fetchProp(ctx, 'seneca')
    const poll_title = fetchProp(args, 'poll_title', Assert.string)

    const existing_poll = await seneca.make('sys/poll')
      .load$({ title: poll_title })

    if (existing_poll) {
      return existing_poll
    }

    const poll_attributes = {
      title: poll_title,
      created_at: new Date(),
      updated_at: null
    }

    await seneca.make('sys/poll')
      .data$(poll_attributes)
      .save$({ upsert$: ['title'] })

    const new_poll = await seneca.make('sys/poll')
      .load$(poll_attributes)

    return new_poll
  }
}

module.exports = OpenPollService
