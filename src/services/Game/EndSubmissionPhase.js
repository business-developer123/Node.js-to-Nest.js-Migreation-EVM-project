require("dotenv").config();
const schedule = require("node-schedule");
const Game = require("../../models/game");
const GameSave = require("../../models/gameSave");
const SendGridClient = require("../SendGrid/Client");
const EmailService = require("../Email/email");
const gameStatus = require("../../constants/gameStatus");
const JobService = require("../Job/job");
const jobActions = require("../../constants/jobActions");
const JobScheduler = require("../../Jobs/JobScheduler");
const NextSystemMessage = require("../chat/NextSystemMessages");
const systemMessageType = require("../../constants/systemMessageType");
const emailService = require("../Email/email");
const userType = require("../../constants/userType");
const Twillio = require("../Twilio/twillio");
const User = require("../../models/user");

function getFrom() {
  let domain = process.env.URL_IMAGINE;
  let from = domain.replace("https://", "").replace("/", "");
  if (from.includes("localhost")) from = "localhost";
  from = `noreply@` + from;
  return { domain: domain, from: from };
}

async function execute(job, gameInPlay) {
  try {
    if (gameInPlay) {
      console.log("gameInPlay", gameInPlay?.id);
      var gameInSubmission = await Game.findOne({ _id: gameInPlay._id })
          .populate("brandId")
          .exec();
      job?.cancel();
      if (gameInSubmission) {
        // MAKE NEW END DATE FOR GAME - DEPRECATED
        // gameInSubmission.endDate = Date.now() + 86400000; // 10 min - 600000, 86400000 - 24h
        var submissions = await GameSave.find({
          gameId: gameInSubmission.id,
          submission: { $ne: "" },
        })
            .populate("userId")
            .exec();
        var submissionThreshold = submissions.length >= Math.floor(Math.pow(gameInSubmission.numPlayers, 0.75));

        if (submissionThreshold) {
          console.log('START VOTING PHASE')
          // IF SUBMISSION COUNT IF ENPUGH, START VOTING PHASE
          gameInSubmission.state = gameStatus.VOTING; // change phase to voting
          gameInSubmission.attempt = 1; // reset attempt

          // SET RULE TO START END VOTING PHASE JOB
          console.log('TIME TO END VOTE PHASE', gameInPlay.voteTime);
          const voteTime = new Date(gameInSubmission.voteTime);
          const startSecond = voteTime.getSeconds();
          const startMinute = voteTime.getMinutes();
          const startHour = voteTime.getHours();
          const startDate = voteTime.getDate();
          const startMonth = voteTime.getMonth();
          const startYear = voteTime.getFullYear();

          let rule = new schedule.RecurrenceRule();
          // rule.tz = "Europe/Kiev";
          // runs at 16:00:30 NY time
          rule.second = startSecond;
          rule.minute = startMinute;
          rule.hour = startHour;
          rule.date = startDate;
          rule.month = startMonth;
          rule.year = startYear;

          // const startTime = Date.now() + 86280000 //86280000 - DEPRECATED
          const jobName = `end-voting-${gameInSubmission.id}-${gameInSubmission.name}`;
          // const jobRule = "*/1 * * * * *";

          // DELETE OLD JOBS
          await JobService.removePending(`remid-users-to-play-${gameInSubmission.id}`);
          await JobService.removePending(`end-submission-${gameInSubmission.id}`);


          //SEND NOTIFICATION AND MESSAGE TO VOTE
          for (const user of gameInSubmission.usersToShow) {
            await NextSystemMessage.getNextSystemMessage(
                user?.email,
                systemMessageType.VOTE_GAME,
                { gameId: gameInSubmission?._id,
                  gameName: gameInSubmission?.name,
                  username: user.username,
                  brand: gameInSubmission?.brandId?.username
                });
            await emailService.sendEmailReminderToVote(user)
          }

          var domain = process.env.URL_IMAGINE
          const sendMessagePromises = gameInSubmission?.usersToShow?.map(async (user) => {
            try {
              const userFromDb = await User.findById(user._id).exec();
              await Twillio.sendMessage(userFromDb?.phoneNumber, `${String.fromCodePoint(0x1f9be)} What's up, ${user.username}! It's Kawaii again from Imagine Council. The plays are in, and now it's time to vote for your favorites and least favorites! GO VOTE! ${domain}`);
              return { status: 'fulfilled', user: user.username };
            } catch (error) {
              return { status: 'rejected', user: user.username, error: error.message };
            }
          });
          await Promise.allSettled(sendMessagePromises);


          //
          await JobService.createJob({
            name: jobName,
            startTime: voteTime,
            args: gameInSubmission,
            endDate: null,
            rule: rule,
            what: jobActions.END_VOTING,
          });
          const JobScheduler = require("../../Jobs/JobScheduler");
          const jobEndVotingPhase = schedule.scheduleJob(
              jobName,
              rule,
              () => {
                JobScheduler.executeEndVotingPhase(
                    jobEndVotingPhase,
                    gameInSubmission
                );
              }
          );

          io.emit(`changeState for game - ${gameInSubmission.id}`, gameInSubmission);
          // for (let s of submissions) {
          //   let { domain, from } = getFrom();
          //   var html = `<div><h4>Voting Time!</h4><p>${String.fromCodePoint(
          //     0x1f44b
          //   )} You have plays to vote on. Go vote on Imagine Council. ${String.fromCodePoint(
          //     0x1f4a5
          //   )}</p><br>\
          //                 <a href="${domain}">${domain}</a></div>`;
          //   var subject = `New votes ${String.fromCodePoint(0x1f5f3)}`;
          //   console.log("send email to user", s.userId.email);
          //   const fromName = "ImagineCouncil";
          //   await SendGridClient.sendEmail(
          //     from,
          //     html,
          //     subject,
          //     s.userId.email,
          //     fromName
          //   ).catch((error) => {
          //     console.error(
          //       `Failed to send email. [error = ${error}, userId = ${s.userId.id}]`
          //     );
          //   });
          // }
        } else {
          await JobService.removePending(`end-submission-${gameInSubmission.id}`);

          if (gameInSubmission.attempt > 1) {
            gameInSubmission.state = gameStatus.FAILED;
            gameInSubmission.token = null;
            gameInSubmission.tokenID = null;
            gameInSubmission.idOfToken = ' ';

            io.emit(`changeState for game - ${gameInSubmission._id}`, gameInSubmission);
            console.log("FALED GAME: RESON -> attempt > 1")
          } else {
            let gameSavesNotVoted = await GameSave.find({
              gameId: gameInSubmission.id,
              state: "NO_SUBMISSION",
            }).populate("userId");
            //EMAIL PLAY GAME
            for (let gameS of gameSavesNotVoted) {
              await EmailService.sendEmailForNotMeetingSubmissionTreshold(
                  gameS.userId.email,
                  gameInSubmission.brandId.businessName,
                  gameInSubmission.name,
                  gameS.userId.username,
              );
            }

            const startTime = new Date(gameInPlay.startTime);
            const playTime = new Date(gameInPlay.playTime);
            const voteTime = new Date(gameInPlay.voteTime);

            //Here we count the time of the submission phase
            const timeDifference = playTime - startTime;
            //Here we add the same time to the submission phase
            const newPlayTime = new Date(playTime.getTime() + timeDifference);
            //Here we add the same time to the start of the voting phase and update it in db
            const newVoteTime = new Date(voteTime.getTime() + timeDifference);

            const game = await Game.findOneAndUpdate(
                {_id: gameInPlay.id},
                {
                  playTime: newPlayTime,
                  voteTime: newVoteTime
                });

            const newPlayTimeStart = new Date(newPlayTime);

            const startSecond = newPlayTimeStart.getSeconds();
            const startMinute = newPlayTimeStart.getMinutes();
            const startHour = newPlayTimeStart.getHours();
            const startDate = newPlayTimeStart.getDate();
            const startMonth = newPlayTimeStart.getMonth();
            const startYear = newPlayTimeStart.getFullYear();

            let rule = new schedule.RecurrenceRule();
            // rule.tz = "Europe/Kiev";
            // runs at 16:00:30 NY time
            rule.second = startSecond;
            rule.minute = startMinute;
            rule.hour = startHour;
            rule.date = startDate;
            rule.month = startMonth;
            rule.year = startYear;


            const jobName = `end-submission-${gameInSubmission.id}`;
            const JobScheduler = require("../../Jobs/JobScheduler");
            await JobService.createJob({
              name: jobName,
              startTime: newPlayTimeStart,
              endTime: null,
              args: game,
              rule: rule,
              what: jobActions.END_SUBMISSION,
            });
            const jobEndSubmissionPhase = schedule.scheduleJob(
                jobName,
                rule,
                () => {
                  JobScheduler.executeEndSubmissionPhase(
                      jobEndSubmissionPhase,
                      game,
                  );
                }
            );
            gameInSubmission.attempt++;
            gameInSubmission.isPlayTimeExtended = true;
            gameInSubmission.playTime = newPlayTime;
            gameInSubmission.voteTime = newVoteTime;
            io.emit(`changeState for game - ${gameInSubmission._id}`, gameInSubmission);
          }
        }
        await gameInSubmission.save().catch((error) => {
          console.log("Unable to update Game, " + error);
        });
      }
    }
  } catch (e) {
    console.log('ERROR WITH END SUBMMISION PHASE  --execute-- FUNCTION, ERROR -> ', e)
  }
}

module.exports = { execute };
