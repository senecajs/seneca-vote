const Seneca = require('seneca')
const GetPoll = require('./actions/get_poll')
const OpenPoll = require('./actions/open_poll')
const CastVote = require('./actions/cast_vote')

module.exports = function (_plugin_opts = {}) {
  const seneca = this

  seneca.use(OpenPoll)
  seneca.use(GetPoll)
  seneca.use(CastVote)
}
