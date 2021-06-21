const Assert = require('assert-plus')
const isMatch = require('lodash.ismatch')

class Utils {
  static fetchProp(base, prop, assertType = (x, msg) => {}) {
    Assert.optionalObject(base, 'Object cannot be null or undefined.')

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
