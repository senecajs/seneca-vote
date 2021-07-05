const Assert = require('assert-plus')
const Seneca = require('seneca')
const Entities = require('seneca-entity')
const SenecaPromisify = require('seneca-promisify')
const SenecaMsgTest = require('seneca-msg-test')
const Joi = SenecaMsgTest.Joi
const VotePlugin = require('../')

describe('message tests for general behavior', () => {
  let seneca

  beforeAll(() => {
    seneca = makeSeneca()
  })

  const poll_id = 'abcpoll123'
  const downvoted_poll_id = 'defpoll234'
  const upvoted_poll_id = 'ghipoll345'

  const vote_kind = 'red'
  const vote_code = 'mars'

  const voter_id = 'xp1960'
  const upvote_id = 'y7t5hs'

  let test_spec

  beforeAll(() => {
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
            },
            [upvoted_poll_id]: {
              id: upvoted_poll_id,
              title: 'Favorite Roman civil war',
              created_at: '2021-07-05T00:00:00.765Z'
            }
          },
          vote: {
            [upvote_id]: {
              id: upvote_id,
              poll_id: upvoted_poll_id,
              voter_id: voter_id,
              voter_type: 'sys/user',
              type: 'up',
              kind: vote_kind,
              code: vote_code,
              created_at: '2021-07-06T00:00:00.765Z',
              undone_at: null
            },
            [upvote_id]: {
              id: upvote_id,
              poll_id: upvoted_poll_id,
              voter_id: voter_id,
              voter_type: 'sys/user',
              type: 'up',
              kind: vote_kind,
              code: vote_code,
              created_at: '2021-07-06T00:00:00.765Z',
              undone_at: null
            }
          }
        }
      },
      calls: [
        upvoteWhenSomeParamsAreMissing(),
        upvoteWhenSuccessful({ poll_id }),
        upvoteWhenClientRequestedToSaveThePollRating({ poll_id }),
        downvoteWhenSomeParamsAreMissing(),
        downvoteWhenSuccessful({ poll_id }),
        downvoteWhenClientRequestedToSaveThePollRating({ poll_id }),
        undoWhenSomeParamsAreMissing(),
        undoWhenNotPreviouslyVoted({ poll_id }),

        undoUpvoteWhenSuccessful({
          poll_id: upvoted_poll_id,
          voter_id,
          vote_kind,
          vote_code
        }),

        undoDownvoteWhenSuccessful({
          poll_id: downvoted_poll_id,
          voter_id,
          vote_kind,
          vote_code
        }),

        getPollWhenPollIdParamIsMissing(),
        getPollWhenSuccessful({ poll_id }),
        getPollWhenPollDoesNotExist(),
        openPollWhenSomeParamsAreMissing(),
        openPollWhenAPollWithTheGivenTitleAlreadyExists({ poll_id }),
        openPollWhenAPollWithTheGivenTitleDoesNotExist()
      ]
    }
  })

  it('is ok', (done) => {
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
        why_exactly: 'required',
      },
    },
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
        code: 'mars',
      },
    },
    out: {
      ok: true,
      data: {
        poll_stats: { num_upvotes: 1, num_downvotes: 0, num_total: 1 },
      },
    },
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
        code: 'mars',
      },
      dependents: { 'sys/poll': poll_id },
    },
    out: {
      ok: true,
      data: {
        poll_stats: { num_upvotes: 1, num_downvotes: 0, num_total: 1 },
      },
    },
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
        why_exactly: 'required',
      },
    },
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
        code: 'mars',
      },
    },
    out: {
      ok: true,
      data: {
        poll_stats: { num_upvotes: 0, num_downvotes: 1, num_total: -1 },
      },
    },
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
        code: 'mars',
      },
      dependents: { 'sys/poll': poll_id },
    },
    out: {
      ok: true,
      data: {
        poll_stats: { num_upvotes: 0, num_downvotes: 1, num_total: -1 },
      },
    },
  }
}

function undoWhenSomeParamsAreMissing() {
  return {
    pattern: 'vote:undo',
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

function undoUpvoteWhenSuccessful(args = {}) {
  Assert.object(args, 'args')

  const { poll_id, voter_id, vote_kind, vote_code } = args

  return {
    pattern: 'vote:undo',
    params: {
      fields: {
        poll_id,
        voter_id,
        kind: vote_kind,
        code: vote_code,
        voter_type: 'sys/user'
      },
    },
    out: {
      ok: true,
      data: {
        poll_stats: { num_upvotes: 0, num_downvotes: 0, num_total: 0 }
      }
    }
  }
}

function undoDownvoteWhenSuccessful(args = {}) {
  Assert.object(args, 'args')

  const { poll_id, voter_id, vote_kind, vote_code } = args

  return {
    pattern: 'vote:undo',
    params: {
      fields: {
        poll_id,
        voter_id,
        kind: vote_kind,
        code: vote_code,
        voter_type: 'sys/user'
      },
    },
    out: {
      ok: true,
      data: {
        poll_stats: { num_upvotes: 0, num_downvotes: 0, num_total: 0 }
      }
    }
  }
}

function undoWhenNotPreviouslyVoted(args = {}) {
  Assert.object(args, 'args')
  const { poll_id } = args

  return {
    pattern: 'vote:undo',
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
        poll_stats: { num_upvotes: 0, num_downvotes: 0, num_total: 0 }
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
      why: 'invalid-field',
    },
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
          created_at: '2021-04-14T01:02:00.765Z',
        },
      },
    },
  }
}

function getPollWhenPollDoesNotExist() {
  return {
    pattern: 'get:poll',
    params: { poll_id: 'does_not_exist' },
    out: {
      ok: false,
      why: 'not-found',
    },
  }
}

function openPollWhenSomeParamsAreMissing() {
  return {
    pattern: 'open:poll',
    params: {},
    out: {
      ok: false,
      why: 'invalid-field',
    },
  }
}

function openPollWhenAPollWithTheGivenTitleAlreadyExists(args = {}) {
  Assert.object(args, 'args')
  const poll_id = args.poll_id

  return {
    pattern: 'open:poll',
    params: {
      fields: {
        title: 'Best hairline of the Ist century A.D.',
      },
    },
    out: {
      ok: true,
      data: {
        poll: {
          id: poll_id,
          title: 'Best hairline of the Ist century A.D.',
          created_at: '2021-04-14T01:02:00.765Z',
        },
      },
    },
  }
}

function openPollWhenAPollWithTheGivenTitleDoesNotExist() {
  return {
    pattern: 'open:poll',
    params: {
      fields: {
        title: 'Lorem Ipsum Dolor Sit Amet',
      },
    },
    out: {
      ok: true,
      data: {
        poll: {
          id: Joi.string().required(),
          title: 'Lorem Ipsum Dolor Sit Amet',
          created_at: Joi.date().iso().required(),
        },
      },
    },
  }
}

function makeSeneca() {
  return Seneca({ log: 'test' })
    .use(Entities)
    .use(SenecaPromisify)
    .use(VotePlugin)
}

function senecaUnderTest(seneca, cb) {
  return seneca.test(cb)
}

