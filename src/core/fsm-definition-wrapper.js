const assert = require('assert')
const { buildSourceTransitionDestinationMap } = require('./fsm-definition-utils')

// TODO: Add checks:
// - multiple identical transition definitions,
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
  const stateKeys = Object.keys(definition.states)
  for (const stateKey of stateKeys) {
    const stateValue = definition.states[stateKey]
    if (stateValue !== stateKey) {
      throw Error('In machine definition, each key under "states" field must have same value as the key itself.' +
        `In your definition, "states.${stateKey}" has value "${stateValue}" but should be "${stateKey}".`)
    }
  }
  if (definition.definitionStates) {
    for (const stateWithMetadata of Object.keys(definition.definitionStates)) {
      if (!definition.states[stateWithMetadata]) {
        throw Error(`definitionStates is specifying state called ${stateWithMetadata} but no such state was listed under states`)
      }
    }
  }

  if (!definition.transitions) {
    throw Error('Transitions must be defined.')
  }
  const transitionKeys = Object.keys(definition.transitions)
  for (const transitionKey of transitionKeys) {
    const transitionValue = definition.transitions[transitionKey]
    if (transitionValue !== transitionKey) {
      throw Error('In machine definition, each key under "transitions" field must have same value as the key itself.' +
        `In your definition, "states.${transitionKey}" has value "${transitionValue}" but should be "${transitionKey}".`)
    }
  }
  if (!definition.definitionTransitions) {
    throw Error('Transitions metadata must be defined.')
  }
  for (const transitionMetadataKey of Object.keys(definition.definitionTransitions)) {
    if (!definition.transitions[transitionMetadataKey]) {
      throw Error(`definitionTransitions is specifying transition called ${transitionMetadataKey}` +
          ` but no such transition was listed under transitions`)
    }
  }
  for (const transitionWithMeta of Object.keys(definition.definitionTransitions)) {
    const transitionDefinition = definition.definitionTransitions[transitionWithMeta]
    if (!Array.isArray(transitionDefinition)) {
      throw Error(`Definition of transition ${transitionWithMeta} is not array.`)
    }
  }
  try {
    assert(definition.states[definition.initialState])
  } catch (err) {
    throw Error(`Initial state value refers state '${definition.initialState}' which was not declared.`)
  }
  for (const transition of Object.keys(definition.definitionTransitions)) {
    const transitionDefinition = definition.definitionTransitions[transition]
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
  let sourceTransitionDestinationMap = buildSourceTransitionDestinationMap(definition.definitionTransitions)

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
    return !!definition.definitionTransitions[transition]
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
      throw Error(`Unknown transition '${transition}'. Known transitions: ${JSON.stringify(Object.keys(definition.definitionTransitions))}`)
    }
  }

  function getStateMetadata (state) {
    return (definition.definitionStates && definition.definitionStates[state]) ? definition.definitionStates[state].metadata : {}
  }

  function dotify () {
    let dot = 'digraph {\n'
    const states = Object.keys(definition.states)
    for (const state of states) {
      const stateMetadata = definition.definitionStates[state]
      let stateProperties = ''
      if (stateMetadata.dot) {
        const properties = Object.keys(stateMetadata.dot)
        for (const property of properties) {
          stateProperties += ` ${property}=${stateMetadata.dot[property]} `
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

  function getDefinition () {
    return definition
  }

  return {
    type: definition.type,
    initialState: definition.initialState,
    getDefinition,
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
