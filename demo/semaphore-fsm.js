const semaphoreDefinition = {
  initialState: 'off',
  states: {
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
  transitions: {
    next: [
      { from: 'red', to: 'orange' },
      { from: 'orange', to: 'green' },
      { from: 'green', to: 'red' }],
    disable: [
      { from: 'red', to: 'off' },
      { from: 'orange', to: 'off' },
      { from: 'green', to: 'off' }
    ],
    enable: [
      { from: 'off', to: 'red' }
    ]
  }
}

module.exports.semaphoreDefinition = semaphoreDefinition
