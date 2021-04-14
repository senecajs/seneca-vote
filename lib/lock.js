const Fs = require('fs')
const { promisify } = require('util')

// NOTE: There appeared to be some kind of race condition in place
// with the default memory store whenever I tried to bombard
// an idempotent action with requests.
//
// So I thought it would be a good exercise to write a file-based
// lock to solve the problem.
//
// --- lilsweetcaligula
//
async function lock(f, opts = {}) {
  const verbose = opts.verbose || false
  const is_disabled = opts.disabled || false

  if (is_disabled) {
    if (verbose) {
      console.warn('The lock has been declared but disabled.' +
        ' Did you forget to enable it?')
    }

    return f()
  }


  const lockfile = './.lock'

  function keepWaitingOnTheLock(cb) {
    function recur(cb) {
      Fs.promises.writeFile(lockfile, '1', { flag: 'wx' })
        .then(cb)
        .catch(err => {
          if (err.code === 'EEXIST') {
            return recur(cb)
          }

          throw err
        })
    }

    return promisify(recur)()
  }

  await keepWaitingOnTheLock()

  let result

  try {
    result = await f()
  } finally {
    await Fs.promises.unlink(lockfile)
  }

  return result
}

module.exports = { lock }
