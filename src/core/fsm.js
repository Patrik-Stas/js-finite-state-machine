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

function validateFunctions (saveFsmDataData, loadFsmFullFull) {
  if (typeof saveFsmDataData !== 'function') {
    throw Error(`serializeAndsaveFsmData was expected to be function, but was ${typeof saveFsmDataData}`)
  }
  if (typeof loadFsmFullFull !== 'function') {
    throw Error(`loadAndDeserializeFsm was expected to be function, but was ${typeof loadFsmFullFull}`)
  }
}

/*
Creates new machine instance if machine is found in storage
Throws if machine does not exist in storage
 */
async function loadStateMachine (saveFsmDataData, loadFsmFullFull, fsmDefinitionWrapper) {
  validateFunctions(saveFsmDataData, loadFsmFullFull)
  if (typeof loadFsmFullFull !== 'function' || typeof saveFsmDataData !== 'function') {
    throw Error('Storage provided to state machine is not defined or is missing get/set functions.')
  }
  const fsm = await loadFsmFullFull()
  if (fsm) {
    if (fsm.fsmData.type !== fsmDefinitionWrapper.type) {
      throw Error(`Was about to load machine ${JSON.stringify(fsm.fsmId)}s. Based on provided FSM Definition the machine was expected to be of type '${fsm.type}' but in fact was of type '${fsmDefinitionWrapper.type}'.`)
    }
  } else {
    throw Error(`Was creating machine by loading from storage, but machine does not exist.`)
  }
  return spawnStateMachine(saveFsmDataData, loadFsmFullFull, fsmDefinitionWrapper)
}

/*
Creates new machine instance if machine is not found in storage. On creation persist machine in initial state
Throws if machine already exists in storage
 */
async function createStateMachine (saveFsmDataData, loadFsmFullFull, fsmDefinitionWrapper) {
  validateFunctions(saveFsmDataData, loadFsmFullFull)
  if (typeof loadFsmFullFull !== 'function' || typeof saveFsmDataData !== 'function') {
    throw Error('Storage provided to state machine is not defined or is missing get/set functions.')
  }
  const fsm = await loadFsmFullFull()
  if (fsm) {
    throw Error(`Was about to create new machine '${JSON.stringify(fsm.fsmId)}' but machine with such key was already in 
    the storage. This was the found machine: ${JSON.stringify(fsm)}!`)
  } else {
    const utime = Date.now()
    await saveFsmDataData({
      utimeUpdated: utime,
      utimeCreated: utime,
      type: fsmDefinitionWrapper.type,
      state: fsmDefinitionWrapper.initialState,
      transition: null,
      history: []
    }, true)
  }
  return spawnStateMachine(saveFsmDataData, loadFsmFullFull, fsmDefinitionWrapper)
}

/*
Doesn't check what's in storage. This merely creates object for accessing and manipulating a machine which is
expected to already exist in storage.

It must be that:
if serializeAndsaveFsmData(getFsmId, fsmData) then
fsmData === loadAndDeserializeFsm(getFsmId)
 */
