const assert = require('assert')
const { buildSourceTransitionDestinationMap } = require('./fsm-definition-utils')

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
  if (Object.keys(definition.states).length === 0) {
    throw Error('At least one state must be defined.')
  }
  if (!definition.transitions) {
    throw Error('Transitions must be defined.')
  }
  for (const transition of Object.keys(definition.transitions)) {
    const transitionDefinition = definition.transitions[transition]
    if (!Array.isArray(transitionDefinition)) {
      throw Error(`Definition of transition ${transition} is not array.`)
    }
  }
  try {
    assert(definition.states[definition.initialState])
  } catch (err) {
    throw Error(`Initial state value refers state '${definition.initialState}' which was not declared.`)
  }
  for (const transition of Object.keys(definition.transitions)) {
    const transitionDefinition = definition.transitions[transition]
    if (transitionDefinition.legth === 0) {
      throw Error(`Transition '${transition}' must be have defined at least one state pair.`)
    }
    for (const statePair of transitionDefinition) {
      const { from, to } = statePair
      if (!definition.states[from]) {
        throw Error(`Transition '${transition}' refers state from='${from}' which was not declared.`)
      }
      if (!definition.states[to]) {
        throw Error(`Transition '${transition}' refers state to='${to}' which was not declared.`)
      }
    }
  }
}

function createFsmDefinitionWrapper (definition) {
  assertIsValidMachineDefinition(definition)

  // let sourceTargetToTransition = buildSourceTargetToTransition(definition.transitions)
  let sourceTransitionDestinationMap = buildSourceTransitionDestinationMap(definition.transitions)

  function getDestinationState (fromState, transition) {
    assertIsValidStateName(fromState)
    assertIsValidTransitionName(transition)
    const stateTransitions = sourceTransitionDestinationMap[fromState]
    if (!stateTransitions) { // it might be that from "fromState" doesn't have any transitions at all
      return undefined
    }
    return sourceTransitionDestinationMap[fromState][transition]
  }

  function isValidTransitionName (transition) {
    return !!definition.transitions[transition]
  }

  function isValidStateName (state) {
    return !!definition.states[state]
  }

  function isValidTransition (fromState, transition) {
    return !!getDestinationState(fromState, transition)
  }

  function assertIsValidStateName (state) {
    if (!isValidStateName(state)) {
      throw Error(`Unknown state '${state}'. Known states: ${JSON.stringify(Object.keys(definition.states))}`)
    }
  }

  function assertIsValidTransitionName (transition) {
    if (!isValidTransitionName(transition)) {
      throw Error(`Unknown transition '${transition}'. Known transitions: ${JSON.stringify(Object.keys(definition.transitions))}`)
    }
  }

  function getStateMetadata (state) {
    return definition.states[state].metadata
  }

  function dotify () {
    let dot = 'digraph {\n'
    const states = Object.keys(definition.states)
    for (const state of states) {
      const stateDefinition = definition.states[state]
      let stateProperties = ''
      console.log(JSON.stringify(stateDefinition))
      if (stateDefinition.dot) {
        const properties = Object.keys(stateDefinition.dot)
        for (const property of properties) {
          stateProperties += ` ${property}=${stateDefinition.dot[property]} `
        }
      }
      dot += `    ${state} [${stateProperties}]\n`
    }
    const sourceStates = Object.keys(sourceTransitionDestinationMap)
    for (const sourceState of sourceStates) {
      const availableTransitions = Object.keys(sourceTransitionDestinationMap[sourceState])
      for (const availableTransition of availableTransitions) {
        const destinationState = sourceTransitionDestinationMap[sourceState][availableTransition]
        dot += `    ${sourceState} -> ${destinationState} [label=${availableTransition}];\n`
      }
    }
    dot += '}'
    return dot
  }

  return {
    type: definition.type,
    initialState: definition.initialState,
    assertIsValidMachineDefinition,
    isValidTransitionName,
    assertIsValidTransitionName,
    isValidStateName,
    assertIsValidStateName,
    isValidTransition,
    getDestinationState,
    getStateMetadata,
    dotify
  }
}

module.exports.assertIsValidMachineDefinition = assertIsValidMachineDefinition
module.exports.createFsmDefinitionWrapper = createFsmDefinitionWrapper
