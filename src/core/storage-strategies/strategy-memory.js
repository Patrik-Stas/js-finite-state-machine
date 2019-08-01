module.exports.createMemKeystore = function createMemKeystore () {
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
module.exports.createStrategyMemory = function createStrategyMemory (memKeystore) {
  const machineSave = (machineId, machineData) => {
    memKeystore.set(machineId, machineData)
  }

  const machineLoad = (machineId) => {
    return memKeystore.get(machineId)
  }

  async function machineExists (machineId) {
    return !!(await memKeystore.get(machineId))
  }

  async function machineDestroy (machineKey) {
    memKeystore.del(machineKey)
  }

  /*
   Returns machineData of all machines
   */
  async function machinesLoadAll () {
    const machineIds = memKeystore.getKeys()
    const machines = []
    for (const id in machineIds) {
      machines.push({ machineData: memKeystore.get(id), id })
    }
    return machines
  }

  return {
    machineSave,
    machineLoad,
    machineExists,
    machinesLoadAll,
    machineDestroy
  }
}
