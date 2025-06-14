const SystemScript = require('./systemScript');
var User = require("../../models/user");
const userTypes = require('../../constants/userType')
const systemMessageType = require('../../constants/systemMessageType');

const getNextSystemMessage = async (userEmail, messageType, dataToInclude=null) => {
  let user = await User.findOne({ email: userEmail, type: userTypes.PUSHUSER }).exec();
  try {
        let message = 'No pending messages';
        user.systemMessageIndex++
        message = SystemScript[messageType];
        if (messageType === systemMessageType.NEW_GAME) {
          message.message = `${String.fromCodePoint(0x1f60a)} Hey ${dataToInclude.username}. It's Kawaii from Imagine Council. Exciting news – a new play promo just dropped! Check it out here`
          message.link = `/game/${dataToInclude.gameId}?linkSeen=false`
          await pushMessage(message, user);
          return true
        } else if (messageType === systemMessageType.REMIND_USER_OF_GAME_IN_PLAY) {
          message.message = `${String.fromCodePoint(0x1f4a5)} Hey ${dataToInclude.username}. It's Kawaii from Imagine Council. A new play just started, and we'd love your ideas. GO Play and earn now!`
          message.link = `/game/${dataToInclude.gameId}?linkSeen=false`
          await pushMessage(message, user);
          return true
        } else if (messageType === systemMessageType.VOTE_GAME) {
          message.message = `${String.fromCodePoint(0x1f9be)} What's up, ${dataToInclude.username}! It's Kawaii again from Imagine Council. The plays are in, and now it's time to vote for your favorites and least favorites! GO VOTE!.`
          message.link = `/game/${dataToInclude.gameId}?linkSeen=false`
          await pushMessage(message, user);
          return true
        } else if (messageType === systemMessageType.COINS_DISTRIBUTED) {
          message.message = `${String.fromCodePoint(0x26a1)} Hey ${dataToInclude.username} -- Kawaii here from Imagine Council. Votes are in! GO check out the ranks and royalty percentages!`
          message.link = `/game/${dataToInclude.gameId}?ranks=true&linkSeen=false`
          await pushMessage(message, user);
          return true
        } else if (messageType === systemMessageType.ROYALTY) {
          message.message = `Yo ${dataToInclude.username} -- Ranks are in and you just staked your royalty of (x)% out of 20% and also made ${dataToInclude.coins} points out ${dataToInclude.poolAmount} pool of points on the play "${dataToInclude.gameName}”. 
          We are now creating and building the collectible. Will keep you up to date progress.`
          await pushMessage(message, user);
          return true
        } else if (messageType === systemMessageType.POTENTIAL_EARNING) {
          message.message = `What up ${dataToInclude.username}! Based on your play for portal ${dataToInclude.brand} you staked ${dataToInclude.stake}% — your potential earnings from the play will be ${dataToInclude.earning} based on a supply of (x). 
          The collectible is has been created, built and now for sale.`
          let pictureMessage = SystemScript[systemMessageType.PRODUCT_PICTURE];
          pictureMessage.picture = dataToInclude.image
          pictureMessage.message = "product picture"
          await pushMessage(message, user);
          await pushMessage(pictureMessage, user);
          return true
        }
  } catch (err) {
    console.error(err.message);
    return false
  }
}

const pushMessage = async (message, user) => {
  user.hasNewMessage = true;
  user.chatHistory.push({
    message: message.message,
    isMyOwn: false,
    chatGameType: message.chatGameType,
    field: message.fieldName,
    picture: message.picture,
    link: message.link ? message.link: "",
    messageCreationDate: new Date()
  });

  await user.save();
}

module.exports = { getNextSystemMessage }
