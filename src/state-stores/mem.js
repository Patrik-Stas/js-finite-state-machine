const assert = require('assert')

module.exports.createInMemStateStorage = function createInMemStateStorage () {
  let storage = {}

  function set (key, value) {
    assert(typeof value === 'string')
    storage[key] = value
  }

  function get (key) {
    return storage[key]
  }

  function del (key) {
    storage[key] = undefined
  }

  return {
    set,
    get,
    del
  }
}
