module.exports.matterMachineDefinition = {
  type: 'matter',
  initialState: 'solid',
  states: {
    solid: { metadata: { tangible: true } },
    liquid: { metadata: { tangible: true } },
    gas: { metadata: { tangible: false } }
  },
  transitions: {
    melt: [{ from: 'solid', to: 'liquid' }],
    freeze: [{ from: 'liquid', to: 'solid' }],
    vaporize: [{ from: 'liquid', to: 'gas' }],
    condense: [{ from: 'gas', to: 'liquid' }]
  }
}
