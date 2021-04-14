const Seneca = require('seneca')
const GetPoll = require('./actions/get_poll')
const OpenPoll = require('./actions/open_poll')
const CastVote = require('./actions/cast_vote')

module.exports = function (plugin_opts = {}) {
  const seneca = this

  seneca.use(OpenPoll, plugin_opts)
  seneca.use(GetPoll, plugin_opts)
  seneca.use(CastVote, plugin_opts)
}
