/*
From FSM transition specification specification is generated source-target-transitionDefinition map
{fromState: {toState: {transitionSpec}}}
 */
module.exports.buildSourceTransitionDestinationMap = function buildSourceTransitionDestinationMap (transitionsDefinition) {
  const transitionNames = Object.keys(transitionsDefinition)
  let transitionMap = {}
  for (const transitionName of transitionNames) {
    const statePairs = transitionsDefinition[transitionName]
    for (const statePair of statePairs) {
      const { from, to } = statePair
      transitionMap[from] = transitionMap[from] || {}
      transitionMap[from][transitionName] = to
    }
  }
  return transitionMap
}

// From FSM transition specification specification is generated source-target-transitionDefinition map
module.exports.buildSourceTargetToTransition = function buildSourceTargetToTransition (transitionsDefinition) {
  const transitionNames = Object.keys(transitionsDefinition)
  let transitionMap = {}
  for (const transitionName of transitionNames) {
    const statePairs = transitionsDefinition[transitionName]
    for (const statePair of statePairs) {
      const { from, to } = statePair
      transitionMap[from] = transitionMap[from] || {}
      transitionMap[from][to] = transitionName
    }
  }
  return transitionMap
}
