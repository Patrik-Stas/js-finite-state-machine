/* eslint-disable no-multi-spaces,key-spacing */
const semaphoreDefinition = {
  type: 'semaphore',
  initialState: 'off',
  states: {
    off: 'off',
    red: 'red',
    orange: 'orange',
    green: 'green'
  },
  transitions: {
    next: 'next',
    disable: 'disable',
    enable: 'enable'
  },
  definitionStates: {
    off:    { metadata: { 'can-pass': false } },
    red:    { metadata: { 'can-pass': false } },
    orange: { metadata: { 'can-pass': false } },
    green:  { metadata: { 'can-pass': true } }
  },
  definitionTransitions: {
    next: [
      { from: 'red',    to: 'orange' },
      { from: 'orange', to: 'green' },
      { from: 'green',  to: 'red' }],
    disable: [
      { from: 'red',    to: 'off' },
      { from: 'orange', to: 'off' },
      { from: 'green',  to: 'off' }
    ],
    enable: [
      { from: 'off',    to: 'red' }
    ]
  }
}

module.exports.semaphoreDefinition = semaphoreDefinition
