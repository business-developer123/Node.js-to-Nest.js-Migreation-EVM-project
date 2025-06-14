const Datastream = require('../../models/datastream')

async function getDatastream() {
  try {
    const data = await Datastream.find({}).sort({ date: -1 })
    return data
  } catch (error) {
    throw new Error(error.message)
  }
}

module.exports = {
    getDatastream
}
