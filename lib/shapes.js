const Assert = require('assert-plus')
const Joi = require('joi')
const { ValidationError } = require('./errors')
const { fetchProp } = require('./utils')

class Shapes {
  static match(buildSchema, data, opts = {}) {
    Assert.func(buildSchema, 'buildSchema')
    Assert.object(opts, 'opts')

    const built = buildSchema(Joi)

    if (built && typeof built.then === 'function') {
      return built.then(schema => helpMatch(schema, data, opts))
    }

    return helpMatch(built, data, opts)


    function helpMatch(schema, data, opts = {}) {
      const validation = schema.validate(data, opts)

      if (validation.error) {
        throw Shapes.MismatchError(validation.error.message)
      }

      return fetchProp(validation, 'value')
    }
  }

  static makeValidator(buildSchema, opts = {}) {
    Assert.func(buildSchema, 'buildSchema')
    Assert.object(opts, 'opts')

    return data => {
      const built = buildSchema(Joi)

      if (built && typeof built.then === 'function') {
        return built.then(schema => validate(schema, data, opts))
      }

      return validate(built, data, opts)
    }

    function validate(schema, data, opts = {}) {
      const validation = schema.validate(data, opts)

      if (validation.error) {
        throw ValidationError.ofJoiError(validation.error)
      }

      return fetchProp(validation, 'value')
    }
  }
}

Shapes.MismatchError = class MismatchError extends Error {}

module.exports = Shapes
