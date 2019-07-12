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
const {getStateAfterTransition} = require('./state-definition-util')
const { findStateFullByName } = require('./state-definition-util')
const { isValidTransition } = require('./state-definition-util')
const { assertIsValidMachineDefinition } = require('./state-definition-util')
const { isValidStateChange } = require('./state-definition-util')

module.exports.createStateMachine = async function createStateMachine (storage, machineKey, definition) {
  assertIsValidMachineDefinition(definition)
  if (!storage || typeof storage.get !== 'function' || typeof storage.set !== 'function') {
    throw Error('Storage provided to state machine is not defined or is missing get/set functions.')
  }
  if (!machineKey) {
    throw Error('Machine key is not defined.')
  }
  const validStates = definition.states.map(s => s.name)
  const currentState = await storage.get(machineKey)
  if (!currentState) {
    await storage.set(machineKey, definition.initialState)
  }
  let wasDestroyed = false

  function assertNotDestroyed () {
    if (wasDestroyed) {
      throw Error(`Machine ${machineKey} was destroyed!`)
    }
  }

  function assertIsValidState (state) {
    assertNotDestroyed()
    if (!validStates.includes(state)) {
      throw Error(`State machine got queried for unknown state '${state}'. Known states: ${JSON.stringify(Object.keys(definition.states))}`)
    }
  }

  async function getMetadata () {
    assertNotDestroyed()
    const currentState = await getState()
    const stateDefinition = definition.states.find(s => s.name === currentState)
    if (!stateDefinition) {
      throw Error('Fatal error, this is state machine implementation error. Current state not found in machine states definition.')
    }
    return stateDefinition.metadata
  }

  async function isInState (expected) {
    assertNotDestroyed()
    assertIsValidState(expected)
    const actual = await storage.get(machineKey)
    return expected === actual
  }

  async function assertState (expected) {
    assertNotDestroyed()
    assertIsValidState(expected)
    const actual = await storage.get(machineKey)
    if (expected !== actual) {
      throw Error(`State machine was expected to be in state '${expected}', but was in state '${actual}'.`)
    }
  }

  async function assertInSomeState (...possible) {
    assertNotDestroyed()
    let wasInSomeOfTheStates = false
    const state = await getState(machineKey)
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

  async function getState () {
    assertNotDestroyed()
    const state = await storage.get(machineKey)
    if (!state) {
      throw Error(`No state found for machine id ${machineKey}`)
    }
    return state
  }

  async function getStateFull () {
    assertNotDestroyed()
    const stateName = await storage.get(machineKey)
    if (!stateName) {
      throw Error(`No state found for machine id ${machineKey}`)
    }
    return findStateFullByName(stateName, definition)
  }

  async function goToState (destinationState) {
    assertNotDestroyed()
    const currentState = await getState()
    if (await isValidStateChange(currentState, destinationState, definition)) {
      await storage.set(machineKey, destinationState)
    } else {
      throw Error(`Transition from current state '${currentState}' to state '${destinationState}' is invalid.`)
    }
  }

  async function transition (transitionName) {
    assertNotDestroyed()
    const currentState = await getState()
    const stateAfterTransition = getStateAfterTransition(currentState, transitionName, definition)
    if (await isValidTransition(currentState, stateAfterTransition, definition)) {
      await storage.set(machineKey, stateAfterTransition)
    } else {
      throw Error(`Transition ${transitionName} from current state '${currentState}' is invalid.`)
    }
  }

  async function destroy () {
    assertNotDestroyed()
    await storage.del(machineKey)
    wasDestroyed = true
  }

  async function serialize() {

  }

  return {
    isInState,
    getState,
    getStateFull,
    goToState,
    transition,
    assertState,
    assertInSomeState,
    getMetadata,
    destroy
  }
}
