const Assert = require('assert-plus')
const isMatch = require('lodash.ismatch')

class Utils {
  static countBy(f, ary) {
    Assert.func(f, 'f')
    Assert.array(ary, 'ary')

    return ary.filter(f).length
  }

  static countMatching(attrs, ary) {
    return Utils.countBy(x => isMatch(x, attrs), ary)
  }
}

module.exports = Utils
