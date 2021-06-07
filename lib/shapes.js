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

  static entityIdSchema(joi) {
    return joi.string().max(64)
  }

  static entityNameSchema(joi) {
    return joi.string().trim().min(1).max(64)
  }

  static voteKindSchema(joi) {
    return joi.string().trim().min(1).max(64)
  }

  static voteCodeSchema(joi) {
    return joi.string().trim().min(1).max(64)
  }

  static validatePluginOptions(plugin_opts) {
    const validate = Shapes.makeValidator(joi => joi.object({
      dependents: dependentsSchema(joi).optional()
    }), { stripUnknown: false })

    return validate(plugin_opts)


    function totalsSchema(joi) {
      const { entityNameSchema: entityName } = Shapes

      return joi.object().pattern(entityName(joi), joi.object({
        field: joi.string()
          .trim()
          .min(1)
          .max(64)
          .required()
      }))
    }

    function dependentsSchema(joi) {
      const {
        voteKindSchema: voteKind,
        voteCodeSchema: voteCode
      } = Shapes

      return joi
        .object()
        .pattern(
          voteKind(joi),

          joi.object().pattern(
            voteCode(joi),

            joi.object({
              totals: totalsSchema(joi).required()
            })
          )
        )
    }
  }
}

Shapes.MismatchError = class MismatchError extends Error {}

module.exports = Shapes
