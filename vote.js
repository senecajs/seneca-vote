const Seneca = require('seneca')
const { Joi } = Seneca.util
const makeGetPoll = require('./lib/get_poll_msg')
const makeOpenPoll = require('./lib/open_poll_msg')
const makeCastVote = require('./lib/cast_vote_msg')
const Shapes = require('./lib/shapes')

const seneca_vote = async function seneca_vote(options = {}) {
  const seneca = this

  seneca.add('sys:vote,open:poll', makeOpenPoll(options))
  seneca.add('sys:vote,get:poll', makeGetPoll(options))
  seneca.add('sys:vote,vote:*', makeCastVote(options))
}

module.exports = seneca_vote

const {
  voteKindSchema: voteKind,
  voteCodeSchema: voteCode,
  entityNameSchema: entityName,
} = Shapes

module.exports.defaults = {
  dependents: Joi.object()
    .pattern(
      voteKind(Joi),

      Joi.object().pattern(
        voteCode(Joi),

        Joi.object({
          totals: Joi.object()
            .pattern(
              entityName(Joi),
              Joi.object({
                field: Joi.string().trim().min(1).max(64).required(),
              })
            )
            .required(),
        })
      )
    )
    .optional(),
}

module.exports.errors = {
  not_found: '<%=what%> not found',
}
