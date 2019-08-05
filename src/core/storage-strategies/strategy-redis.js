const util = require('util')

module.exports.createStrategyRedis = function createStrategyRedis (redisClient, namespace) {
  const redishset = util.promisify(redisClient.hset).bind(redisClient)
  const redishget = util.promisify(redisClient.hget).bind(redisClient)
  const redishgetall = util.promisify(redisClient.hgetall).bind(redisClient)
  const redisdel = util.promisify(redisClient.del).bind(redisClient)

  /*
  TODO: Strategy should support simple objects as IDs, this doesn't now
   */
  async function fsmDataSave (machineId, fsmData) {
    const serialized = JSON.stringify(fsmData)
    await redishset(`fsm-${namespace}`, `${machineId}`, serialized)
  }

  async function fsmFullLoad (machineId) {
    const serialized = await redishget(`fsm-${namespace}`, machineId)
    return serialized ? { fsmData: JSON.parse(serialized), machineId } : null
  }

  async function machineExists (machineKey) {
    return !!(await redishget(`fsm-${namespace}`, machineKey))
  }

  async function fsmFullLoadMany (skip = null, limit = null) {
    const loadedMachines = await redishgetall(`fsm-${namespace}`)
    const machinesData = []
    for (const id of Object.keys(loadedMachines)) {
      const fsmData = JSON.parse(loadedMachines[id])
      machinesData.push({ fsmData, id })
    }
    return machinesData
  }

  async function fsmDestroy (machineKey) {
    await redisdel(`fsm-${namespace}`, machineKey)
  }

  return {
    fsmDataSave,
    fsmFullLoad,
    machineExists,
    fsmFullLoadMany,
    fsmDestroy
  }
}
