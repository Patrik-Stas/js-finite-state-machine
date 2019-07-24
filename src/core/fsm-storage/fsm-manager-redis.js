const { spawnStateMachine } = require('../fsm')
const util = require('util')

module.exports.createFsmManagerRedis = function createFsmManagerRedis (definition, redisClient, namespace) {
  const redishset = util.promisify(redisClient.hset).bind(redisClient)
  const redishget = util.promisify(redisClient.hget).bind(redisClient)
  const redishgetall = util.promisify(redisClient.hgetall).bind(redisClient)
  const redisdel = util.promisify(redisClient.del).bind(redisClient)

  async function _generateMachineInstance (machineKey) {
    const saveFsm = async (machineData) => {
      const serialized = JSON.stringify(machineData)
      await redishset(`fsm-${namespace}`, `${machineKey}`, serialized)
    }
    const loadFsm = async () => {
      const serialized = await redishget(`fsm-${namespace}`, machineKey)
      return JSON.parse(serialized)
    }

    return spawnStateMachine(saveFsm, loadFsm, definition)
  }

  /*
  Returns true if machine exists
  Returns false if machine does not exist
   */
  async function machineExists (machineKey) {
    return redishget(`fsm-${namespace}`, machineKey)
  }

  /*
  Creates closure representing the machine.
  Throws if machine does not already exists.
   */
  async function loadMachine (machineKey) {
    const exists = await machineExists(machineKey)
    if (!exists) {
      throw Error(`Machine ${machineKey} does not exist.`)
    }
    return _generateMachineInstance(machineKey)
  }

  /*
  Creates closure representing the machine.
  Throws if machine already exists
   */
  async function createMachine (machineKey) {
    const exists = await machineExists(machineKey)
    if (exists) {
      throw Error(`Machine ${machineKey} already exist.`)
    }
    return _generateMachineInstance(machineKey)
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
    createMachine,
    loadMachine,
    getAllMachinesData,
    destroyMachine
  }
}
