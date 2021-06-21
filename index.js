const Seneca = require('seneca')
const GetPoll = require('./lib/get_poll_msg')
const OpenPoll = require('./lib/open_poll_msg')
const CastVote = require('./lib/cast_vote_msg')
const Joi = require('@hapi/joi')
const Shapes = require('./lib/shapes')


const seneca_vote = async function seneca_vote(plugin_opts = {}) {
  const seneca = this

  seneca.add('sys:vote,open:poll', OpenPoll(plugin_opts))
  seneca.add('sys:vote,get:poll', GetPoll(plugin_opts))
  seneca.add('sys:vote,vote:*', CastVote(plugin_opts))
}


module.exports = seneca_vote


const {
  voteKindSchema: voteKind,
  voteCodeSchema: voteCode,
  entityNameSchema: entityName 
} = Shapes

module.exports.defaults = {
  dependents: Joi
    .object()
    .pattern(
      voteKind(Joi),

      Joi.object().pattern(
        voteCode(Joi),

        Joi.object({
          totals: Joi.object()
            .pattern(entityName(Joi), Joi.object({
              field: Joi.string()
                .trim()
                .min(1)
                .max(64)
                .required()
            })).required()
        })
      )
    ).optional()
}

