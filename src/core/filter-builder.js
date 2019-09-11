function filterByStates (states) {
  return { 'fsmData.state': { '$in': states } }
}

function filterCreatedAfter (utime) {
  return { 'fsmData.utimeCreated': { '$gte': utime } }
}

function filterCreatedBefore (utime) {
  return { 'fsmData.utimeCreated': { '$lte': utime } }
}

function filterUpdatedAfter (utime) {
  return { 'fsmData.utimeUpdated': { '$gte': utime } }
}

function filterUpdatedBefore (utime) {
  return { 'fsmData.utimeUpdated': { '$lte': utime } }
}

function orFilters (...filters) {
  return { '$or': [...filters] }
}

function andFilters (...filters) {
  return { '$and': [...filters] }
}

module.exports.filterFsm = {
  filterByStates,
  filterCreatedAfter,
  filterCreatedBefore,
  filterUpdatedAfter,
  filterUpdatedBefore,
  andFilters,
  orFilters
}
