const util = require('util')

module.exports.createStrategyRedis = function createStrategyRedis (redisClient, namespace) {
  const redishset = util.promisify(redisClient.hset).bind(redisClient)
  const redishget = util.promisify(redisClient.hget).bind(redisClient)
  const redishgetall = util.promisify(redisClient.hgetall).bind(redisClient)
  const redisdel = util.promisify(redisClient.del).bind(redisClient)

  async function machineSave (machineKey, machineData) {
    const serialized = JSON.stringify(machineData)
    await redishset(`fsm-${namespace}`, `${machineKey}`, serialized)
  }

  async function machineLoad (machineKey) {
    const serialized = await redishget(`fsm-${namespace}`, machineKey)
    return JSON.parse(serialized)
  }

  async function machineExists (machineKey) {
    return !!(await redishget(`fsm-${namespace}`, machineKey))
  }

  async function machinesLoadAll () {
    const loadedMachines = await redishgetall(`fsm-${namespace}`)
    const machinesData = []
    for (const id of Object.keys(loadedMachines)) {
      const machineData = JSON.parse(loadedMachines[id])
      machinesData.push({ machineData, id })
    }
    return machinesData
  }

  async function machineDestroy (machineKey) {
    await redisdel(`fsm-${namespace}`, machineKey)
  }

  return {
    machineSave,
    machineLoad,
    machineExists,
    machinesLoadAll,
    machineDestroy
  }
}
