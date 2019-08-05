const util = require('util')

module.exports.createStrategyRedis = function createStrategyRedis (redisClient, namespace) {
  const redishset = util.promisify(redisClient.hset).bind(redisClient)
  const redishget = util.promisify(redisClient.hget).bind(redisClient)
  const redishgetall = util.promisify(redisClient.hgetall).bind(redisClient)
  const redisdel = util.promisify(redisClient.del).bind(redisClient)

  /*
  TODO: Strategy should support simple objects as IDs, this doesn't now
   */
  async function fsmDataSave (fsmId, fsmData) {
    const serialized = JSON.stringify(fsmData)
    await redishset(`fsm-${namespace}`, `${fsmId}`, serialized)
  }

  async function fsmFullLoad (fsmId) {
    const serialized = await redishget(`fsm-${namespace}`, fsmId)
    return serialized ? { fsmData: JSON.parse(serialized), fsmId } : null
  }

  async function fsmExists (machineKey) {
    return !!(await redishget(`fsm-${namespace}`, machineKey))
  }

  async function fsmFullLoadMany (skip = null, limit = null) {
    const loadedMachines = await redishgetall(`fsm-${namespace}`)
    const machinesData = []
    for (const fsmId of Object.keys(loadedMachines)) {
      const fsmData = JSON.parse(loadedMachines[fsmId])
      machinesData.push({ fsmData, fsmId })
    }
    return machinesData
  }

  async function fsmDestroy (machineKey) {
    await redisdel(`fsm-${namespace}`, machineKey)
  }

  return {
    fsmDataSave,
    fsmFullLoad,
    fsmExists,
    fsmFullLoadMany,
    fsmDestroy
  }
}
