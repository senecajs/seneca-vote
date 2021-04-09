const Assert = require('assert-plus')
const { fetchProp } = require('../../lib/utils')
const Shapes = require('../../lib/shapes')

class Poll {
  static entity(params) {
    Assert.object(params, 'params')

    const seneca = fetchProp(params, 'seneca', Assert.object)

    return seneca.entity('sys/poll')
  }
}

module.exports = Poll
