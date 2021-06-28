const Assert = require('assert-plus')
const Shapes = require('../../lib/shapes')

describe('match', () => {
  it('accepts an async buildSchema function arg', async () => {
    try {
      await Shapes.match(async (joi) => joi.number(), 'abc')
    } catch (err) {
      expect(err.message).toEqual('"value" must be a number')
      return
    }

    Assert.fail('Expected an error')
  })
})

describe('makeValidator', () => {
  it('can make async validators', async () => {
    const validate = Shapes.makeValidator(async (joi) => joi.number())

    try {
      await validate('abc')
    } catch (err) {
      expect(err.message).toEqual('"value" must be a number')
      return
    }

    Assert.fail('Expected an error')
  })
})

