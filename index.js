const Seneca = require('seneca')
const VoteApi = require('./vote')

const app = Seneca()

app.quiet()

app.use(VoteApi, { foo: 'bar' })

app.act('sys:vote,cmd:ping', Seneca.util.print)

