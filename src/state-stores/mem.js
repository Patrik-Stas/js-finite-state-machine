const assert = require('assert')

module.exports.createInMemStateStorage = function createInMemStateStorage () {
  let storage = {}

  function set (key, stateMachine) {
    assert(typeof value === 'string')
    storage[key] = stateMachine.serialize()
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
