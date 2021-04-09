const Seneca = require('seneca')
const entities = require('seneca-entity')
const promisifySeneca = require('seneca-promisify')
const ping = require('./plugins/ping')
const throttle = require('./plugins/throttle')

const app = Seneca()

app.quiet()

app.use(entities)

app.use(promisifySeneca)

app.use(ping, { foo: 'bar' })

app.use(throttle)

app.act('sys:ping,cmd:ping', Seneca.util.print)

for (let times = 0; times < 3; times++) {
  app.act('sys:throttle,cmd:throttle', Seneca.util.print)
}

