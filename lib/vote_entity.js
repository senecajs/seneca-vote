const Assert = require('assert-plus')
const { fetchProp } = require('./utils')

class Vote {
  static TYPE_UP() {
    return 'up'
  }

  static TYPE_DOWN() {
    return 'down'
  }
}

module.exports = Vote
