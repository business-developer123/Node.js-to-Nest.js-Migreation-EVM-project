const Game = require("../../models/game");
const GameSave = require("../../models/gameSave");
const schedule = require("node-schedule");
const JobService = require("../Job/job");
const User = require("../../models/user");
const Job = require("../../models/job");
const NextSystemMessage = require("../chat/NextSystemMessages");
const systemMessageType = require("../../constants/systemMessageType");
const emailService = require("../Email/email");
const gameStatus = require("../../constants/gameStatus");
const MoonService = require("../newMoon");
const jobActions = require("../../constants/jobActions");
const JobScheduler = require("../../Jobs/JobScheduler");
const Twillio = require("../Twilio/twillio");
require("dotenv").config();

let Module = (function () {
  let remindUsersToPlayGame = async function (args, job) {
    let gameId = args.gameForPlayId;
    let users = args.userGames;
    job.cancel();
    JobService.removePending(`remid-users-to-play`);
    let gamesInMotion = await Game.find({
      state: gameStatus.SUBMISSION,
      reminderSent: false,
      endDate: { $gte: new Date() },
    });
    console.log("gamesInMotion", gamesInMotion.length);
    let remindersNotSent = gamesInMotion.some(
      (gim) => gim.reminderSent === false
    );
    for (let u of users) {
      let userGS = await GameSave.find({ gameId: gameId, userId: u.userId })
        .populate("userId")
        .exec();
      if (remindersNotSent && userGS[0]?.state === "NO_SUBMISSION") {
        await emailService.sendEmailReminderToPlay(userGS[0].userId.email);
        await NextSystemMessage.getNextSystemMessage(
          userGS[0].userId.email,
          systemMessageType.REMIND_USER_OF_GAME_IN_PLAY,
          { gameId: gameId, username: userGS[0].userId.username }
        );
      }
    }
    for (let g of gamesInMotion) {
      g.reminderSent = true;
      await g.save();
    }
  };
  // let startBrandGameJobFunction = async function (game) {
  //     let games = await Game.find({ state: gameStatus.PENDING, brandId: game.brandId })
  //     if (!games || !games.length) {
  //         return
  //     } else {
  //         let gameForPlay = games[0]
  //         let gameForPlayId = gameForPlay._id
  //         gameForPlay.state = gameStatus.SUBMISSION
  //         gameForPlay.endDate = Date.now() + 86400000; // 600000 - 10 min  //86400000 - 24h
  //         await gameForPlay.save();
  //         let userGames = await GameSave.find({gameId: gameForPlay._id}).exec()
  //         for (let u of userGames) {
  //             let user = await User.findOne({_id: u.userId})
  //             await emailService.sendNewPlayMail(user);
  //         }
  //         const  startTime  = Date.now() + 86280000 //9.30min // 23h 58min 86280000
  //         const startTimeToRemindUsers = Date.now() + 43200000 // 5 min -300000 // after testing + 43200000 -12h
  //         const JobScheduler = require("../../Jobs/JobScheduler");
  //         const jobRemindName = `remid-users-to-play`
  //         const jobRemindRule = '*/2 * * * * *'
  //         if (!schedule.scheduledJobs[jobRemindName]) {
  //             JobService.createJob({ name: jobRemindName, startTime: startTimeToRemindUsers, endTime: null, rule: jobRemindRule, what: jobActions.REMIND_USERS_TO_PLAY, args: {userGames, gameForPlayId }})
  //             let jobToRemindUsers = schedule.scheduleJob(jobRemindName, { start: startTimeToRemindUsers, rule: jobRemindRule} , () => {
  //                 Module[jobActions.REMIND_USERS_TO_PLAY]({userGames: userGames, gameForPlayId: gameForPlay._id}, jobToRemindUsers)
  //             });
  //         }
  //         const jobEndSubmissionName = `end-submission-${gameForPlay._id}`
  //         const jobEndSubmissionRule = '*/1 * * * * *'
  //         JobService.createJob({ name: jobEndSubmissionName, startTime: startTime, endTime: null, args: gameForPlay, rule: jobEndSubmissionRule, what: jobActions.END_SUBMISSION })
  //         let endSubJob = schedule.scheduleJob(jobEndSubmissionName, { start: startTime, rule: jobEndSubmissionRule }, () => {
  //             JobScheduler.executeEndSubmissionPhase(endSubJob, gameForPlay);
  //         });
  //     }
  // }
  let startBrandGameJobFunction = async function (game) {
    try {
      if (!game) {
        return;
      } else {
        console.log("STARTING THE GAME - ", game._id);
        const gameForPlay = await Game.findOne({ _id: game._id });
        let gameForPlayId = gameForPlay._id;
        gameForPlay.state = gameStatus.SUBMISSION;
        //   gameForPlay.endDate = Date.now() + 86400000; // 600000 - 10 min  //86400000 - 24h ---- we don't need this
        await gameForPlay.save();
        let userGames = await GameSave.find({ gameId: gameForPlay._id }).exec();

        var domain = process.env.URL_IMAGINE;
        const sendMessagePromises = gameForPlay?.usersToShow?.map(
          async (user) => {
            try {
              await emailService.sendEmailReminderToPlay(user);
              const userFromDb = await User.findById(user._id).exec();
              await Twillio.sendMessage(
                userFromDb?.phoneNumber,
                `${String.fromCodePoint(0x1f4a5)} Hey ${
                  userFromDb.username
                }, It's Kawaii from Imagine Council. A new play just started– let’s imagine and create value! ${domain}`
              );
              return { status: "fulfilled", user: user.username };
            } catch (error) {
              return {
                status: "rejected",
                user: user.username,
                error: error.message,
              };
            }
          }
        );
        await Promise.allSettled(sendMessagePromises);

        // TIME TO REMIND USERS TO PLAY
        const startTimeToRemindUsers = Date.now(); // 5 min -300000 // after testing + 43200000 -12h + to remind Users
        const JobScheduler = require("../../Jobs/JobScheduler");
        const jobRemindName = `remid-users-to-play`;
        const jobRemindRule = "*/2 * * * * *";
        if (!schedule.scheduledJobs[jobRemindName]) {
          await JobService.createJob({
            name: jobRemindName,
            startTime: startTimeToRemindUsers,
            endTime: null,
            rule: jobRemindRule,
            what: jobActions.REMIND_USERS_TO_PLAY,
            args: { userGames, gameForPlayId },
          });
          let jobToRemindUsers = schedule.scheduleJob(
            jobRemindName,
            { start: startTimeToRemindUsers, rule: jobRemindRule },
            () => {
              Module[jobActions.REMIND_USERS_TO_PLAY](
                { userGames: userGames, gameForPlayId: gameForPlay._id },
                jobToRemindUsers
              );
            }
          );
        }

        // TIME TO END SUBMITION PHASE
        const playTime = new Date(gameForPlay.playTime);
        console.log("TIME TO END SUBMITION PHASE", playTime);
        const startSecond = playTime.getSeconds();
        const startMinute = playTime.getMinutes();
        const startHour = playTime.getHours();
        const startDate = playTime.getDate();
        const startMonth = playTime.getMonth();
        const startYear = playTime.getFullYear();

        let rule = new schedule.RecurrenceRule();
        // rule.tz = "Europe/Kiev";
        // runs at 16:00:30 NY time
        rule.second = startSecond;
        rule.minute = startMinute;
        rule.hour = startHour;
        rule.date = startDate;
        rule.month = startMonth;
        rule.year = startYear;

        const jobEndSubmissionName = `end-submission-${gameForPlay._id}`;
        await JobService.createJob({
          name: jobEndSubmissionName,
          startTime: playTime,
          endTime: null,
          args: gameForPlay,
          rule: rule,
          what: jobActions.END_SUBMISSION,
        });
        let endSubJob = schedule.scheduleJob(jobEndSubmissionName, rule, () => {
          JobScheduler.executeEndSubmissionPhase(endSubJob, gameForPlay);
        });
        io.emit(`changeState for game - ${gameForPlay._id}`, gameForPlay);
      }
    } catch (e) {
      console.log(
        "ERROR WITH --startBrandGameJobFunction-- FUNCTION, ERROR -> ",
        e
      );
    }
  };
  return {
    startBrandGameJobFunction: startBrandGameJobFunction,
    remindUsersToPlayGame: remindUsersToPlayGame,
  };
})();

