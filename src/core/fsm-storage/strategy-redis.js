const util = require('util')
const { spawnStateMachine } = require('../fsm')
const { createStateMachine } = require('../fsm')
const { loadStateMachine } = require('../fsm')

module.exports.createFsmManagerRedis = function createFsmManagerRedis (fsmDefinition, redisClient, namespace) {
  const redishset = util.promisify(redisClient.hset).bind(redisClient)
  const redishget = util.promisify(redisClient.hget).bind(redisClient)
  const redishgetall = util.promisify(redisClient.hgetall).bind(redisClient)
  const redisdel = util.promisify(redisClient.del).bind(redisClient)

  function generateStorageMethods (machineKey) {
    const getFsmId = () => {
      return machineKey
    }

    const saveFsm = async (machineData) => {
      const serialized = JSON.stringify(machineData)
      await redishset(`fsm-${namespace}`, `${machineKey}`, serialized)
    }
    const loadFsm = async () => {
      const serialized = await redishget(`fsm-${namespace}`, machineKey)
      return JSON.parse(serialized)
    }

    return {
      saveFsm,
      loadFsm,
      getFsmId
    }
  }

  /*
  Returns true if machine exists
  Returns false if machine does not exist
   */
  async function machineExists (machineKey) {
    return redishget(`fsm-${namespace}`, machineKey)
  }

  async function loadMachine (machineId) {
    const exists = await machineExists(machineId)
    if (!exists) {
      throw Error(`Machine ${JSON.stringify(machineId)} does not exist.`)
    }
    const { saveFsm, loadFsm, getFsmId } = generateStorageMethods(machineId)
    return loadStateMachine(saveFsm, loadFsm, getFsmId, fsmDefinition)
  }

  async function createMachine (machineId) {
    const exists = await machineExists(machineId)
    if (exists) {
      throw Error(`Machine ${JSON.stringify(machineId)} already exist.`)
    }
    const { saveFsm, loadFsm, getFsmId } = generateStorageMethods(machineId)
    return createStateMachine(saveFsm, loadFsm, getFsmId, fsmDefinition)
  }

  async function spawnMachine (machineId) {
    const exists = await machineExists(machineId)
    if (exists) {
      throw Error(`Machine ${JSON.stringify(machineId)} already exist.`)
    }
    const { saveFsm, loadFsm, getFsmId } = generateStorageMethods(machineId)
    return spawnStateMachine(saveFsm, loadFsm, getFsmId, fsmDefinition)
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
    spawnMachine,
    getAllMachinesData,
    destroyMachine
  }
}
