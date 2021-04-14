const Assert = require('assert-plus')
const Joi = require('joi')
const { ValidationError } = require('./errors')
const { fetchProp } = require('./utils')

class Shapes {
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

    function validate(schema, data, opts) {
      const validation = schema.validate(data, opts)

      if (validation.error) {
        throw ValidationError.ofJoiError(validation.error)
      }

      return fetchProp(validation, 'value')
    }

  }
}

module.exports = Shapes
