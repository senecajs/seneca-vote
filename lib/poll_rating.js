const Assert = require('assert-plus')
const { NotFoundError } = require('./errors')

class PollRating {
  static async denormalizeToEntities(args, ctx, opts = {}) {
    Assert.object(args, 'args')
    const poll_rating = args.rating

    Assert.object(ctx, 'ctx')
    const seneca = ctx.seneca

    const ent_infos = getEntityInfoForSave(args, ctx, opts) 

    for (const ent_info of ent_infos) {
      const { ent_name, ent_id, field } = ent_info

      const ent = await seneca.make(ent_name)
        .load$(ent_id)

      if (!ent) {
        throw new NotFoundError(ent_name)
      }

      await ent
        .data$({ [field]: poll_rating })
        .save$()
    }
  }
}


function getEntityInfoForSave(args, _ctx, opts) {
  Assert.object(opts, 'opts')

  const matchable_kinds = opts.dependents || null

  if (null == matchable_kinds) {
    return []
  }

  const { vote_kind } = args
  const matchable_codes = matchable_kinds[vote_kind]

  if (null == matchable_codes) {
    return []
  }

  const { vote_code } = args
  const info = matchable_codes[vote_code]

  if (null == info || null == info.totals) {
    return []
  }


  const requested_entities = args.entities

  const result = Object.keys(requested_entities)
    .map(ent_name => {
      const ent_info = info.totals[ent_name]

      if (null == ent_info) {
        return null
      }

      const { field } = ent_info

      if (null == field) {
        return null
      }

      const ent_id = requested_entities[ent_name]

      return { ent_name, ent_id, field }
    })
    .filter(x => null != x)


  return result
}


module.exports = PollRating
