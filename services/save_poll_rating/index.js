const Assert = require('assert-plus')
const { fetchProp } = require('../../lib/utils')
const { NotFoundError } = require('../../lib/errors')

class SavePollRating {
  static async toEntities(args, ctx, opts = {}) {
    Assert.object(args, 'args')
    const poll_rating = fetchProp(args, 'rating')
    const entities = fetchProp(args, 'entities')

    Assert.object(ctx, 'ctx')
    const seneca = fetchProp(ctx, 'seneca')

    for (const ent_name in entities) {
      const ent_id = entities[ent_name]

      const ent = await seneca.make(ent_name)
        .load$(ent_id)

      if (!ent) {
        throw new NotFoundError(ent_name)
      }

      await ent
        .data$({ _rating: poll_rating })
        .save$()
    }
  }
}

module.exports = SavePollRating
