const Assert = require('assert-plus')
const Joi = require('joi')

class Shapes {
  static validate(buildSchema, data) {
    Assert.func(buildSchema, 'buildSchema')

    const schema = buildSchema(Joi)
    return schema.validateAsync(data)
  }
}

module.exports = Shapes
