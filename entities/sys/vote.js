const Assert = require('assert-plus')
const { fetchProp } = require('../../lib/utils')

class Vote {
  static entity(params) {
    Assert.object(params, 'params')

    const seneca = fetchProp(params, 'seneca', Assert.object)

    return seneca.entity('sys/vote')
  }
}

module.exports = Vote
