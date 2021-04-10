const Seneca = require('seneca')
const Entities = require('seneca-entity')
const SenecaPromisify = require('seneca-promisify')
const GetPoll = require('./actions/get_poll')
const OpenPoll = require('./actions/open_poll')

const app = Seneca()

// TODO: The quite mode is only meant for debugging purposes.
// Please remove prior to the MVP.
//
app.quiet()

app.use(Entities)

app.use(SenecaPromisify)

app.use(OpenPoll)

app.use(GetPoll)