// async function eachBrandEachJob(job) {
//     let games = await Game.find({ state: gameStatus.PENDING })
//     var flags = [], output = [], l = games.length, i;
//     for( i = 0; i < l; i++) {
//         if (flags[games[i].brandId]) continue;
//         flags[games[i].brandId] = true;
//         output.push(games[i]);
//     }
//     const today = new Date();
//     const moonPhases = await MoonService.getMoonPhases(today.getFullYear(), today.getMonth()+1, today.getDate())
//     console.log('moonPhases', moonPhases)
//     if (true) { //moonPhases.phase === 6
//         const startTime = new Date(Date.now() + 2505600000);//10min //after 29 days 2505600000
//         job.reschedule({ start: startTime, rule: '0 23 * * *' }) // each day at 10:00AM 0 9 * * *
//         for (let o of output) {
//             if (!schedule.scheduledJobs[`brand-${o.brandId}`]) {
//                 //there is no job for this brand, create one
//                 let rule = new schedule.RecurrenceRule();
//                 rule.tz = 'America/New_York';
//                 // runs at 16:00:30 NY time
//                 rule.second = 30;
//                 rule.minute = 0;
//                 rule.hour = 16;
//                 const startTime = Date.now()
//                 const endTime = new Date(Date.now() + 1296000000); // after 15 days
//                 JobService.createJob({ name: `brand-${o.brandId}`, startTime: startTime, endTime: endTime, args: o, rule: rule, what: jobActions.START_BRAND_GAME })
//                 schedule.scheduleJob(`brand-${o.brandId}`, rule , function(){
//                     Module[jobActions.START_BRAND_GAME](o)
//                 });
//             }
//         }
//     }
// }

