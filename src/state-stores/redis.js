const util = require('util')

module.exports.createRedisStateStorage = function createRedisStateStorage (redisClient, name) {
  const redishset = util.promisify(redisClient.hset).bind(redisClient)
  const redishget = util.promisify(redisClient.hget).bind(redisClient)
  const redisdel = util.promisify(redisClient.del).bind(redisClient)

  async function set (key, value) {
    await redishset(key, name, value)
  }

  async function get (key) {
    return redishget(key, name)
  }

  async function del (key) {
    return redisdel(key, name)
  }

  return {
    set,
    get,
    del
  }
}
