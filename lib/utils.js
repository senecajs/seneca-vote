const Assert = require('assert-plus')

class Utils {
  static countBy(f, ary) {
    Assert.func(f, 'f')
    Assert.array(ary, 'ary')

    return ary.filter(f).length
  }
}

module.exports = Utils
