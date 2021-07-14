const Assert = require('assert-plus')
const Faker = require('faker')
const { yesterday } = require('./helpers')

class Fixtures {
  static vote(overrides = {}) {
    return {
      poll_id: Faker.random.alphaNumeric(8),
      voter_id: Faker.random.alphaNumeric(8),
      voter_type: 'sys/user',
      type: eitherOf(['up', 'down']),
      kind: Faker.random.alphaNumeric(8),
      code: Faker.random.alphaNumeric(8),
      created_at: yesterday(),
      undone_at: null,
      ...overrides
    }
  }

  static poll(overrides = {}) {
    return {
      title: Faker.lorem.sentence(),
      created_at: new Date(),
      ...overrides
    }
  }
}

function eitherOf(ary) {
  Assert.array(ary, 'ary')
  Assert(ary.length > 0, 'nothing to choose from')

  const rand = Math.random() * ary.length

  return ary[Math.floor(rand)]
}

module.exports = Fixtures
