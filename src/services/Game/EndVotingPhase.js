const schedule = require("node-schedule");
const DistributionPhase = require('./DistributionPhase')
const Game = require('../../models/game')
const GameSave = require('../../models/gameSave')
const EmailService = require("../Email/email")
const gameStatus = require('../../constants/gameStatus')
const JobService = require("../Job/job");
const JobScheduler = require("../../Jobs/JobScheduler");

async function execute(job, gameInPlay) {
    try {
        if (gameInPlay) {
            var game = await Game.findOne({_id: gameInPlay._id}).populate('brandId').exec()
            var distributionPhaseGames = []
            if (game) {
                job?.cancel()
                game.state = gameStatus.DISTRIBUTION;
                var gameSaves = await GameSave.find({gameId: game.id, submission: {$ne: ''}}).exec()
                var submissionCount = gameSaves.length

                gameSaves = await GameSave.find({gameId: game.id, votesCasted: {$ne: null}}).exec()
                var voteCount = gameSaves.length

                var votingThreshold = voteCount >= Math.floor(2 * Math.log(submissionCount, 1.5)) //decrease for testing -> submissionCount*

                if (votingThreshold) {
                    JobService.removePending(`end-voting-${game.id}-${game.name}`)
                    game.attempt = 1
                    distributionPhaseGames.push(game)
                } else {
                    if (game.attempt > 1) {
                        game.state = gameStatus.FAILED;
                        game.token = null;
                        game.tokenID = null;
                        game.idOfToken = ' ';
                    } else {
                        game.state = gameStatus.VOTING
                        let gameSavesNotVoted = await GameSave.find({gameId: game.id, votesCasted: null}).populate('userId');
                        for (let gameS of gameSavesNotVoted) {
                            await EmailService.sendEmailForNotMeetingVotingTreshold(gameS.userId.email, game.name, gameS.userId.username)
                        }

                        const jobName = `end-voting-${game.id}-${game.name}`;

                        const playTime = new Date(game.playTime);
                        const voteTime = new Date(game.voteTime);

                        //Here we count the time of the voting phase
                        const timeDifference = voteTime - playTime;
                        //Here we add the same time to the submission phase
                        const newVoteTime = new Date(voteTime.getTime() + timeDifference);
                        const newVoteTimeStart = new Date(newVoteTime);

                        //update vote time
                        game.voteTime = newVoteTime;

                        console.log('RESCHEDULE TIME TO END VOTE PHASE');
                        const startSecond = newVoteTimeStart.getSeconds();
                        const startMinute = newVoteTimeStart.getMinutes();
                        const startHour = newVoteTimeStart.getHours();
                        const startDate = newVoteTimeStart.getDate();
                        const startMonth = newVoteTimeStart.getMonth();
                        const startYear = newVoteTimeStart.getFullYear();
                        let rule = new schedule.RecurrenceRule();
                        // rule.tz = "Europe/Kiev";
                        // runs at 16:00:30 NY time
                        rule.second = startSecond;
                        rule.minute = startMinute;
                        rule.hour = startHour;
                        rule.date = startDate;
                        rule.month = startMonth;
                        rule.year = startYear;

                        const JobScheduler = require("../../Jobs/JobScheduler");
                        const jobEndVotingPhase = schedule.scheduleJob(jobName, rule, () => {
                            JobScheduler.executeEndVotingPhase(jobEndVotingPhase, game);
                        });
                        game.attempt++
                        game.isVoteTimeExtended = true;
                        io.emit(`changeState for game - ${game.id}`, game);
                    }
                }
                await game.save().catch(error => {
                    console.log('Unable to update Game, ' + error)
                })

                for (let game of distributionPhaseGames) {
                    await DistributionPhase.execute(game, game.setRoyalties)
                }
                io.emit(`changeState for game - ${game.id}`, game);
            }
        }
    } catch (e) {
        console.log('ERROR WITH END VOTING PHASE  --execute-- FUNCTION, ERROR -> ', e)
    }
}

module.exports = {execute}
