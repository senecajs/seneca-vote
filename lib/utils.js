const Assert = require('assert-plus')

class Utils {
  static fetchProp(base, prop, assertType = (x, msg) => {}) {
    if (base === null || base === undefined) {
      Assert.fail('Object cannot be null or undefined.')
    }

    const props = (() => {
      if (Array.isArray(prop)) {
        return prop
      }

      return [prop]
    })()

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

module.exports = Utils
