const gameTypes = new Set([
    'Audio',
    'Image',
    'Text',
    'Video'
])

function isValidGameType(gameType) { return gameTypes.has(gameType) }

module.exports = {
    isValidGameType,
}