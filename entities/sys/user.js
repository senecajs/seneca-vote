const Assert = require('assert-plus')
const { fetchProp } = require('../../lib/utils')

class User {
  static entity(params) {
    Assert.object(params, 'params')

    const seneca = fetchProp(params, 'seneca', Assert.object)

    return seneca.entity('sys/user')
  }
}

module.exports = User
