const Seneca = require('seneca')
const VotePlugin = require('..')
const Shapes = require('../lib/shapes')

describe('plugin options', () => {
  it('validates the options', done => {
    spyOn(Shapes, 'validatePluginOptions').and.callThrough()

    const seneca = Seneca({ log: 'test' })

    seneca.use(VotePlugin, {})

    seneca.ready(() => {
      expect(Shapes.validatePluginOptions).toHaveBeenCalled()
      return done()
    })
  })
})

