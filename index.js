const Seneca = require('seneca')
const entities = require('seneca-entity')
const promisifySeneca = require('seneca-promisify')
const ping = require('./plugins/ping')
const incrementCounter = require('./plugins/increment_counter')

const app = Seneca()

app.quiet()

app.use(entities)

app.use(promisifySeneca)

app.use(ping, { foo: 'bar' })

app.use(incrementCounter)

app.act('sys:ping,cmd:ping', Seneca.util.print)

for (let times = 0; times < 3; times++) {
  app.act('sys:counter,cmd:inc', Seneca.util.print)
}

