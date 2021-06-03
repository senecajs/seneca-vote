const Seneca = require('seneca')
const GetPoll = require('./lib/get_poll_msg')
const OpenPoll = require('./lib/open_poll_msg')
const CastVote = require('./lib/cast_vote_msg')

module.exports = function (plugin_opts = {}) {
  const seneca = this

  seneca.add('sys:vote,open:poll', OpenPoll(plugin_opts))
  seneca.add('sys:vote,get:poll', GetPoll(plugin_opts))
  seneca.add('sys:vote,vote:*', CastVote(plugin_opts))
}

