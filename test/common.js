module.exports.matterMachineDefinition = {
  initialState: 'solid',
  states: [
    { name: 'solid', metadata: { 'tangible': true } },
    { name: 'liquid', metadata: { 'tangible': true } },
    { name: 'gas', metadata: { 'tangible': false } }
  ],
  transitions: [
    { name: 'melt', from: 'solid', to: 'liquid' },
    { name: 'freeze', from: 'liquid', to: 'solid' },
    { name: 'vaporize', from: 'liquid', to: 'gas' },
    { name: 'condense', from: 'gas', to: 'liquid' }
  ]
}
