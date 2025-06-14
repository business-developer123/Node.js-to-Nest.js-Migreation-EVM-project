const mongoose = require('mongoose')

const GameOrbitSchema = new mongoose.Schema({
    gameInMotion: Boolean,
    timestamp: {type: Date, default: new Date()}
})


module.exports = mongoose.model('GameOrbit', GameOrbitSchema);