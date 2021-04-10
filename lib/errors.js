const Assert = require('assert-plus')
const { fetchProp } = require('./utils')

class ValidationError extends Error {
  constructor(...args) {
    const [msg, filename, line_no, ...rest_of_args] = args

    super(msg, filename, line_no)

    const details = (() => {
      const no_details = []

      if (rest_of_args.length === 0) {
        return no_details
      }

      const [extras] = rest_of_args

      return extras.details || no_details
    })()

    this.name = 'ValidationError'

    this.message = msg
    Assert.optionalString(this.message, 'message')

    this.details = details
    Assert.array(this.details, 'details')
  }

  static ofJoiError(joi_err) {
    Assert.ok(joi_err.isJoi, 'must be a Joi error')

    const filename = null
    const line_no = null
    const message = fetchProp(joi_err, 'message')
    const details = fetchProp(joi_err, 'details')

    return new ValidationError(message, filename, line_no, { details })
  }
}

module.exports = { ValidationError }
