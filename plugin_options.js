const Assert = require('assert-plus')

class PluginOptions {
  static areLocksDisabled(plugin_opts) {
    Assert.object(plugin_opts)

    if ('locks_disabled' in plugin_opts) {
      return Boolean(plugin_opts.locks_disabled)
    }

    return true
  }
}

module.exports = PluginOptions
