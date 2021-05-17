const Assert = require('assert-plus')
const { fetchProp, yesterday } = require('./helpers')

class Fixtures {
  static vote(overrides = {}) {
    return {
      poll_id: 'fake_poll_id',
      voter_id: 'fake_voter_id',
      voter_type: 'sys/user',
      type: 'up',
      created_at: yesterday(),
      ...overrides
    }
  }

  static poll(overrides = {}) {
    return {
      title: 'lorem ipsum',
      created_at: new Date(),
      ...overrides
    }
  }
}

module.exports = Fixtures
