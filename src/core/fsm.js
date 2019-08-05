/*
Creates state machine.
storage - object with 2 functions get(key) and set(key, value) - for retrieving and setting state by state machine id
definition - definition of machine state and possible transitions
{
  initialState: "a",
  states: {
    "a" : {
      "customField": "customValue"
    }
  },
  transitions: [
    {"from": "a", to: "b" },
    {"from": "b", to: "c" }
  ]
}
When instance of machine is created, getState is called to load up current state. If no state exists, state <initialstate>
is set in storage.
 */
/*
The machine does not provide race condition guarantees. It's up to user to assure 2 instances of same machine
are not created simultaneously (which might result in multiple conflicting storage writes).
The machine instance persists any state changes to the storage. Machine only load storage data upon creation.
If machine state in memory goes out of sync with data in storage, that would be a problem. If you only work with
1 machine instance at time, that should not happen.

We don't introduce any concept of ID on this level of abstraction - why? Because we don't want to put assumptions on
how machines of certain type might be identified. Some machines might be identified by single key. Some might be
identified by multiple keys. Others might be unordered set of keys.
 */

function validateFunctions (serializeAndSaveFsm, loadAndDeserializeFsm, getMachineKey) {
  if (typeof serializeAndSaveFsm !== 'function') {
    throw Error(`serializeAndSaveFsm was expected to be function, but was ${typeof serializeAndSaveFsm}`)
  }
  if (typeof loadAndDeserializeFsm !== 'function') {
    throw Error(`loadAndDeserializeFsm was expected to be function, but was ${typeof loadAndDeserializeFsm}`)
  }
  if (typeof getMachineKey !== 'function') {
    throw Error(`getMachineKey was expected to be function, but was ${typeof getMachineKey}`)
  }
}

/*
Creates new machine instance if machine is found in storage
Throws if machine does not exist in storage
 */
async function loadStateMachine (serializeAndSaveFsm, loadAndDeserializeFsm, getMachineId, fsmDefinitionWrapper) {
  validateFunctions(serializeAndSaveFsm, loadAndDeserializeFsm, getMachineId)
  if (typeof loadAndDeserializeFsm !== 'function' || typeof serializeAndSaveFsm !== 'function') {
    throw Error('Storage provided to state machine is not defined or is missing get/set functions.')
  }
  const key = await getMachineId()
  const foundMachine = await loadAndDeserializeFsm()
  if (foundMachine) {
    if (foundMachine.type !== fsmDefinitionWrapper.type) {
      throw Error(`Was about to load machine ${JSON.stringify(key)}s. Based on provided FSM Definition the machine was expected to be of type '${foundMachine.type}' but in fact was of type '${fsmDefinitionWrapper.type}'.`)
    }
  } else {
    throw Error(`Was creating machine by loading from storage, but machine does not exist.`)
  }
  return spawnStateMachine(serializeAndSaveFsm, loadAndDeserializeFsm, getMachineId, fsmDefinitionWrapper)
}

/*
Creates new machine instance if machine is not found in storage. On creation persist machine in initial state
Throws if machine already exists in storage
 */
async function createStateMachine (serializeAndSaveFsm, loadAndDeserializeFsm, getMachineId, fsmDefinitionWrapper) {
  validateFunctions(serializeAndSaveFsm, loadAndDeserializeFsm, getMachineId)
  if (typeof loadAndDeserializeFsm !== 'function' || typeof serializeAndSaveFsm !== 'function') {
    throw Error('Storage provided to state machine is not defined or is missing get/set functions.')
  }
  const key = await getMachineId()
  const foundMachine = await loadAndDeserializeFsm()
  if (foundMachine) {
    throw Error(`Was about to create new machine '${JSON.stringify(key)}' but machine with such key was already in 
    the storage. This was the found machine: ${JSON.stringify(foundMachine)}!`)
  } else {
    const utime = Date.now()
    await serializeAndSaveFsm({
      machineId: await getMachineId(),
      utimeUpdated: utime,
      utimeCreated: utime,
      type: fsmDefinitionWrapper.type,
      state: fsmDefinitionWrapper.initialState,
      transition: null,
      history: []
    }, true)
  }
  return spawnStateMachine(serializeAndSaveFsm, loadAndDeserializeFsm, getMachineId, fsmDefinitionWrapper)
}

/*
Doesn't check what's in storage. This merely creates object for accessing and manipulating a machine which is
expected to already exist in storage.

It must be that:
if serializeAndSaveFsm(getFsmId, machineData) then
machineData === loadAndDeserializeFsm(getFsmId)
 */
