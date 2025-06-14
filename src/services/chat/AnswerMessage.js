const OnboardingScript = require('./onboardingScript')
const { SYSTEM_MESSAGE, TEXT, QUESTION } = require('../../constants/chatGameType')
const userRoles = require('../../constants/userRoles')
const Transaction = require('../../models/transaction')
const User = require('../../models/user')
const UserToken = require('../../models/userToken')
const Token = require('../../models/token')
const UserService = require('../../services/User/user')
const coinService = require('../Coin/coin')
const HttpStatus = require('http-status-codes')
const Mongoose = require('mongoose')
const { ONBOARDING_POOL_AMOUNT } = require('../../constants/onboarding')
const fieldType = require('../../constants/fieldChatGameType')
const symbolKeyWords = require('../../constants/symbolKeyWords')
const tokenType = require('../../constants/tokenType')
const TransactionType = require("../../constants/transactionType");

require("dotenv").config();

const saveAnswerMessage = async (req, res) => {
  let user = req.user

  const addToChatHistory = (messageReply) => {
    user.chatHistory.push({
      message: req.body.answer,
      field: req.body.field,
      isMyOwn: true,
    })
    if (messageReply) {
      user.chatHistory.push({
        message: messageReply,
        isMyOwn: false,
        field: req.body.field,
      })
    }
    user.systemMessageIndex++
  }

  let message
  try {
    if (!user.onboarding) {
      message = OnboardingScript[userRoles.USER][user.chatQuestionIndex]
      user.chatHistory[user.onboardingIndex].seen = true
      user.onboardingIndex++
    } else {
      return res
        .status(HttpStatus.CREATED)
        .json({ message: 'Success' })
    }
  } catch (err) {
    console.error(err.message)
    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: 'Server Error' })
  }

  if (
    !user.verifiedEmail &&
    message.chatGameType === SYSTEM_MESSAGE &&
    message.answerInputType === TEXT &&
    message.fieldName === fieldType.EMAIL_VERIFICATION
  ) {
    let pin = req.body.answer
    let response = await UserService.verifyEmail({
      pin: pin,
      id: user._id,
    })
    if (response.status !== 200) {
      return res.status(response.status).json({ message: response.message })
    }
    addToChatHistory(message.reply);
    await user.save()
    return res.status(HttpStatus.OK).json({ message: message })
  } else if (
    message.chatGameType === QUESTION &&
    message.answerInputType === TEXT
  ) {
    let response;
    switch (message.fieldName) {
      case fieldType.PHONE:
        let phone = req.body.answer
        // search for user with the same phone number
        const phoneExists = await User.findOne({ phoneNumber: phone });
        if (phoneExists) {
          return res.status(500).json({
            message: `Sorry there is already a user with this phone number.`,
          })
        }
        const formattedPhone = `+${phone.replace('+', '')}`;
        const isMobileResponse = await UserService.getPhoneType(formattedPhone);
        if (process.env.NODE_ENV === 'production' && isMobileResponse.status !== 200) {
          return res.status(500).json({
            message: isMobileResponse.message,
          })
        }
        response = await UserService.sendVerifyPhone(formattedPhone)
        if (response.status !== 200) {
          return res.status(500).json({
            message: `Sorry we couldn\'t send verification code to this phone number!`,
          })
        }
        addToChatHistory(message.reply)
        user.phoneNumber = phone;
        await user.save()
        return res.status(HttpStatus.OK).json({ message: message });
      case fieldType.PHONE_VERIFICATION:
        let pin = req.body.answer
        response = await UserService.verifyPhone(`+${user.phoneNumber.replace('+', '')}`, pin)
        if (response.status !== 200) {
          return res.status(500).json({
            message: `Sorry we couldn\'t verify the pin you entered.`,
          })
        }
        addToChatHistory(message.reply);
        await user.save()
        return res.status(HttpStatus.OK).json({ message: message });
    }
  }

  const session = await Mongoose.startSession()
  await session.startTransaction()

  // have problems with mongodb settings on local machine
  const opts = process.env.NODE_ENV === 'development' ? {} : { session };

  user.systemMessageIndex++
  user.chatHistory.push({
    message: req.body.answer,
    field: req.body.field,
    isMyOwn: true,
    messageCreationDate: new Date(),
  })
  let userField = message.fieldName === fieldType.FAVORITE_COLOR
    ? 'favoriteColor'
    : message.fieldName
  user[userField] = req.body.answer

  let token = await Token.find({
    name: { $regex: new RegExp(RegExp.escape(req.body.answer), 'i') },
    type: tokenType.ATTRIBUTE,
  })
  if (token.length) {
    let newToken = new UserToken({
      userEmail: user.email,
      tokenID: token[0]._id,
    })
    await newToken.save()
  }

  try {
    if (req.body.answer) {
      let answer = req.body.answer
      if (message.fieldName === fieldType.IMAGINATION) answer = 'for'
      await new Transaction({
        user: {
          email: user.email,
          id: user.id,
        },
        portal: 'Pushuser',
        symbol: [`${user.nodeID}`, symbolKeyWords.ADD, `${answer}`],
        reason: 'User added answer to question',
        event: `${user.username} added ${message.fieldName} ${req.body.answer}`,
        transactionCreated: new Date(),
      })
        .save()
        .catch((error) =>
          console.log(`Answer not saved in transactions, reason: ${error}`)
        )
    }
    if (message.action && !user.onboarding) {
      const transaction = new Transaction({
        received: true,
        user: {
          email: user.email,
          id: user.id,
        },
        coinAmount: ONBOARDING_POOL_AMOUNT,
        reason: 'Completing onboarding',
        portal: 'Pushuser',
        symbol: [
          `${user.nodeID}`,
          symbolKeyWords.COMPLETE,
          symbolKeyWords.ONBOARDING,
        ],
        event: `${user.username} completed onboarding.`,
        type: TransactionType.ONBOARDING,
        transactionCreated: new Date(),
      })
      await transaction.save(opts)
      coinService.handleCoinTransactions(parseInt(ONBOARDING_POOL_AMOUNT))

      user.coinCount = ONBOARDING_POOL_AMOUNT
      user.verified = true
    }
    if (user.onboarding) {
      opts['strict'] = false
      const update = {}
      update[message.fieldName] = req.body.answer
      update.chatHistory = user.chatHistory
      update.systemMessageIndex = user.systemMessageIndex
      update.coinCount = user.coinCount
      update.onboardingIndex = user.onboardingIndex
      update.verified = true
      await User.findByIdAndUpdate(user.id, update, opts)
    } else {
      await user.save(opts)
    }

    await session.commitTransaction()
    session.endSession()
  } catch (err) {
    await session.abortTransaction()
    console.error(err.message)
    session.endSession()
    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: 'Server Error' })
  }

  return res.status(HttpStatus.OK).json({ message: message })
}

module.exports = { saveAnswerMessage }
