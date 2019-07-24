const { spawnStateMachine } = require('./core/fsm')
const { createInMemStateStorage } = require('./core/fsm-storage/strategy-keyvalue')
const { createRedisStateStorage } = require('./core/fsm-storage/strategy-redis')
const { createMongoStateStorage } = require('./core/fsm-storage/strategy-mongo')
const { createStateMachineFactory } = require('./core/fsm-storage/strategy-keyvalue')
const { assertIsValidMachineDefinition, dotifyDefinition } = require('./core/fsm-definition-wrapper')

module.exports = {
  createStateMachine: spawnStateMachine,
  createStateMachineFactory,
  assertIsValidMachineDefinition,
  createInMemStateStorage,
  createRedisStateStorage,
  createMongoStateStorage,
  dotifyDefinition
}
