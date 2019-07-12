const { createStateMachine } = require('./core/state-machine')
const { createInMemStateStorage } = require('./state-stores/mem')
const { createRedisStateStorage } = require('./state-stores/redis')
const { createStateMachineFactory } = require('./core/state-machine-factory')
const { assertIsValidMachineDefinition, dotifyDefinition } = require('./core/state-definition-util')

module.exports = { createStateMachine, createStateMachineFactory, assertIsValidMachineDefinition, createInMemStateStorage, createRedisStateStorage, dotifyDefinition }
