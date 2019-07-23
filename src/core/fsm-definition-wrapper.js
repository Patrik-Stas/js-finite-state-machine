const assert = require('assert')

// TODO: Add checks:
// - multiple identical transition definitions,
// -
function assertIsValidMachineDefinition (definition) {
  if (!definition.initialState) {
    throw Error('Initial state is not defined.')
  }
  if (!definition.states) {
    throw Error('States are not defined.')
  }
  if (definition.states.length === 0) {
    throw Error('At least one state must be defined.')
  }
  if (definition.transitions === null || definition.transitions === undefined) {
    throw Error('Transitions must be defined.')
  }
  try {
    assert(definition.states.find(s => s.name === definition.initialState))
  } catch (err) {
    throw Error(`Initial state value refers state '${definition.initialState}' which was not declared.`)
  }
  for (const transition of definition.transitions) {
    const { from, to } = transition
    try {
      assert(definition.states.find(s => s.name === from))
    } catch (err) {
      throw Error(`Transition ${JSON.stringify(transition)} refers state from='${from}' which was not declared.`)
    }
    try {
      assert(definition.states.find(s => s.name === to))
    } catch (err) {
      throw Error(`Transition ${JSON.stringify(transition)} refers state to='${to}' which was not declared.`)
    }
  }
}

function createFsmDefinitionWrapper (definition) {
  assertIsValidMachineDefinition(definition)

  function getStateMetadata (state) {
    const stateDefinition = definition.states.find(s => s.name === state)
    if (!stateDefinition) {
      throw Error('Fatal error, this is state machine implementation error. Current state not found in machine states definition.')
    }
    return stateDefinition.metadata
  }

  function getStateAfterTransition (fromState, transition) {
    const foundTransition = findTransitionByName(fromState, transition)
    if (!foundTransition) {
      return undefined
    }
    return definition.states.find(s => s.name === foundTransition.to)
  }

  function findStateDefinitionByName (stateName) {
    return definition.states.find(s => s.name === stateName)
  }

  // Must return null or exactly 1 transition
  function findTransitionByName (fromState, transition) {
    return definition.transitions.find(t => t.name === transition && t.from === fromState)
  }

  // Might return multiple transitions, multiple paths can exist
  function findTransitionsByStates (fromState, toState) {
    return definition.transitions.filter(t => t.from === fromState && t.to === toState)
  }

  // Might return multiple transitions
  function findTransitionsByName (transition) {
    return definition.transitions.filter(t => t.name === transition)
  }

  function isValidTransition (fromState, transition) {
    return !!findTransitionByName(fromState, transition)
  }

  function dotifyDefinition () {
    return {}
  }

  return {
    getStateMetadata,
    getStateAfterTransition,
    findStateDefinitionByName,
    assertIsValidMachineDefinition,
    findTransitionsByStates,
    findTransitionsByName,
    findTransitionByName,
    isValidTransition,
    dotifyDefinition
  }
}

module.exports.assertIsValidMachineDefinition = assertIsValidMachineDefinition
module.exports.createFsmDefinitionWrapper = createFsmDefinitionWrapper