function spawnStateMachine (saveFsmDataData, loadFsmFullFull, fsmDefinitionWrapper) {
  validateFunctions(saveFsmDataData, loadFsmFullFull)

  function validateFsmData (fsmData) {
    if (!fsmData) {
      throw Error(`Invalid machine data, it's null or undefined.`)
    }
    if (!fsmData.state) {
      throw Error(`Invalid machine data. Missing 'state' field.`)
    }
    if (fsmData.history === null || fsmData.history === undefined) {
      throw Error(`Invalid machine data.  Field 'history' is null or undefined..`)
    }
    try {
      fsmDefinitionWrapper.assertIsValidStateName(fsmData.state)
    } catch (err) {
      throw Error(`Invalid machine data. Machine state '${fsmData.state}' is not valid against machine definition ${JSON.stringify(fsmDefinitionWrapper.getDefinition())}.`)
    }
  }

  /*
  Persists machine state to storage
  Throw error if data is found to be corrupted.
  Throw error if state has invalid value.
  Throws error if error occurs while persisting state.
  Thows error if loaded machine is found to be transitioning, unless explicitly allowed via expectTransition argument
   */
  async function saveAndValidateFsmData (fsmData) {
    validateFsmData(fsmData)
    try {
      const utime = Date.now()
      fsmData.utimeUpdated = utime
      await saveFsmDataData(fsmData)
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
  async function loadAndValidateFsmFull (allowToBeInTransition = false) {
    let fsmFull
    try {
      fsmFull = await loadFsmFullFull()
    } catch (error) {
      throw Error(`Error loading machine: ${JSON.stringify(error)}`)
    }
    validateFsmData(fsmFull.fsmData)
    if (!allowToBeInTransition && fsmFull.fsmData.transition) {
      throw Error(`Loaded machine and it's found to be transitioning state which was not expected.`)
    }
    return fsmFull
  }

  /*
  Returns true/false whether machine is currently in the specified state
  Throws if machine is currently transitioning or can't be loaded
   */
  async function isInState (expected) {
    fsmDefinitionWrapper.assertIsValidStateName(expected)
    const { fsmData } = await loadAndValidateFsmFull()
    if (fsmData.transition) {
      return false // machine is not in state, it's in transition
    }
    return expected === fsmData.state
  }

  /*
  Returns state of machine
  Throws if machine is transitioning
  TODO: We could just return both state and transition and leave it up to user to handle the fact
  that machine is not in one particular state, but in the middle of certain transition
 */
  async function getState () {
    const { fsmData } = await loadAndValidateFsmFull()
    if (fsmData.transition) {
      throw Error(`Can't determine current state because machine is transitioning.`)
    }
    return fsmData.state
  }

  async function canDoTransition (transition) {
    const { fsmData } = await loadAndValidateFsmFull()
    return fsmDefinitionWrapper.isValidTransition(fsmData.state, transition)
  }

  async function doTransition (transition) {
    fsmDefinitionWrapper.assertIsValidTransitionName(transition)
    const { fsmData } = await loadAndValidateFsmFull()
    const fromState = fsmData.state
    if (await fsmDefinitionWrapper.isValidTransition(fromState, transition)) {
      fsmData.state = await fsmDefinitionWrapper.getDestinationState(fromState, transition)
      fsmData.transition = null
      fsmData.history.push({ state: fromState, transition })
      await saveAndValidateFsmData(fsmData)
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
    const { fsmData } = await loadAndValidateFsmFull()
    const fromState = fsmData.state
    if (await fsmDefinitionWrapper.isValidTransition(fromState, transition)) {
      fsmData.transition = transition
      await saveAndValidateFsmData(fsmData)
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
    const { fsmData } = await loadAndValidateFsmFull(true)
    if (!fsmData.transition) {
      throw Error(`Machine is not currently transitioning. There's no transition to be finished.`)
    }
    const newState = await fsmDefinitionWrapper.getDestinationState(fsmData.state, fsmData.transition)
    if (!newState) {
      throw Error(`Unexpected error. Failed to finalize transition because it was found to be invalid.`)
    }
    fsmData.history.push({ state: fsmData.state, transition: fsmData.transition })
    fsmData.state = newState
    fsmData.transition = null
    await saveAndValidateFsmData(fsmData)
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
    const { fsmData } = await loadAndValidateFsmFull(true)
    return fsmData.history
  }

  function getDefinitionWrapper () {
    return fsmDefinitionWrapper
  }

  async function getFsmData () {
    const { fsmData } = await loadAndValidateFsmFull(true)
    return { ...fsmData }
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
    getFsmData
  }
}

module.exports.loadStateMachine = loadStateMachine
module.exports.createStateMachine = createStateMachine
module.exports.spawnStateMachine = spawnStateMachine
