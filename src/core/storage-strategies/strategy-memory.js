function createMemKeystore () {
  let storage = {}

  function set (key, value) {
    storage[key] = value
  }

  function get (key) {
    return storage[key]
  }

  function del (key) {
    delete storage[key]
  }

  function getKeys () {
    return storage
  }

  return {
    set,
    get,
    del,
    getKeys
  }
}

/*
The simplest persistence adapter implementation which is using a keyvalue storage (like the memory implementation above)
to persist the machine data. Machines are identified by single ID string.
 */
function createStrategyMemory (memKeystore) {
  if (!memKeystore) {
    memKeystore = createMemKeystore()
  }

  const fsmDataSave = (machineId, fsmData) => {
    memKeystore.set(machineId, fsmData)
  }

  const fsmFullLoad = (machineId) => {
    const fsmData = memKeystore.get(machineId)
    if (!fsmData) {
      return null
    }
    return { fsmData, machineId }
  }

  async function machineExists (machineId) {
    return !!(await memKeystore.get(machineId))
  }

  async function fsmDestroy (machineKey) {
    memKeystore.del(machineKey)
  }

  /*
   Returns fsmData of all machines
   */
  async function fsmFullLoadMany (skip = null, limit = null) {
    const machineIds = memKeystore.getKeys()
    const machines = []
    for (const machineId in machineIds) {
      machines.push({ fsmData: memKeystore.get(machineId), machineId })
    }
    return machines
  }

  return {
    fsmDataSave,
    fsmFullLoad,
    machineExists,
    fsmFullLoadMany,
    fsmDestroy
  }
}

module.exports.createMemKeystore = createMemKeystore
module.exports.createStrategyMemory = createStrategyMemory
