const Assert = require('assert-plus')
const Utils = require('../../lib/utils')

describe('fetchProp', () => {
  it('throws an error if a property is missing', () => {
    const o = {}

    try {
      Utils.fetchProp(o, 'foo')
    } catch (err) {
      expect(err.message).toEqual('Missing property: "foo"')
      return
    }

    Assert.fail('Expected an error')
  })
})

