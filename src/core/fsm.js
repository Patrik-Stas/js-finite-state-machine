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
const { createFsmDefinitionWrapper } = require('./fsm-definition-wrapper')
const assert = require('assert')
/*
The machine does not provide race condition guarantees. It's up to user to assure 2 instances of same machine
are not created simultaneously (which might result in multiple conflicting storage writes).
The machine instance persists any state changes to the storage. Machine only load storage data upon creation.
If machine state in memory goes out of sync with data in storage, that would be a problem. If you only work with
1 machine instance at time, that should not happen.

If we implement memory-stateless state-machine and turn this to merely an interface to a

We don't introduce any concept of ID on this level of abstraction - why? Because we don't want to put assumptions on
how machines of certain type might be identified. Some machines might be identified by single key. Some might be
identified by multiple keys. Others might be unordered set of keys.
 */
module.exports.createStateMachine = async function createStateMachine (serializeAndSaveFsm, loadAndDeserializeFsm, fsmDefinition) {
  const defintionWrapper = createFsmDefinitionWrapper(fsmDefinition)
  if (typeof loadAndDeserializeFsm !== 'function' || typeof serializeAndSaveFsm !== 'function') {
    throw Error('Storage provided to state machine is not defined or is missing get/set functions.')
  }
  assert(!!fsmDefinition)
  const loadedOnInit = await loadAndDeserializeFsm()
  if (loadedOnInit) {
    if (loadedOnInit.type !== fsmDefinition.type) {
      throw Error(`Loaded machine type '${loadedOnInit.type}' but was expecting to find '${fsmDefinition.type}'.`)
    }
  } else {
    await saveMachineData({
      type: fsmDefinition.type,
      state: fsmDefinition.initialState,
      transition: null,
      history: []
    }, true)
  }

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
      assertIsValidState(machineData.state)
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
  async function saveMachineData (machineData, isNew = false) {
    validateMachineData(machineData)
    try {
      const utime = Date.now()
      machineData.utimeUpdated = utime
      if (isNew) {
        machineData.utimeCreated = utime
      }
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
  async function loadMachineData (allowToBeInTransition = false) {
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
    assertIsValidState(expected)
    const machine = await loadMachineData()
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
    const machine = await loadMachineData()
    if (machine.transition) {
      throw Error(`Can't determine current state because machine is transitioning.`)
    }
    return machine.state
  }

  async function canDoTransition (transition) {
    const machine = await loadMachineData()
    return defintionWrapper.isValidTransition(machine.state, transition)
  }

  async function doTransition (transition) {
    assertIsValidTransititon(transition)
    const machine = await loadMachineData()
    const fromState = machine.state
    if (await defintionWrapper.isValidTransition(fromState, transition)) {
      const { name: newState } = await defintionWrapper.getStateAfterTransition(fromState, transition)
      machine.state = newState
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
    assertIsValidTransititon(transition)
    const machine = await loadMachineData()
    const fromState = machine.state
    if (await defintionWrapper.isValidTransition(fromState, transition)) {
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
    const machine = await loadMachineData(true)
    if (!machine.transition) {
      throw Error(`Machine is not currently transitioning. There's no transition to be finished.`)
    }
    const { name: newState } = await defintionWrapper.getStateAfterTransition(machine.state, machine.transition)
    if (!newState) {
      throw Error(`Unexpected error. Transition fails to finalize because new state '${newState}' can't be resolved.`)
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
    assertIsValidState(expected)
    const actual = await getState()
    if (expected !== actual) {
      throw Error(`State machine was expected to be in state '${expected}', but was in state '${actual}'.`)
    }
  }

  function assertIsValidTransititon (transition) {
    const stateDefinition = defintionWrapper.findTransitionsByName(transition)
    if (stateDefinition.length === 0) {
      throw Error(`Unknown transition '${transition}'.`)
    }
  }

  function assertIsValidState (state) {
    const stateDefinition = defintionWrapper.findStateDefinitionByName(state)
    if (!stateDefinition) {
      throw Error(`State machine got queried for unknown state '${state}'. Known states: ${JSON.stringify(Object.keys(fsmDefinition.states))}`)
    }
  }

  async function getHistory () {
    const machineData = await loadMachineData(true)
    return machineData.history
  }

  function getDefinitionWrapper () {
    return defintionWrapper
  }

  async function getMachineData () {
    const machineData = await loadMachineData(true)
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
