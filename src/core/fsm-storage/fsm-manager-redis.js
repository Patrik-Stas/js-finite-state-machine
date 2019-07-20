const { createStateMachine } = require('../fsm')
const util = require('util')

module.exports.createFsmManagerRedis = function createFsmManagerRedis (definition, redisClient, namespace) {
  const redishset = util.promisify(redisClient.hset).bind(redisClient)
  const redishget = util.promisify(redisClient.hget).bind(redisClient)
  const redishgetall = util.promisify(redisClient.hgetall).bind(redisClient)
  const redisdel = util.promisify(redisClient.del).bind(redisClient)

  async function loadMachine (machineKey) {
    const saveFsm = async (machineData) => {
      const serialized = JSON.stringify(machineData)
      await redishset(`fsm-${namespace}`, `${machineKey}`, serialized)
    }
    const loadFsm = async () => {
      const serialized = await redishget(`fsm-${namespace}`, machineKey)
      return JSON.parse(serialized)
    }

    return createStateMachine(saveFsm, loadFsm, definition)
  }

  async function getAllMachinesData () {
    const loadedMachines = await redishgetall(`fsm-${namespace}`)
    const machinesData = []
    for (const id of Object.keys(loadedMachines)) {
      const machineData = JSON.parse(loadedMachines[id])
      machinesData.push({ machineData, id })
    }
    return machinesData
  }

  async function destroyMachine (machineKey) {
    await redisdel(`fsm-${namespace}`, machineKey)
  }

  return {
    loadMachine,
    getAllMachinesData,
    destroyMachine
  }
}
