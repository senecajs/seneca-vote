const Seneca = require('seneca')
const GetPoll = require('./lib/get_poll')
const OpenPoll = require('./lib/open_poll')
const CastVote = require('./lib/cast_vote')

module.exports = function (plugin_opts = {}) {
  const seneca = this

  seneca.add('sys:vote,open:poll', OpenPoll(plugin_opts))
  seneca.add('sys:vote,get:poll', GetPoll(plugin_opts))
  seneca.add('sys:vote,vote:*', CastVote(plugin_opts))
}

