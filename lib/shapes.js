const Assert = require('assert-plus')
const Joi = require('joi')
const { ValidationError } = require('./errors')

class Shapes {
  static makeValidator(buildSchema, opts = {}) {
    Assert.func(buildSchema, 'buildSchema')
    Assert.object(opts, 'opts')

    return async (data) => {
      try {
        const schema = buildSchema(Joi)
        const result = await schema.validateAsync(data, opts)

        return result
      } catch (err) {
        if (err && err.isJoi) {
          throw ValidationError.ofJoiError(err)
        }

        throw err
      }
    }
  }
}

module.exports = Shapes
