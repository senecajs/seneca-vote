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

  static validate(buildSchema, data) {
    console.warn('[DEPRECATED] This function is deprecated and will very soon be removed. Please use makeValidator instead')


    Assert.func(buildSchema, 'buildSchema')

    const schema = buildSchema(Joi)
    return schema.validateAsync(data)
  }
}

module.exports = Shapes
