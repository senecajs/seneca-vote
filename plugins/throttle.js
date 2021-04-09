const Assert = require('assert-plus')
const { lock } = require('../lib/lock')

function throttle(opts = {}) {
  this.add('sys:throttle,cmd:throttle', async function (msg, reply) {
    await lock(async () => {
      const counter_entity = this.entity('sys/counter')
      const existing_counter = await counter_entity.load$({ tag: '_' })

      const updated_counter = await (async () =>
        existing_counter || counter_entity
          .make$()
          .data$({ tag: '_', value: -1 }))()


      Assert.object(updated_counter, 'updated_counter')

      Assert.number(updated_counter.value, 'updated_counter.value')
      const cur_value = updated_counter.value

      const result = await updated_counter
        .data$({ tag: '_', value: cur_value + 1 })
        .save$()

      return reply(null, result)
    })
  })
}

module.exports = throttle
