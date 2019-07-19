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

/*
The machine does not provide race condition guarantees. It's up to user to assure 2 instances of same machine
are not created simultaneously (which might result in multiple conflicting storage writes).
The machine instance persists any state changes to the storage. Machine only load storage data upon creation.
If machine state in memory goes out of sync with data in storage, that would be a problem. If you only work with
1 machine instance at time, that should not happen.

If we implement memory-stateless state-machine and turn this to merely an interface to a
 */
module.exports.createStateMachine = async function createStateMachine (serializeAndSaveFsm, loadAndDeserializeFsm, deleteFsm, fsmDefinition) {
  const defintionWrapper = createFsmDefinitionWrapper(fsmDefinition)
  if (typeof loadAndDeserializeFsm !== 'function' || typeof serializeAndSaveFsm !== 'function' || typeof deleteFsm !== 'function') {
    throw Error('Storage provided to state machine is not defined or is missing get/set functions.')
  }
  if (!await machineExistsInStorage()) {
    const initialMachineState = {
      state: fsmDefinition.initialState,
      transition: null,
      history: []
    }
    await validateAndSave(initialMachineState)
  }

  async function machineExistsInStorage () {
    return !!(await loadAndDeserializeFsm())
  }

  /*
  Persists machine state to storage
  Throw error if data is found to be corrupted.
  Throw error if state has invalid value.
  Throws error if error occurs while persisting state.
  Thows error if loaded machine is found to be transitioning, unless explicitly allowed via expectTransition argument
   */
  async function validateAndSave (machineData) {
    if (!machineData) {
      throw Error(`Can't persist machine data because it's null or undefined.`)
    }
    if (!machineData.state) {
      throw Error(`Can't persist machine data, invalid format. Missing 'state' field.`)
    }
    if (machineData.history === null || machineData.history === undefined) {
      throw Error(`Can't persist machine data, invalid format. Field 'history' is null or undefined..`)
    }
    try {
      assertIsValidState(machineData.state)
    } catch (err) {
      throw Error(`Can't persist machine data, state '${machineData.state}' is not valid state.`)
    }
    try {
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
  async function loadAndValidate (allowToBeInTransition = false) {
    let machineData
    try {
      machineData = await loadAndDeserializeFsm()
    } catch (error) {
      throw Error(`Error loading machine: ${JSON.stringify(error)}`)
    }
    if (!machineData) {
      throw Error(`Error loading machine. Machine not found.`)
    }
    if (!machineData.state) {
      throw Error(`Loaded machine, but data are corrupted. Undefined machine state.`)
    }
    try {
      assertIsValidState(machineData.state)
    } catch (err) {
      throw Error(`Loaded machine but data are corrupted. Machine state '${machineData.state}' is not valid.`)
    }
    if (machineData.history === null || machineData.history === undefined) {
      throw Error(`Loaded machine but data are corrupted. Field 'history' is null or undefined.`)
    }
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
    const machine = await loadAndValidate()
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
    const machine = await loadAndValidate()
    if (machine.transition) {
      throw Error(`Can't determine current state because machine is transitioning.`)
    }
    return machine.state
  }

  /*
  Loads machine, verifies that transition can be executed given current machine state. If transition is possible,
  it sets "transition" value.
  Throws exception if transition can't be done
  Throw exception if error occurs while trying to persist modified the machine
   */
  async function transitionStart (transition) {
    assertIsValidTransititon(transition)
    const machine = await loadAndValidate()
    const fromState = machine.state
    if (await defintionWrapper.isValidTransition(fromState, transition)) {
      machine.transition = transition
      await validateAndSave(machine)
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
    const machine = await loadAndValidate(true)
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
    await validateAndSave(machine)
  }

  async function destroy () {
    await deleteFsm()
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
    const machineData = await loadAndValidate(true)
    return machineData.history
  }

  function getDefinitionWrapper () {
    return defintionWrapper
  }

  async function getMachineData () {
    const machineData = await loadAndValidate(true)
    return { ...machineData }
  }

  return {
    getState,
    transitionStart,
    transitionFinish,
    isInState,
    assertState,
    assertInSomeState,
    getHistory,
    getDefinitionWrapper,
    destroy,
    getMachineData
  }
}
