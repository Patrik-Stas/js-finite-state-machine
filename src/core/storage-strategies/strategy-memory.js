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

  const fsmDataSave = (fsmId, fsmData) => {
    memKeystore.set(fsmId, fsmData)
  }

  const fsmFullLoad = (fsmId) => {
    const fsmData = memKeystore.get(fsmId)
    if (!fsmData) {
      return null
    }
    return { fsmData, fsmId }
  }

  async function machineExists (fsmId) {
    return !!(await memKeystore.get(fsmId))
  }

  async function fsmDestroy (machineKey) {
    memKeystore.del(machineKey)
  }

  /*
   Returns fsmData of all machines
   */
  async function fsmFullLoadMany (skip = null, limit = null) {
    const fsmIds = memKeystore.getKeys()
    const machines = []
    for (const fsmId in fsmIds) {
      machines.push({ fsmData: memKeystore.get(fsmId), fsmId })
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
