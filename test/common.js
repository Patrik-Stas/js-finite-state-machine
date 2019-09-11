module.exports.matterMachineDefinition = {
  type: 'matter',
  initialState: 'solid',
  states: {
    solid: 'solid',
    liquid: 'liquid',
    gas: 'gas'
  },
  transitions: {
    melt: 'melt',
    freeze: 'freeze',
    vaporize: 'vaporize',
    condense: 'condense'
  },
  definitionStates: {
    solid: { metadata: { tangible: true }, dot: {} },
    liquid: { metadata: { tangible: true }, dot: {} },
    gas: { metadata: { tangible: false }, dot: {} }
  },
  definitionTransitions: {
    melt: [{ from: 'solid', to: 'liquid' }],
    freeze: [{ from: 'liquid', to: 'solid' }],
    vaporize: [{ from: 'liquid', to: 'gas' }],
    condense: [{ from: 'gas', to: 'liquid' }]
  }
}
