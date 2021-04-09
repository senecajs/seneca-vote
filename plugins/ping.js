const Assert = require('assert-plus')

function ping(opts = {}) {
  this.add('sys:ping,cmd:ping', function (msg, reply) {
    return reply(null, {
      message: 'pong!',
      plugin_opts: opts,
      your_message: msg
    })
  })
}

module.exports = ping
