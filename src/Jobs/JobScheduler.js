const EndSubmissionPhase = require('../services/Game/EndSubmissionPhase')
const EndVotingPhase = require('../services/Game/EndVotingPhase')
const StripeBalance = require('../services/Stripe/Client')
const GameService = require('../services/Game/GameJobs')

async function executeEndVotingPhase(job, game) {
    await EndVotingPhase.execute(job, game)
}

async function checkForBrandsAndExecuteJobs(job) {
    await GameService.eachBrandEachJob(job)
}

async function executeEndSubmissionPhase(job, game) {
    await EndSubmissionPhase.execute(job, game)
}

async function executeWeekly() {
    await StripeBalance.getStripeBalance()
}

async function executePendingGames(jobs) {
    await GameService.executePendingGames(jobs)
}

module.exports = {
    executeEndVotingPhase,
    executeWeekly,
    executeEndSubmissionPhase,
    checkForBrandsAndExecuteJobs,
    executePendingGames
}
