const assert = require('assert')

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

function getStateAfterStateChange (fromState, toState, definition) {
  const transition = findTransitionByStates(fromState, toState, definition)
  if (!transition) {
    return undefined
  }
  return definition.states.find(s => s.name === transition.to)
}

function getStateAfterTransition (fromState, transition, definition) {
  const foundTransition = findTransitionByName(fromState, transition, definition)
  if (!foundTransition) {
    return undefined
  }
  return definition.states.find(s => s.name === foundTransition.to)
}

function findStateFullByName (stateName, definition) {
  return definition.states.find(s => s.name === stateName)
}

function findTransitionByStates (fromState, toState, definition) {
  return definition.transitions.find(t => t.from === fromState && t.to === toState)
}

function findTransitionByName (fromState, transition, definition) {
  return definition.transitions.find(t => t.name === transition && t.from === fromState)
}

function isValidStateChange (fromState, toState, definition) {
  return !!findTransitionByStates(fromState, toState, definition)
}

function isValidTransition (fromState, transition, definition) {
  return !!findTransitionByName(fromState, transition, definition)
}

function dotifyDefinition (definition) {
  return { }
}

module.exports.getStateAfterStateChange = getStateAfterStateChange
module.exports.getStateAfterTransition = getStateAfterTransition
module.exports.findStateFullByName = findStateFullByName
module.exports.assertIsValidMachineDefinition = assertIsValidMachineDefinition
module.exports.findTransitionByStates = findTransitionByStates
module.exports.findTransitionByName = findTransitionByName
module.exports.isValidStateChange = isValidStateChange
module.exports.isValidTransition = isValidTransition
module.exports.dotifyDefinition = dotifyDefinition
