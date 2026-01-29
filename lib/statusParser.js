// DEPRECATED: parseStatusData has been replaced by lib/statusMapper.js
// Keep a tiny compatibility shim for a short transitional period.
const { mapStatusData } = require('./statusMapper')
function parseStatusData(data, containerInfo = {}) {
  return mapStatusData(data, containerInfo)
}
module.exports = { parseStatusData }

