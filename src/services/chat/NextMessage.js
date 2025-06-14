const OnboardingScript = require('./onboardingScript')
const userRoles = require('../../constants/userRoles')
const HttpStatus = require('http-status-codes')
const answerType = require('../../constants/onboardingScriptAnswers')
var User = require('../../models/user')
const fieldType = require('../../constants/fieldChatGameType')

const getNextMessage = async (req, res) => {
  let user = await User.findOne({
    email: req.body.userEmail,
  }).exec()
  if (!user || user === null) {
    res.status(HttpStatus.BAD_REQUEST).json({ message: 'User not found' })
  }
  if (!user?.verifiedEmail) {
    if (!user?.chatHistory?.length) {
      user.chatQuestionIndex++
      user.systemMessageIndex++
      message = OnboardingScript[userRoles.USER][user.chatQuestionIndex]
      await pushMessage(message, user)
      return res.status(HttpStatus.OK).json({
        message,
        chatHistory: user.chatHistory,
        onboardingIndex: user.onboardingIndex,
      })
    } else {
      return res.status(HttpStatus.OK).json({
        message: '',
        chatHistory: user.chatHistory,
        onboardingIndex: user.onboardingIndex,
      })
    }
  }
  try {
    let message = 'No pending messages'
    if (!req.body.newMessage) {
      message = OnboardingScript[userRoles.USER][user.chatQuestionIndex]
    } else {
      user.chatQuestionIndex++
      user.systemMessageIndex++
      if (user.chatQuestionIndex < OnboardingScript[userRoles.USER].length) {
        message = OnboardingScript[userRoles.USER][user.chatQuestionIndex]
        if (user.chatHistory[user.onboardingIndex]) {
          user.chatHistory[user.onboardingIndex].seen = true
        }
        if (message.fieldName === fieldType.GREETING_USER) {
          let newMessageToPush = message;
          newMessageToPush.message = `What up ${user.username} ${String.fromCodePoint(0x2757)} My name is "Kawaii", welcome to Imagine Council.`,
          await pushMessage(newMessageToPush, user)
        } else if (message.fieldName === fieldType.FAVORITE_COLOR) {
          let answeredHub = user.chatHistory[user.chatHistory.length -1].message
          let fillNewMessageText = answerType.answerHubType[`${answeredHub}`]
          message.message = `OK! Shoutout to ${fillNewMessageText} Now I need to know your vibe — so to do that — What-is-your-favorite-color?`
          await pushMessage(message, user)
        } else if (message.fieldName === fieldType.CREATIVE) {
          let answeredColor = user.chatHistory[user.chatHistory.length -1].message
          let fillNewMessageText = answerType.answerColorType[`${answeredColor}`]
          message.message = `Cool. ${fillNewMessageText} Now I need to know your vibes coming into the society.`
          await pushMessage(message, user)
        } else if (message.fieldName === fieldType.AVATAR) {
          message.message = user.nodeID
          await pushMessage(message, user)
        } else {
          await pushMessage(message, user)
        }
      }
    }

    res.status(HttpStatus.OK).json({
      message,
      chatHistory: user.chatHistory,
      onboardingIndex: user.onboardingIndex,
    })
  } catch (err) {
    console.error(err.message)
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: 'Server Error' })
  }
}

const pushMessage = async (message, user) => {
  user.chatHistory.push({
    message: message.message,
    messageId: message.id,
    isMyOwn: message.isMyOwn || false,
    seen: message.fieldName === fieldType.END,
    chatGameType: message.chatGameType,
    field: message.fieldName,
    picture: message.picture,
    messageCreationDate: new Date(),
  })

  if (user.onboardingIndex > 0) {
    user.onboardingIndex++
  }

  await user.save()
}

module.exports = { getNextMessage }
