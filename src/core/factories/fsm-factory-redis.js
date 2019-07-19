const { createStateMachine } = require('../fsm')
const util = require('util')

module.exports.createInRedisMachineGenerator = function createInRedisMachineGenerator (definition, redisClient) {
  const redishset = util.promisify(redisClient.hset).bind(redisClient)
  const redishget = util.promisify(redisClient.hget).bind(redisClient)
  const redisdel = util.promisify(redisClient.del).bind(redisClient)

  async function build (machineKey) {
    const saveFsm = async (machineData) => {
      const serialized = JSON.stringify(machineData)
      await redishset(machineKey, 'fsm', serialized)
    }
    const loadFsm = async () => {
      const serialized = await redishget(machineKey, 'fsm')
      return JSON.parse(serialized)
    }
    const deleteFsm = async () => {
      redisdel(machineKey, 'fsm')
    }
    return createStateMachine(saveFsm, loadFsm, deleteFsm, definition)
  }

  return build
}
