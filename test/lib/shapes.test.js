const Assert = require('assert-plus')
const Shapes = require('../../lib/shapes')
const { InvalidPluginOptionsError } = require('../../lib/errors')

describe('validatePluginOptions', () => {
  it('expects all required options to be present', async () => {
    await Shapes.validatePluginOptions({})
    Assert.ok(true)
  })

  it('does not allow unknown options', async () => {
    try {
      await Shapes.validatePluginOptions({
        foo: 'bar'
      })
    } catch (err) {
      if (err instanceof InvalidPluginOptionsError) {
        expect(err.message).toEqual(`"foo" is not allowed`)

        return
      }

      throw err
    }

    Assert.fail('Expected an error')
  })

  it('expects kind to not be blank', async () => {
    const invalid_kind = '   '

    try {
      await Shapes.validatePluginOptions({
        dependents: {
          [invalid_kind]: {
            'mars': {
              totals: {
                'sys/poll': {
                  field: '_poll_rating'
                }
              }
            }
          }
        }
      })
    } catch (err) {
      if (err instanceof InvalidPluginOptionsError) {
        expect(err.message)
          .toEqual(`"dependents.${invalid_kind}" is not allowed`)

        return
      }

      throw err
    }

    Assert.fail('Expected an error')
  })

  it('expects kind to have an object value', async () => {
    const kind = 'red'

    try {
      await Shapes.validatePluginOptions({
        dependents: {
          [kind]: null
        }
      })
    } catch (err) {
      if (err instanceof InvalidPluginOptionsError) {
        expect(err.message)
          .toEqual(`"dependents.${kind}" must be of type object`)

        return
      }

      throw err
    }

    Assert.fail('Expected an error')
  })

  it('expects code to not be blank', async () => {
    const kind = 'red'
    const invalid_code = '   '

    try {
      await Shapes.validatePluginOptions({
        dependents: {
          [kind]: {
            [invalid_code]: {
              totals: {
                'sys/poll': {
                  field: '_poll_rating'
                }
              }
            }
          }
        }
      })
    } catch (err) {
      if (err instanceof InvalidPluginOptionsError) {
        expect(err.message)
          .toEqual(`"dependents.${kind}.${invalid_code}" is not allowed`)

        return
      }

      throw err
    }

    Assert.fail('Expected an error')
  })

  it('expects code to have an object value', async () => {
    const kind = 'red'
    const code = 'mars'

    try {
      await Shapes.validatePluginOptions({
        dependents: {
          [kind]: {
            [code]: null
          }
        }
      })
    } catch (err) {
      if (err instanceof InvalidPluginOptionsError) {
        expect(err.message)
          .toEqual(`"dependents.${kind}.${code}" must be of type object`)

        return
      }

      throw err
    }

    Assert.fail('Expected an error')
  })

  it('requires the totals of dependents[kind][code]', async () => {
    const kind = 'red'
    const code = 'mars'

    try {
      await Shapes.validatePluginOptions({
        dependents: {
          [kind]: {
            [code]: {}
          }
        }
      })
    } catch (err) {
      if (err instanceof InvalidPluginOptionsError) {
        expect(err.message)
          .toEqual(`"dependents.${kind}.${code}.totals" is required`)

        return
      }

      throw err
    }

    Assert.fail('Expected an error')
  })

  it('requires that entity names are not blank', async () => {
    const kind = 'red'
    const code = 'mars'
    const invalid_ent_name = '   '

    try {
      await Shapes.validatePluginOptions({
        dependents: {
          [kind]: {
            [code]: {
              totals: {
                [invalid_ent_name]: {
                  field: '_poll_rating'
                }
              }
            }
          }
        }
      })
    } catch (err) {
      if (err instanceof InvalidPluginOptionsError) {
        expect(err.message).toEqual(
          `"dependents.${kind}.${code}.totals.${invalid_ent_name}"` +
            ' is not allowed'
        )

        return
      }

      throw err
    }

    Assert.fail('Expected an error')
  })

  it('requires that entity values are objects', async () => {
    const kind = 'red'
    const code = 'mars'
    const ent_name = 'sys/poll'

    try {
      await Shapes.validatePluginOptions({
        dependents: {
          [kind]: {
            [code]: {
              totals: {
                [ent_name]: null
              }
            }
          }
        }
      })
    } catch (err) {
      if (err instanceof InvalidPluginOptionsError) {
        expect(err.message).toEqual(
          `"dependents.${kind}.${code}.totals.${ent_name}"` +
            ' must be of type object'
        )

        return
      }

      throw err
    }

    Assert.fail('Expected an error')
  })

  it('requires that entity values include the field param', async () => {
    const kind = 'red'
    const code = 'mars'
    const ent_name = 'sys/poll'

    try {
      await Shapes.validatePluginOptions({
        dependents: {
          [kind]: {
            [code]: {
              totals: {
                [ent_name]: {}
              }
            }
          }
        }
      })
    } catch (err) {
      if (err instanceof InvalidPluginOptionsError) {
        expect(err.message).toEqual(
          `"dependents.${kind}.${code}.totals.${ent_name}.field"` +
            ' is required'
        )

        return
      }

      throw err
    }

    Assert.fail('Expected an error')
  })


  it('requires that the field param not be blank', async () => {
    const kind = 'red'
    const code = 'mars'
    const ent_name = 'sys/poll'
    const invalid_field_name = '    '

    try {
      await Shapes.validatePluginOptions({
        dependents: {
          [kind]: {
            [code]: {
              totals: {
                [ent_name]: {
                  field: invalid_field_name
                }
              }
            }
          }
        }
      })
    } catch (err) {
      if (err instanceof InvalidPluginOptionsError) {
        expect(err.message).toEqual(
          `"dependents.${kind}.${code}.totals.${ent_name}.field"` +
            ' is not allowed to be empty'
        )

        return
      }

      throw err
    }

    Assert.fail('Expected an error')
  })
})

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

