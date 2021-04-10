const Assert = require('assert-plus')
const Joi = require('joi')

class Shapes {
  static validate(buildSchema, data, validation_opts = {}) {
    Assert.func(buildSchema, 'buildSchema')

    const schema = buildSchema(Joi)
    return schema.validateAsync(data, validation_opts)
  }
}

module.exports = Shapes
