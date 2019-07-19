const { createStateMachine } = require('../fsm')
const util = require('util')

module.exports.createInMongoMachineGenerator = function createInMongoMachineGenerator (definition, collection) {
  const updateOne = util.promisify(collection.updateOne).bind(collection)

  async function build (machineKey) {
    const saveFsm = async function saveFsm (machineData) {
      machineData['_id'] = machineKey
      return updateOne({ '_id': machineKey }, { $set: machineData }, { upsert: true, returnOriginal: false })
    }
    const loadFsm = async function loadFsm () {
      return collection.findOne({ '_id': machineKey })
    }
    const deleteFsm = async function deleteFsm () {
      collection.deleteOne({ '_id': machineKey })
    }
    return createStateMachine(saveFsm, loadFsm, deleteFsm, definition)
  }

  return build
}
