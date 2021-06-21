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

  static fetchProp(base, prop, assertType = (x, msg) => {}) {
    if (base === null || base === undefined) {
      Assert.fail('Object cannot be null or undefined.')
    }

    const props = Array.isArray(prop)
      ? prop
      : [prop]

    const x = props.reduce((o, prop) => {
      if (!(prop in o)) {
        Assert.fail(`Missing property: "${prop}"`)
      }

      return o[prop]
    }, base)

    assertType(x, prop)

    return x
  }
}

module.exports = TestHelpers
