const Assert = require('assert-plus')
const Seneca = require('seneca')
const Entities = require('seneca-entity')
const SenecaPromisify = require('seneca-promisify')
const SenecaMsgTest = require('seneca-msg-test')
const Joi = SenecaMsgTest.Joi
const VotePlugin = require('../')

describe('message-level tests', () => {
  let seneca

  beforeEach(() => {
    seneca = Seneca({ log: 'test' })
      .use(Entities)
      .use(SenecaPromisify)
      .use(VotePlugin)
  })

  function senecaUnderTest(seneca, cb) {
    return seneca.test(cb)
  }

  const poll_id = 'abcpoll123'


  let test_spec

  beforeEach(() => {
    test_spec = {
      print: false,
      pattern: 'sys:vote',
      data: {
        sys: {
          poll: {
            // TODO: Use shapes to validate the shape of a poll record.
            //
            [poll_id]: {
              id: poll_id,
              title: 'Best hairline of the Ist century A.D.',
              created_at: '2021-04-14T01:02:00.765Z'
            }
          }
        }
      },
      calls: [
        upvoteWhenSomeParamsAreMissing(),
        upvoteWhenSuccessful({ poll_id }),
        upvoteWhenClientRequestedToSaveThePollRating({ poll_id }),
        upvoteWhenPollDoesNotExist(),
        downvoteWhenSomeParamsAreMissing(),
        downvoteWhenSuccessful({ poll_id }),
        downvoteWhenClientRequestedToSaveThePollRating({ poll_id }),
        downvoteWhenPollDoesNotExist(),
        getPollWhenPollIdParamIsMissing(),
        getPollWhenSuccessful({ poll_id }),
        getPollWhenPollDoesNotExist(),
        openPollWhenSomeParamsAreMissing(),
        openPollWhenAPollWithTheGivenTitleAlreadyExists({ poll_id }),
        openPollWhenAPollWithTheGivenTitleDoesNotExist()
      ]
    }
  })

  it('is ok', done => {
    const seneca_under_test = senecaUnderTest(seneca, done)
    const runMsgTest = SenecaMsgTest(seneca_under_test, test_spec)

    runMsgTest().then(done).catch(done)
  })
})


function upvoteWhenSomeParamsAreMissing() {
  return {
    pattern: 'vote:up',
    params: {},
    out: {
      ok: false,
      why: 'invalid-field',
      details: {
        path: ['fields'],
        why_exactly: 'required'
      }
    }
  }
}

function upvoteWhenSuccessful(args = {}) {
  Assert.object(args, 'args')
  const poll_id = args.poll_id

  return {
    pattern: 'vote:up',
    params: {
      fields: {
        poll_id,
        voter_id: 'bar',
        voter_type: 'sys/user',
        kind: 'red',
        code: 'mars'
      }
    },
    out: {
      ok: true,
      data: {
        poll_stats: { num_upvotes: 1, num_downvotes: 0, num_total: 1 }
      }
    }
  }
}

function upvoteWhenClientRequestedToSaveThePollRating(args = {}) {
  Assert.object(args, 'args')
  const poll_id = args.poll_id

  return {
    pattern: 'vote:up',
    params: {
      fields: {
        poll_id,
        voter_id: 'bar',
        voter_type: 'sys/user',
        kind: 'red',
        code: 'mars'
      },
      dependents: { 'sys/poll': poll_id }
    },
    out: {
      ok: true,
      data: {
        poll_stats: { num_upvotes: 1, num_downvotes: 0, num_total: 1 }
      }
    }
  }
}

function upvoteWhenPollDoesNotExist() {
  return {
    pattern: 'vote:up',
    params: {
      fields: {
        poll_id: 'does_not_exist',
        voter_id: 'bar',
        voter_type: 'sys/user',
        kind: 'red',
        code: 'mars'
      }
    },
    out: {
      ok: false,
      why: 'not-found',
      details: {
        what: 'poll'
      }
    }
  }
}

function downvoteWhenSomeParamsAreMissing() {
  return {
    pattern: 'vote:down',
    params: {},
    out: {
      ok: false,
      why: 'invalid-field',
      details: {
        path: ['fields'],
        why_exactly: 'required'
      }
    }
  }
}

function downvoteWhenSuccessful(args = {}) {
  Assert.object(args, 'args')
  const poll_id = args.poll_id

  return {
    pattern: 'vote:down',
    params: {
      fields: {
        poll_id,
        voter_id: 'bar',
        voter_type: 'sys/user',
        kind: 'red',
        code: 'mars'
      }
    },
    out: {
      ok: true,
      data: {
        poll_stats: { num_upvotes: 0, num_downvotes: 1, num_total: -1 }
      }
    }
  }
}

function downvoteWhenClientRequestedToSaveThePollRating(args = {}) {
  Assert.object(args, 'args')
  const poll_id = args.poll_id

  return {
    pattern: 'vote:down',
    params: {
      fields: {
        poll_id,
        voter_id: 'bar',
        voter_type: 'sys/user',
        kind: 'red',
        code: 'mars'
      },
      dependents: { 'sys/poll': poll_id }
    },
    out: {
      ok: true,
      data: {
        poll_stats: { num_upvotes: 0, num_downvotes: 1, num_total: -1 }
      }
    }
  }
}

function downvoteWhenPollDoesNotExist() {
  return {
    pattern: 'vote:down',
    params: {
      fields: {
        poll_id: 'does_not_exist',
        voter_id: 'bar',
        voter_type: 'sys/user',
        kind: 'red',
        code: 'mars'
      }
    },
    out: {
      ok: false,
      why: 'not-found',
      details: {
        what: 'poll'
      }
    }
  }
}

function getPollWhenPollIdParamIsMissing() {
  return {
    pattern: 'get:poll',
    params: {},
    out: {
      ok: false,
      why: 'invalid-field'
    }
  }
}

function getPollWhenSuccessful(args = {}) {
  Assert.object(args, 'args')
  const poll_id = args.poll_id

  return {
    pattern: 'get:poll',
    params: { poll_id },
    out: {
      ok: true,
      data: {
        poll: {
          id: poll_id,
          title: 'Best hairline of the Ist century A.D.',
          created_at: '2021-04-14T01:02:00.765Z'
        }
      }
    }
  }
}

function getPollWhenPollDoesNotExist() {
  return {
    pattern: 'get:poll',
    params: { poll_id: 'does_not_exist' },
    out: {
      ok: false,
      why: 'not-found'
    }
  }
}

function openPollWhenSomeParamsAreMissing() {
  return {
    pattern: 'open:poll',
    params: {},
    out: {
      ok: false,
      why: 'invalid-field'
    }
  }
}

function openPollWhenAPollWithTheGivenTitleAlreadyExists(args = {}) {
  Assert.object(args, 'args')
  const poll_id = args.poll_id

  return {
    pattern: 'open:poll',
    params: {
      fields: {
        title: 'Best hairline of the Ist century A.D.'
      }
    },
    out: {
      ok: true,
      data: {
        poll: {
          id: poll_id,
          title: 'Best hairline of the Ist century A.D.',
          created_at: '2021-04-14T01:02:00.765Z'
        }
      }
    }
  }
}

function openPollWhenAPollWithTheGivenTitleDoesNotExist() {
  return {
    pattern: 'open:poll',
    params: {
      fields: {
        title: 'Lorem Ipsum Dolor Sit Amet',
      }
    },
    out: {
      ok: true,
      data: {
        poll: {
          id: Joi.string().required(),
          title: 'Lorem Ipsum Dolor Sit Amet',
          created_at: Joi.date().iso().required()
        }
      }
    }
  }
}

