const Assert = require('assert-plus')

class Vote {
  static TYPE_UP() {
    return 'up'
  }

  static TYPE_DOWN() {
    return 'down'
  }
}

module.exports = Vote