async function eachBrandEachJob(job) {
  try {
    let games = await Game.find({ state: gameStatus.PENDING }).exec();
    if (games && games.length) {
      console.log(
        "GAMES FOUND IN THE STATE OF PENDING, LENGTH  - ",
        games.length
      );
      for (let game of games) {
        if (!schedule.scheduledJobs[`game-${game._id}`] && game?.startTime) {
          console.log("SCHEDULE STARTING JOB FOT GAME - ", game._id);
          const startTime = new Date(game.startTime);
          // const dayOfWeek = startTime.getDay();
          const startSecond = startTime.getSeconds();
          const startMinute = startTime.getMinutes();
          const startHour = startTime.getHours();
          const startDate = startTime.getDate();
          const startMonth = startTime.getMonth();
          const startYear = startTime.getFullYear();

          //there is no job for this brand, create one
          let rule = new schedule.RecurrenceRule();
          // rule.tz = "Europe/Kiev";
          // runs at 16:00:30 NY time
          rule.second = startSecond;
          rule.minute = startMinute;
          rule.hour = startHour;
          rule.date = startDate;
          rule.month = startMonth;
          rule.year = startYear;

          const startTimeForJob = Date.now();
          const endTime = new Date(Date.now() + 1296000000); // after 15 days
          await JobService.createJob({
            name: `game-${game._id}`,
            startTime: startTimeForJob,
            endTime: endTime,
            args: game,
            rule: rule,
            what: jobActions.START_BRAND_GAME,
          });
          schedule.scheduleJob(`game-${game._id}`, rule, function () {
            Module[jobActions.START_BRAND_GAME](game);
          });
        }
      }
    }
  } catch (e) {
    console.log("ERROR WITH --eachBrandEachJob-- FUNCTION, ERROR -> ", e);
  }
}

async function executePendingGames(jobs) {
  try {
    for (let job of jobs) {
      let jobsArgs = job.args.length ? job.args[0] : null;
      let startTime = job.startTime < Date.now() ? Date.now() : job.startTime;
      if (!job.endDate || job.endDate > Date.now()) {
        if (job.what === jobActions.END_SUBMISSION) {
          let game = await Game.findOne({ _id: jobsArgs._id });
          if (game && game?.state !== gameStatus.SUBMISSION) {
            job.pending = false;
            await job.save();
          } else {
            const JobScheduler = require("../../Jobs/JobScheduler");
            let rule = new schedule.RecurrenceRule();
            rule.second = job.rule.second;
            rule.minute = job.rule.minute;
            rule.hour = job.rule.hour;
            rule.date = job.rule.date;
            rule.month = job.rule.month;
            rule.year = job.rule.year;

            let endSubJob = schedule.scheduleJob(job.name, rule, function () {
              JobScheduler.executeEndSubmissionPhase(endSubJob, game);
            });
            console.log(
              "RESCHEDULE --executeEndSubmissionPhase-- ON SERVER RELOAD"
            );
          }
        } else if (job.what === jobActions.END_VOTING) {
          let game = await Game.findOne({ _id: jobsArgs._id });
          if (game && game?.state !== gameStatus.VOTING) {
            job.pending = false;
            await job.save();
          } else {
            const JobScheduler = require("../../Jobs/JobScheduler");
            let rule = new schedule.RecurrenceRule();
            rule.second = job.rule.second;
            rule.minute = job.rule.minute;
            rule.hour = job.rule.hour;
            rule.date = job.rule.date;
            rule.month = job.rule.month;
            rule.year = job.rule.year;

            let endVoteJob = schedule.scheduleJob(job.name, rule, function () {
              JobScheduler.executeEndVotingPhase(endVoteJob, game);
            });
            console.log(
              "RESCHEDULE --executeEndVotingPhase-- ON SERVER RELOAD"
            );
          }
        } else {
          if (typeof job.rule === "object") {
            let jobSch = schedule.scheduleJob(job.name, job.rule, function () {
              Module[job.what](jobsArgs, jobSch);
            });
          } else {
            let jobSch = schedule.scheduleJob(job.name, job.rule, function () {
              Module[job.what](jobsArgs, jobSch);
            });
          }
        }
      } else {
        job.pending = false;
        await job.save();
      }
    }
  } catch (e) {
    console.log("ERROR WITH --executePendingGames-- FUNCTION, ERROR - ", e);
  }
}

module.exports = {
  eachBrandEachJob,
  executePendingGames,
};
