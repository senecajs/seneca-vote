const Seneca = require('seneca')
const ping = require('./plugins/ping')

const app = Seneca()

app.quiet()

app.use(ping, { foo: 'bar' })

app.act('sys:ping,cmd:ping', Seneca.util.print)

