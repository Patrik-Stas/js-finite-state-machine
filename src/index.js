const { createStrategyMemory } = require('./core/storage-strategies/strategy-memory')
const { createMemKeystore } = require('./core/storage-strategies/strategy-memory')
const { createStrategyRedis } = require('./core/storage-strategies/strategy-redis')
const { createStrategyMongo } = require('./core/storage-strategies/strategy-mongo')
const { assertIsValidMachineDefinition } = require('./core/fsm-definition-wrapper')
const { createFsmManager } = require('./core/fsm-manager')

module.exports = {
  assertIsValidMachineDefinition,
  createStrategyMemory,
  createMemKeystore,
  createStrategyRedis,
  createStrategyMongo,
  createFsmManager
}
