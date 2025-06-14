const FileSystem = require('file-system');
const Request = require('request')
const Stats = require('../../models/stats')

function generatePin() {
    min = 0,
    max = 9999;
    return ("0" + (Math.floor(Math.random() * (max - min + 1)) + min)).substr(-4);
}

async function download(url, filename){
    let file = FileSystem.createWriteStream(filename);

    await new Promise((resolve, reject) => {
        Request({ uri: url })
        .pipe(file)
        .on('finish', () => { resolve() })
        .on('error', (error) => { reject(error) })
    }).catch(error => { throw error })
}

async function getOrCreateStatsEntry() {
    var stats = await Stats.find({ name: 'stats' }).exec()
    if (!stats) {
        stats = new Stats({
            name: 'stats',
            stats: {
                coinsPaid: 0,
                colors: {
                    Blue: 0,
                },
            },
        })
        await stats.save().catch(error => {
            console.error(`Unable to create Stats. [error = ${error}]`)
        })
    }

    return stats
}

module.exports = { download, generatePin, getOrCreateStatsEntry }