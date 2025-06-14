require("dotenv").config();
const GameSave = require("../../models/gameSave");
const Mongoose = require("mongoose");
const SendGridClient = require("../SendGrid/Client");
const Transaction = require("../../models/transaction");
const Object = require("../../models/object");
const Product = require("../../models/product");
const GpcAccount = require("../../models/gpcAccount");
const User = require("../../models/user");
const userType = require("../../constants/userType");
const NextSystemMessage = require("../chat/NextSystemMessages");
const coinService = require("../Coin/coin");
const systemMessageType = require("../../constants/systemMessageType");
const symbolKeyWords = require("../../constants/symbolKeyWords");
const Twillio = require("../Twilio/twillio");
const TransactionType = require("../../constants/transactionType");

// let productBuiltMessageQueue = []
async function execute(game, royaltySet) {
  try {
    const { gameSaves, scores, totalScore } = await calculateRanks(game.id);
    // let pushuserProductValue = 0.2
    // var product = await Product.findOne({_id: game.productId}).exec()
    // if (product) {
    //     pushuserProductValue = 0.2 * product.cost
    // }
    const session = await Mongoose.startSession();
    session.startTransaction();

    for (let gs of gameSaves) {
      var object = await Object.findOne({
        users: gs.userId.email,
        gameId: gs.gameId,
      }).exec();
      let brandName = game.brandId.businessName
        ? game.brandId.businessName
        : "brand";
      var royalty = (scores[gs.id] / totalScore) * 100;
      royalty = royalty.toPrecision(4);
      var coinsDistributed = Math.floor((royalty / 100) * game.poolAmount);

      await coinService
        .handleDistributionPhase(coinsDistributed)
        .catch((error) =>
          console.log("Points not distributed properly ", error)
        );
      const trans = new Transaction({
        user: {
          email: gs.userId.email,
          id: gs.userId._id,
          symbol: gs.userId.nodeID,
        },
        storyId: game.storyId,
        type: TransactionType.DISTRIBUTION,
        coinAmount: coinsDistributed,
        symbol: [
          `${gs.userId.nodeID}`,
          symbolKeyWords.PAY,
          symbolKeyWords.BY,
          brandName,
        ],
        portal: "Pushuser",
        event: `${gs.userId.username} paid by ${brandName}`,
        transactionCreated: new Date(),
      });
      await trans
        .save()
        .catch((error) =>
          handleError(
            "Failed to create transaction for user was paid by brand " + error,
            session
          )
        );

      if (royaltySet) {
        gs.royalty = royalty;
      }
      gs.percentage = royalty / 100;
      if (object) {
        object.royalty = royalty;
        object.percentage = royalty / 100;
        await object
          .save()
          .catch((error) =>
            console.log(
              `error while saving object ${object._id}, error: ${error}`
            )
          );
      }

      gs.userId.coinCount += coinsDistributed;
      await gs.userId.save().catch((error) => {
        handleError("Failed to update user. " + error, session);
      });
      gs.markModified("royalty");
      gs.markModified("percentage");
      console.log("gs.royalty", gs.royalty);
      await gs.save().catch((error) => {
        handleError("Failed to update gameSave. " + error, session);
      });
      // let userStake = royalty / 100
      // let potentialEarning = userStake * pushuserProductValue * 250

      await NextSystemMessage.getNextSystemMessage(
        gs.userId.email,
        systemMessageType.COINS_DISTRIBUTED,
        {
          gameId: gs.gameId,
          gameName: game.name,
          username: gs.userId.username,
          poolAmount: game.poolAmount,
          earning: coinsDistributed / 100,
          coins: coinsDistributed,
          // product: product.name,
          brand: brandName,
        }
      );
      // let productImage = product.images[0] ? product.images[0] : ""
      // productBuiltMessageQueue.push({brandName: brandName, username: gs.userId.username, user: gs.userId.email, userStake: userStake, potentialEarning: potentialEarning, product: product.name, productImage: productImage})
      var domain = process.env.URL_PUSHUSER;
      var from = domain.replace("https://", "").replace("/", "");
      if (from.includes("localhost")) from = "localhost";
      from = "noreply@" + from;
      var html = `<div>
<h4>${String.fromCodePoint(0x26a1)} Royalty are ready!</h4>
<p>${String.fromCodePoint(0x26a1)} HEY ${
        gs.userId.username
      } — Kawaii here from Imagine Council. Votes are in! GO check out the ranks and royalty percentages!</p><br><a href="${domain}">${domain}</a></div>`;
      var subject = `${String.fromCodePoint(0x26a1)} Royalty are ready!`;
      const fromName = "ImagineCouncil";
      await SendGridClient.sendEmail(
        from,
        html,
        subject,
        gs.userId.email,
        fromName
      ).catch((error) =>
        console.log(
          `error while sending email to ${gs.userId.email}, error: ${error}`
        )
      );
    }

    const sendMessagePromises = game.usersToShow.map(async (user) => {
      try {
        const userFromDb = await User.findById(user._id).exec();
        await Twillio.sendMessage(
          userFromDb?.phoneNumber,
          `${String.fromCodePoint(0x26a1)} HEY ${
            user.username
          }! — Kawaii here from Imagine Council. Votes are in! GO check out the ranks and royalty percentages! ${domain}`
        );
        return { status: "fulfilled", user: user.username };
      } catch (error) {
        return {
          status: "rejected",
          user: user.username,
          error: error.message,
        };
      }
    });
    await Promise.allSettled(sendMessagePromises);

    game.state = "COMPLETE";
    await game
      .save()
      .catch((error) =>
        handleError("Failed to update game. " + error, session)
      );
    // setTimeout(() => {
    //     productBuiltMessageQueue.forEach(async mq => {
    //         console.log('mq', mq.user)
    //         var domain = process.env.URL_PUSHUSER;
    //         var from = domain.replace('https://', '').replace('/', '')
    //         if (from.includes('localhost')) from = 'localhost'
    //         from = 'PushUser@' + from
    //         var html = `<div><p>${String.fromCodePoint(0x1F44B)} You have new message from me — Kawaii. ${String.fromCodePoint(0x1F4A5)}</p></div>`
    //         var subject = `Object Built ${String.fromCodePoint(0x1F6E0)}`
    //         await SendGridClient.sendEmail(from, html, subject, mq.user).catch(error => console.log(`error while sending email to ${mq.user}, error: ${error}`))
    //         await NextSystemMessage.getNextSystemMessage(
    //             mq.user,
    //             systemMessageType.POTENTIAL_EARNING,
    //             { username: mq.username,
    //               productName: mq.product,
    //               stake: mq.userStake,
    //               earning: mq.potentialEarning,
    //               image: mq.productImage,
    //               brand: mq.brandName
    //             })
    //     })
    // }, 120000)
    await session.commitTransaction();
    session.endSession();
  } catch (e) {
    console.log("ERROR WITH DISTRIBUTION RHASE EXECUTE FUNCTION, ERROR - ", e);
  }
}

function handleError(message, session) {
  console.log(message);
  session.abortTransaction();
  session.endSession();
  throw message;
}

const calculateRanks = async (gameId) => {
  var gameSaves = await GameSave.find({
    gameId: gameId,
    votes: { $ne: null },
    submission: { $ne: "" },
  })
    .populate("userId")
    .exec();
  var scores = {};
  var totalScore = 0;
  for (let gs of gameSaves) {
    var points = 0;
    var totalVotes = 0;
    for (var key in gs.votes) {
      points += gs.votes[key] * (7 - parseInt(key));
      totalVotes += gs.votes[key];
    }
    scores[gs.id] = Math.pow(points / totalVotes, Math.log(gameSaves.length));
    totalScore += scores[gs.id];
  }

  return { gameSaves, scores, totalScore };
};

module.exports = { execute, calculateRanks };
