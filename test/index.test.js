const Seneca = require('seneca')
const VotePlugin = require('..')

describe('plugin options', () => {
  it('validates the options', (done) => {
    const seneca = Seneca({ log: 'test' })

    seneca.die = (err) => {
      expect(err instanceof Error).toEqual(true)
      expect(err.message).toMatch(
        'Plugin seneca_vote: option value is not valid'
      )

      done()
    }

    seneca.use(VotePlugin, {
      dependents: { foo: 'bar' },
    })

    seneca.ready(() => {
      return done(new Error('Expected Seneca to terminate with an error.'))
    })
  })
})
