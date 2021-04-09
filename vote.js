const Assert = require('assert-plus')

function vote(opts = {}) {
  this.add('sys:vote,cmd:ping', function (msg, reply) {
    reply({ message: 'pong!', plugin_opts: opts, your_message: msg })
  })
}

module.exports = vote
