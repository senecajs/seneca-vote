const Assert = require('assert-plus')
const moment = require('moment')

class TestHelpers {
  static yesterday(date = new Date()) {
    Assert.date(date, 'date')
    return moment(date).subtract(1, 'day').toDate()
  }

  static now() {
    return moment().toDate()
  }
}

module.exports = TestHelpers