function spawnStateMachine (serializeAndSaveFsm, loadAndDeserializeFsm, getMachineId, fsmDefinitionWrapper) {
  validateFunctions(serializeAndSaveFsm, loadAndDeserializeFsm, getMachineId)

  function validateMachineData (machineData) {
    if (!machineData) {
      throw Error(`Invalid machine data, it's null or undefined.`)
    }
    if (!machineData.state) {
      throw Error(`Invalid machine data. Missing 'state' field.`)
    }
    if (machineData.history === null || machineData.history === undefined) {
      throw Error(`Invalid machine data.  Field 'history' is null or undefined..`)
    }
    try {
      fsmDefinitionWrapper.assertIsValidStateName(machineData.state)
    } catch (err) {
      throw Error(`Invalid machine data. Machine state '${machineData.state}' is not valid against machine definition ${JSON.stringify(fsmDefinition)}.`)
    }
  }

  /*
  Persists machine state to storage
  Throw error if data is found to be corrupted.
  Throw error if state has invalid value.
  Throws error if error occurs while persisting state.
  Thows error if loaded machine is found to be transitioning, unless explicitly allowed via expectTransition argument
   */
  async function saveMachineData (machineData) {
    validateMachineData(machineData)
    try {
      const utime = Date.now()
      machineData.utimeUpdated = utime
      await serializeAndSaveFsm(machineData)
    } catch (err) {
      throw Error(`Can't persist machine because error was thrown while persisting: ${err}\n${err.stack}`)
    }
  }

  /*
  Returns machine data from storage.
  Throws error if error occurs while loading state.
  Throws error if machine is not found in storage
  Throw error if data is found to be corrupted.
  Thows error if loaded machine is found to be transitioning, unless explicitly allowed via expectTransition argument
   */
  async function machineLoadData (allowToBeInTransition = false) {
    let machineData
    try {
      machineData = await loadAndDeserializeFsm()
    } catch (error) {
      throw Error(`Error loading machine: ${JSON.stringify(error)}`)
    }
    validateMachineData(machineData)
    if (!allowToBeInTransition && machineData.transition) {
      throw Error(`Loaded machine and it's found to be transitioning state which was not expected.`)
    }
    return machineData
  }

  /*
  Returns true/false whether machine is currently in the specified state
  Throws if machine is currently transitioning or can't be loaded
   */
  async function isInState (expected) {
    fsmDefinitionWrapper.assertIsValidStateName(expected)
    const machine = await machineLoadData()
    if (machine.transition) {
      return false // machine is not in state, it's in transition
    }
    return expected === machine.state
  }

  /*
  Returns state of machine
  Throws if machine is transitioning
  TODO: We could just return both state and transition and leave it up to user to handle the fact
  that machine is not in one particular state, but in the middle of certain transition
 */
  async function getState () {
    const machine = await machineLoadData()
    if (machine.transition) {
      throw Error(`Can't determine current state because machine is transitioning.`)
    }
    return machine.state
  }

  async function canDoTransition (transition) {
    const machine = await machineLoadData()
    return fsmDefinitionWrapper.isValidTransition(machine.state, transition)
  }

  async function doTransition (transition) {
    fsmDefinitionWrapper.assertIsValidTransitionName(transition)
    const machine = await machineLoadData()
    const fromState = machine.state
    if (await fsmDefinitionWrapper.isValidTransition(fromState, transition)) {
      machine.state = await fsmDefinitionWrapper.getDestinationState(fromState, transition)
      machine.transition = null
      machine.history.push({ state: fromState, transition })
      await saveMachineData(machine)
    } else {
      throw Error(`Transition '${transition}' from current state '${fromState}' is invalid.`)
    }
  }

  /*
  Loads machine, verifies that transition can be executed given current machine state. If transition is possible,
  it sets "transition" value.
  Throws exception if transition can't be done
  Throw exception if error occurs while trying to persist modified the machine
   */
  async function transitionStart (transition) {
    fsmDefinitionWrapper.assertIsValidTransitionName(transition)
    const machine = await machineLoadData()
    const fromState = machine.state
    if (await fsmDefinitionWrapper.isValidTransition(fromState, transition)) {
      machine.transition = transition
      await saveMachineData(machine)
    } else {
      throw Error(`Transition '${transition}' from current state '${fromState}' is invalid.`)
    }
  }

  /*
  Finalizes previously started transition (by successfully calling transitionStart()
  Throw if machine can't be loaded or is found to be invalid
  Throws if machine is not currently transitioning
  Throws if new state can't be determined
  Throws if error occurs persisting machine with updated state
   */
  async function transitionFinish () {
    const machine = await machineLoadData(true)
    if (!machine.transition) {
      throw Error(`Machine is not currently transitioning. There's no transition to be finished.`)
    }
    const newState = await fsmDefinitionWrapper.getDestinationState(machine.state, machine.transition)
    if (!newState) {
      throw Error(`Unexpected error. Failed to finalize transition because it was found to be invalid.`)
    }
    machine.history.push({ state: machine.state, transition: machine.transition })
    machine.state = newState
    machine.transition = null
    await saveMachineData(machine)
  }

  /*
  Throws if machine is not currently in one of the specified states
  Throws if machine is currently transitioning
   */
  async function assertInSomeState (...possible) {
    let wasInSomeOfTheStates = false
    const state = await getState()
    for (let i = 0; i < possible.length; i++) {
      const possibleState = possible[i]
      if (state === possibleState) {
        wasInSomeOfTheStates = true
        break
      }
    }
    if (!wasInSomeOfTheStates) {
      throw Error(`State machine was expected to be in some of states '${JSON.stringify(possible)}', but was '${state}'.`)
    }
  }

  /*
  Throws if machine is not currently in the specified state
  Throws if machine is currently transitioning
   */
  async function assertState (expected) {
    fsmDefinitionWrapper.assertIsValidStateName(expected)
    const actual = await getState()
    if (expected !== actual) {
      throw Error(`State machine was expected to be in state '${expected}', but was in state '${actual}'.`)
    }
  }

  async function getHistory () {
    const machineData = await machineLoadData(true)
    return machineData.history
  }

  function getDefinitionWrapper () {
    return fsmDefinitionWrapper
  }

  async function getMachineData () {
    const machineData = await machineLoadData(true)
    return { ...machineData }
  }

  return {
    getState,
    canDoTransition,
    doTransition,
    transitionStart,
    transitionFinish,
    isInState,
    assertState,
    assertInSomeState,
    getHistory,
    getDefinitionWrapper,
    getMachineData
  }
}

module.exports.loadStateMachine = loadStateMachine
module.exports.createStateMachine = createStateMachine
module.exports.spawnStateMachine = spawnStateMachine
