const { spawnStateMachine } = require('./core/fsm')
const { createInMemStateStorage } = require('./core/fsm-storage/fsm-manager-mem')
const { createRedisStateStorage } = require('./core/fsm-storage/fsm-manager-redis')
const { createMongoStateStorage } = require('./core/fsm-storage/fsm-manager-mongo')
const { createStateMachineFactory } = require('./core/fsm-storage/fsm-manager-mem')
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
