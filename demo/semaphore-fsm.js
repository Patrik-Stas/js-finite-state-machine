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
    off: {
      metadata: { 'can-pass': false },
      dot: { shape: 'circle', style: 'filled', fillcolor: 'grey' }
    },
    red: {
      metadata: { 'can-pass': false },
      dot: { shape: 'circle', style: 'filled', fillcolor: 'red' }
    },
    orange: {
      metadata: { 'can-pass': false },
      dot: { shape: 'circle', style: 'filled', fillcolor: 'orange' }
    },
    green: {
      metadata: { 'can-pass': true },
      dot: { shape: 'circle', style: 'filled', fillcolor: 'green' }
    }
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
