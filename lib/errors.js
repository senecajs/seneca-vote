const Assert = require('assert-plus')

class ValidationError extends Error {
  constructor(...args) {
    const [msg, filename, line_no, ...rest_of_args] = args

    super(msg, filename, line_no)

    const details = buildDetails()
    this.name = 'ValidationError'

    this.message = msg
    Assert.optionalString(this.message, 'message')

    this.details = details
    Assert.array(this.details, 'details')


    function buildDetails() {
      const no_details = []

      if (rest_of_args.length === 0) {
        return no_details
      }

      const [extras] = rest_of_args

      return extras.details || no_details
    }
  }

  static ofJoiError(joi_err) {
    Assert.ok(joi_err.isJoi, 'must be a Joi error')

    const filename = null
    const line_no = null
    const message = joi_err.message
    const details = joi_err.details

    return new ValidationError(message, filename, line_no, { details })
  }
}

class NotFoundError extends Error {}

module.exports = { ValidationError, NotFoundError }
