const Mongoose = require("mongoose");
const HttpStatus = require("http-status-codes");
var bcrypt = require("bcrypt-nodejs");
const { uuid } = require("uuidv4");
const FileSystem = require("file-system");
const StripeClient = require("../Stripe/Client");
const emailTypes = require("../../constants/emailType");
const emailService = require("../Email/email");
const Tools = require("../Tools/Tools");
var User = require("../../models/user");
const Transaction = require("../../models/transaction");
const { DIRECT, INDIRECT, SPECIFIC } = require("../../constants/chatQueryType");
const OnboardingScript = require("../chat/onboardingScript");
const { USER } = require("../../constants/userRoles");
const ChatGame = require("../../models/chatGame");
const Portal = require("../../models/portal");
const Unit = require("../../models/unit");
const Order = require("../../models/order");
const GpcAccount = require("../../models/gpcAccount");
const UnitType = require("../../constants/unitType");
const S3 = require("../S3/S3Service");
const gpcService = require("../Gpc/gpc");
const userTypes = require("../../constants/userType");
// const systemMessageType = require('../../constants/systemMessageType')
// const NextSystemMessage = require('../chat/NextSystemMessages')
const GameService = require("../Game/GameService");
const AddUserToGamesService = require("../Game/AddUserToGames");
const stripeClient = require("../Stripe/Client");
const symbolKeyWords = require("../../constants/symbolKeyWords");
const BlockchainService = require("../../services/Blockchain/blockchain");
require("dotenv").config();

const twilioClient = require("twilio")(
  process.env.TWILIO_ACCOUNT_ID,
  process.env.TWILIO_AUTH_TOKEN,
  {
    logLevel: "debug",
  }
);
const DEFAULT_LIMIT = 50;
const SMS_CONFIRMATION_READY = false;

function hashPassword(password) {
  let salt = bcrypt.genSaltSync();
  let hash = bcrypt.hashSync(password, salt);
  return hash;
}

async function signUpUser(userData) {
  let nodeImage = `https://used-node-images.s3.amazonaws.com/node_design_ID_bacth3-26.png`;
  if (process.env.NODE_ENV !== "development") {
    const imageName = await S3.getRandomNodeImageFromBucket();
    await S3.nodeImageFromS3AndMoveToUsedBucket(imageName);
    nodeImage = `https://used-node-images.s3.amazonaws.com/${imageName}`;

    if (nodeImage === null) {
      return {
        message: "Error while creating user, no free images.",
        status: 500,
      };
    }
  }

  const session = await Mongoose.startSession();
  session.startTransaction();
  let errorMessage = "";
  let { username, email, password, type, birthDate, phone } = userData;
  const newPin = Tools.generatePin();
  let user = await User.register(
    new User({
      username: username,
      email: email,
      // phoneNumber: phone,
      phoneNumber: uuid(), // FIXME temporary solution
      type: type,
      password: hashPassword(password),
      coinCount: "0",
      verified: false,
      bank: false,
      card: false,
      stripeID: "",
      onboarding: false,
      birthDate: birthDate ? birthDate : null,
      zone: "",
      hub: "",
      creative: "",
      favoriteColor: "",
      onboarding: false,
      identification: "",
      nodeID: nodeImage,
      verifiedPhone: true,
      verifyEmail: {
        verifyEmail: {
          pin: newPin,
          expiration: Date.now() + 3600000,
        },
      },
    }),
    password
  ).catch((error) => {
    errorMessage = `Unable to create user. User with this username or email already exists.`;
    console.error(errorMessage);
    session.abortTransaction();
    session.endSession();
  });
  if (errorMessage) return { message: errorMessage, status: 500 };

  // FIXME I think we need create stripe customer during onboarding because we need to create customer with phone number
  let customerId = await StripeClient.createCustomer(
    `user ${user.id}`,
    user.email,
    user.username,
    // user.phoneNumber,
    "+17864206154" // FIXME add real phone here
  ).catch((error) => {
    session.abortTransaction();
    session.endSession();
    return {
      message: `Error: Unable to create customer in Stripe, ${error}`,
      status: 500,
    };
  });
  user.stripeCustomerID = customerId;

  const ethAddress = await BlockchainService.generateAddress();
  user.ethAddress = ethAddress.address;

  user.save().catch((error) => {
    session.abortTransaction();
    session.endSession();
    return { message: `Error: Unable to update user, ${error}`, status: 500 };
  });

  await new Transaction({
    user: {
      email: user.email,
      id: user.id,
    },
    portal: "pushuser",
    reason: "New user",
    symbol: [`${user.nodeID}`, symbolKeyWords.ENTER, symbolKeyWords.PUSHUSER],
    event: `${user.username} enters Imagine Council`,
    transactionCreated: new Date(),
  })
    .save()
    .catch((error) =>
      console.log(`New user not saved in transactions, reason: ${error}`)
    );

  if (SMS_CONFIRMATION_READY) {
    await twilioClient.messages.create({
      to: `+1${phone}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      body: `Welcome to Imagine Council! Log in and enter this pin - ${newPin} - to start chat with character Kawaii.`,
    });
  } else {
    await emailService.sendMail(user, emailTypes.VERIFY_EMAIL, "verifyEmail", {
      pin: newPin,
    });
  }

  new Unit({
    unitType: UnitType.USER,
    image: user.nodeID,
    name: user.username,
    unitId: user._id,
  })
    .save()
    .catch((error) => {
      session.abortTransaction();
      session.endSession();
      return { message: `Error: Unable to create unit, ${error}`, status: 500 };
    });

  await session.commitTransaction();
  session.endSession();
  return { message: "Success", status: 200 };
}

async function getUserData(user, isPrivate = false) {
  let userData = {
    color: user.favoriteColor,
    hub: user.hub,
    creative: user.creative,
    node_id: user.nodeID,
    username: user.username,
  };

  if (isPrivate) {
    let stripeAccountVerified = false;
    if (user.stripeAccountID) {
      const stripeAccount = await StripeClient.retrieveStripeAccount(
        user.stripeAccountID
      );
      stripeAccountVerified =
        stripeAccount.charges_enabled && stripeAccount.payouts_enabled;
    }
    userData = {
      ...userData,
      _id: user._id,
      verifiedEmail: user.verifiedEmail,
      type: user.type,
      bank: user.bank,
      coins: user.coinCount,
      entry: user.entry,
      hasNewMessage: user.hasNewMessage,
      systemMessageIndex: user.systemMessageIndex,
      onboardingIndex: user.onboardingIndex,
      onboarding: user.onboarding,
      email: user.email,
      verified: user.verified,
      zone: user.zone,
      gpcAccount: user.gpcAccount,
      address: user.address,
      first_name: user.firstName,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phoneNumber,
      verifiedPhone: user.verifiedPhone,
      ethAddress: user.ethAddress,
      goBorbBalance: user.goBorbBalance,
      role: user.role,
      creationDate: user.creationDate,
      birthDate: user.birthDate,
      stripeAccountID: user.stripeAccountID,
      stripeAccountVerified: stripeAccountVerified,
      // last4Acc: user.last4Acc,
      // debit_card: user.card,
    };
  }
  return { message: "Success", user_data: userData };
}

async function getUserChatHistory(userEmail) {
  let user = await User.findOne({
    email: userEmail,
    type: userTypes.PUSHUSER,
  }).exec();
  if (user) {
    return { message: "Success", chatHistory: user.chatHistory };
  } else {
    return { message: "Unsuccess", chatHistory: [] };
  }
}

async function resetPassword(userId, password) {
  let errorMessage = "";
  let user = await User.findById(userId)
    .exec()
    .catch((error) => {
      errorMessage = error;
    });
  if (!user || errorMessage) {
    return {
      message: `Failed to find user`,
      status: 500,
    };
  }

  (user.password = hashPassword(password)), user.markModified("password");
  await user.save();
  return { message: "Success", status: 200 };
}

async function forgotPassword(email, type) {
  let user = await User.findOne({ email: email, type: type }).exec();

  if (user === null) {
    return { message: `User does not exist. [email = ${email}]`, status: 500 };
  }
  //sendResetPasswordEmail
  let updatedUser = await emailService.sendMail(
    user,
    emailTypes.RESET_PASSWORD,
    "password"
  );
  await updatedUser.save().catch((error) => {
    return {
      message: `Failed to update user. [id = ${user.id}, error = ${error}]`,
      status: 500,
    };
  });

  return { message: "Success", status: 200 };
}

async function patchUser(email, patchData) {
  let user = await User.findOne({ email: email }).exec();

  if (patchData.deliveryOption) {
    user.deliveryOption = patchData.deliveryOption;
  }
  if (patchData.street) {
    user.address.street = patchData.street;
    user.address.city = patchData.city;
    user.address.zip = patchData.zip;
    user.address.state = patchData.state;
  }
  if (patchData.phoneNumber) {
    user.phoneNumber = patchData.phoneNumber;
  }
  if (patchData.firstName) {
    user.firstName = patchData.firstName;
  }
  if (patchData.lastName) {
    user.lastName = patchData.lastName;
  }
  if (patchData.number) {
    user.last4Card = patchData.number.substr(patchData.number.length - 4);
  }
  if (patchData.hasOwnProperty("tag")) {
    user.tag = patchData.tag;
  }
  await user.save();
  return { message: "Success", status: 200 };
}

async function sendVerifyEmail(userEmail) {
  // let user = await User.findOne({ email: userEmail, type: userTypes.PUSHUSER })
  let user = await User.findOne({ email: userEmail });
  await emailService.sendMail(user, emailTypes.VERIFY_EMAIL, "verifyEmail");
  user.markModified("verifyEmail");
  await user.save();
  return { message: "Success", status: 200 };
}

async function userOnboarded(userEmail) {
  try {
    let user = await User.findOne({
      email: userEmail,
      // type: userTypes.PUSHUSER,
    }).exec();
    await emailService.sendMail(user, emailTypes.PUSHUSER_APPROVED, "approved");
    user.onboarding = true;
    user.markModified("onboarding");
    await user.save();
    await AddUserToGamesService.addUserToGames(user);
    return { message: "Success", status: 200 };
  } catch (error) {
    return { message: "Couln't find user", status: 200 };
  }
}

async function updatePassword(userData) {
  let user = await User.findOne({
    email: userData.email,
  });
  const { oldPass, newPass } = userData;
  if (!bcrypt.compareSync(oldPass, user.password)) {
    return { message: "Password don't match", status: 500, user: null };
  } else {
    user.password = hashPassword(newPass);
  }
  await user.save();
  return { message: "Success", status: 200 };
}

async function updateEmail(userData) {
  let user = await User.findOne({
    email: userData.email,
  });
  user.email = userData.newEmail;
  await user.save();
  let updatedUser = await getUserData(user, true);
  return { message: "Success", status: 200, user: updatedUser.user_data };
}

async function updateAccount(userData) {
  let user = await User.findOne({
    email: userData.email,
    //  type: userTypes.PUSHUSER,
  });

  user.hub = userData.hub;
  user.creative = userData.creative;
  user.favoriteColor = userData.color;
  user.username = userData.username;

  await user.save().catch((error) => {
    return {
      message: `Failed to save informations`,
      status: 500,
      user: null,
    };
  });

  let updatedUser = await getUserData(user, true);
  return { message: "Success", status: 200, user: updatedUser.user_data };
}

async function updateRoyalties(userData) {
  let user = await User.findOne({
    email: userData.email,
  }).exec();

  user.connectRoyalties = userData.connectRoyalties;
  user.royalties = userData.royalties;

  await user.save().catch((error) => {
    return {
      message: error.message,
      status: 500,
      user: null,
    };
  });

  return { message: "Success", status: 200 };
}

async function verifyEmail(userData) {
  let { id, pin } = userData;
  let errorMessage = "";
  let user = await User.findOne({ _id: id })
    .exec()
    .catch((error) => (errorMessage = `User not found. ${error}`));
  if (!user || errorMessage)
    return { message: `User not found. ${errorMessage}`, status: 500 };

  if (
    !(
      user.verifyEmail &&
      user.verifyEmail.verifyEmail &&
      user.verifyEmail.verifyEmail.pin === pin
    )
  ) {
    return {
      message: `Sorry the pin you enterd is not correct, please check again or hit 'Send Again'!`,
      status: 500,
    };
  }

  if (Date.now() > user.verifyEmail.verifyEmail.expiration) {
    // await emailService.sendMail(user, emailTypes.VERIFY_EMAIL, 'pin')
    // user.markModified('verifyEmail')
    // await user.save()
    return {
      message: `Uuuups, This verification link is expired, click 'Send Again' to get new one!`,
      status: 500,
    };
  }

  user.verifiedEmail = true;
  delete user.verifyEmail.verifyEmail;
  user.markModified("verifyEmail");
  await user.save().catch((error) => {
    return { message: `Failed to verify email. ${error}`, status: 500 };
  });

  return { message: "Success", status: 200 };
}

//this function is not used for now, completeOnboarding is called from chat
async function completeOnboarding(user, userdata) {
  let { zone, hub, creative, favoriteColor } = userdata;
  var date = new Date();
  user.coinCount = "500";
  user.onboarding = true;
  user.zone = zone;
  user.hub = hub;
  user.creative = creative;
  user.favoriteColor = favoriteColor;
  var transaction = new Transaction({
    user: {
      email: user.email,
      id: user.id,
    },
    received: true,
    coinAmount: 500,
    portal: "pushuser",
    reason: "finishing onboarding",
    event: user.email + " has received 500 points from completing onboarding",
    transactionCreated: date,
  });
  transaction.save();
  let gpcAcc = await GpcAccount.findOne({ userId: user.userId });
  gpcAcc.coinCount += 500;
  gpcAcc.save();
  user.save((err, user) => {
    if (err) {
      return { message: `Error: ${err}`, status: 500 };
    }
    return { message: "Success", status: 200 };
  });
}

async function getGpcUser(user) {
  let gpcUser = await gpcService.getAccount(user);
  if (gpcUser && gpcUser.account) {
    return { message: "Success", gpcUser: gpcUser.account };
  } else {
    return { message: gpcUser.message, gpcUser: null };
  }
}

async function getUser(userEmail, userType) {
  let type = userType ? userType : userTypes.PUSHUSER;
  let user = await User.findOne({ email: userEmail, type: type }).exec();
  const userData = await getUserData(user, true);
  if (user) {
    return { message: "Success", user_data: userData.user_data };
  } else {
    return { message: "User not found", user_data: null };
  }
}

async function getUserOrders(userEmail, userType) {
  let user = await User.findOne({ email: userEmail, type: userType }).exec();
  if (user) {
    let orders = await Order.find({ userId: user.id });
    return { message: "Success", user_data: orders };
  } else {
    return { message: "User not found", user_data: null };
  }
}

async function storyLinkMessageSeen(userEmail, chatMessageId) {
  let user = await User.findOne({
    email: userEmail,
    type: userTypes.PUSHUSER,
  }).exec();
  user.chatHistory.forEach((ch) => {
    if (ch._id.toString() === chatMessageId.toString()) {
      let newLink = ch.link.replace("linkSeen=false", "linkSeen=true");
      ch.link = newLink;
    }
  });
  await user.save();
  return { message: "Success!", status: 200 };
}

const paginationOptions = (page, limit) => {
  const options = {};
  if (page) {
    options.page = page;
    options.limit = limit || DEFAULT_LIMIT;
  } else {
    options.pagination = false;
  }
  return options;
};

const getUsers = async (
  queryType,
  bodyFilters,
  username,
  email,
  page,
  limit
) => {
  const filters = bodyFilters.map((filter) => {
    if (filter.key === "color") {
      filter.key = "favoriteColor";
    }
    return filter;
  });

  const mongoFilters = {};
  if (queryType === DIRECT) {
    filters.forEach((element) => {
      mongoFilters[element.key] = { $in: element.value };
    });
  } else if (queryType === INDIRECT) {
    if (filters.length > 0) {
      mongoFilters["$or"] = [];
      filters.forEach((element) => {
        element.value.forEach((value) => {
          const filter = {};
          filter[element.key] = value;
          mongoFilters["$or"].push(filter);
        });
      });
    }
  } else if (queryType === SPECIFIC) {
    if (username) {
      mongoFilters["username"] = username;
    } else if (email) {
      mongoFilters["email"] = email;
    }
    const data = await User.findOne(mongoFilters).select(
      "username email nodeID _id"
    );

    return { message: "Success", data: data, status: HttpStatus.OK };
  }
  const opts = paginationOptions(page, limit);
  opts.select =
    "username email _id nodeID hub favoriteColor creative onboarding role";

  const finalFilters = {
    ...mongoFilters,
    onboarding: true,
    role: "user",
  };
  const data = await User.paginate(finalFilters, opts);

  return { message: "Success", data, status: HttpStatus.OK };
};

async function approvePushuser(userData) {
  // let user = await User.findById(userData._id)
  // await NextSystemMessage.getNextSystemMessage(
  //   user.email,
  //   systemMessageType.VERIFIED
  // )
  // user.verified = true
  // user.markModified('verified')
  // user.save()
  // emailService.sendMail(user, emailTypes.PUSHUSER_APPROVED, 'approved')
  // await new Transaction({
  //   user: {
  //     email: user.email,
  //     id: user.id,
  //   },
  //   portal: 'pushuser',
  //   reason: 'Accepted user',
  //   symbol: [
  //     `${user.nodeID}`,
  //     symbolKeyWords.ACCEPTED,
  //     symbolKeyWords.INTO,
  //     symbolKeyWords.PUSHUSER,
  //   ],
  //   event: `${user.username} accepted into Imagine Council`,
  //   transactionCreated: new Date(),
  // })
  //   .save()
  //   .catch((error) =>
  //     console.log(`User accepted not saved in transactions, reason: ${error}`)
  //   )
  return { message: "Success", status: 200 };
}

const getFields = async () => {
  const onboardingFields = OnboardingScript[USER].filter(
    (question) => question.answers && question.fieldName
  );
  try {
    const chatGameFields = await ChatGame.find({
      fieldName: { $ne: null },
      answers: { $ne: null },
    }).select("fieldName answers");
    let fields = onboardingFields.concat(chatGameFields);
    fields.push({ fieldName: "tag", answers: ["tester", "demo"] });

    return { message: "Success", data: fields, status: HttpStatus.OK };
  } catch (err) {
    console.error(err);
    return {
      message: "Server Error",
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    };
  }
};

async function uploadGameSubmission(file, userEmail) {
  let user = await User.findOne({
    email: userEmail,
    type: userTypes.PUSHUSER,
  }).exec();
  if (user) {
    let data = await S3.uploadFromUppyToS3(file);
    return data;
  } else {
    return { message: "Unsuccess", status: 500 };
  }
}

async function verifyUser(data, file, remoteAddress) {
  let user = await User.findOne({
    email: data.userEmail,
    // type: userTypes.PUSHUSER,
  });

  let fileId = await StripeClient.createFile(file).catch((error) => {
    console.log(`Failed to upload identification file. [error = ${error}]`);
    throw new Error(`Failed to upload identification file. [error = ${error}]`);
  });

  FileSystem.unlinkSync(file);

  let accountId = await StripeClient.createIndividualAccount(
    data.street,
    data.city,
    data.state,
    data.dob,
    fileId,
    data.firstName,
    user.email,
    remoteAddress,
    data.lastName,
    data.phoneNumber,
    data.ssn,
    data.zip
  ).catch((error) => {
    console.log("account wasnt created: ", error);
    throw new Error(`Failed to create Stripe account. [error = ${error}]`);
  });

  user.stripeAccountID = accountId;
  user.verified = true;
  user.firstName = data.firstName;
  user.lastName = data.lastName;
  user.birthDate = data.dob;
  user.address = {
    street: data.street,
    city: data.city,
    zip: data.zip,
    state: data.state,
  };
  await user.save().catch((error) => {
    console.log(
      `Failed to set update user. [error = ${error}, user = ${user.id}]`
    );
    throw new Error(
      `Failed to set update user. [error = ${error}, user = ${user.id}]`
    );
  });

  if (data.isBank && data.accountNumber !== "" && data.routingNumber !== "") {
    user.last4Acc = data.accountNumber.replace(/\d(?=\d{4})/g, "*");
    user.bank = true;
    await StripeClient.addBankAccount(
      user.stripeAccountID,
      data.accountNumber,
      data.routingNumber
    ).catch((error) => {
      console.log("failed to add bank", error);
      throw new Error(
        `Failed to add bank account in Stripe. [error = ${error}]`
      );
    });
  }
  if (data.isCard) {
    const cardDetail = {
      number: data.number,
      expYear: data.expYear,
      cvc: data.cvc,
      expMonth: data.expMonth,
    };
    user.last4Card = cardDetail.number.replace(/\d(?=\d{4})/g, "*");
    user.card = true;
    console.log("card", cardDetail);
    await StripeClient.addCardAccount(user.stripeAccountID, cardDetail).catch(
      (error) => {
        console.log("Failed to add card account in Stripe: ", error);
        throw new Error(
          `Failed to add card account in Stripe. [error = ${error}]`
        );
      }
    );
  }

  let gpcAccountData = {
    last4Acc: user.last4Acc,
    last4Card: user.last4Card,
    firstName: data.firstName,
    lastName: data.lastName,
    coinCount: user.coinCount,
    stripeAccountID: accountId,
    type: userTypes.PUSHUSER,
    //username: data.goPlay.username,
    email: user.email,
    //password: data.goPlay.password,
    userId: user.id,
    card: data.isCard,
    bank: data.isBank,
  };
  let gpcAccount = await gpcService.registerGpcAccount(gpcAccountData);

  await new Transaction({
    user: {
      email: gpcAccount.account.email,
      id: user.id,
    },
    coinAmount: user.coinCount,
    portal: "pushuser", //todo change to be sent from frontend
    reason: "creating gpc acount for user",
    event: `Creating GoPlayCoin account for user ${user.id}`,
    transactionCreated: new Date(),
  })
    .save()
    .catch((error) => console.error(error));

  user.gpcAccount = true;
  await user.save().catch((error) => {
    throw new Error(
      `Failed to set update user. [error = ${error}, id = ${user.id}]`
    );
  });

  emailService.sendMail(user, emailTypes.USER_VERIFIED, "userVerified");
  return { message: "Success!", status: 200 };
}

async function systemMessageSeen(userEmail) {
  let user = await User.findOne({ email: userEmail, type: userTypes.PUSHUSER });
  user.chatHistory.forEach((ch) => {
    ch.seen = true;
  });
  user.hasNewMessage = false;
  user.onboardingIndex = user.chatHistory.length - 1;
  await user.save();
  return { message: "Success!", status: 200 };
}

async function getUserNewMessages(userEmail) {
  let user = await User.findOne({ email: userEmail, type: userTypes.PUSHUSER });
  if (!user || user === null || !user.verified) {
    return { message: "Unsuccess", status: 500, hasNewMessages: false };
  } else {
    return {
      message: "Success!",
      status: 200,
      hasNewMessages: user.hasNewMessage,
    };
  }
}

async function getNewUserActions(userEmail) {
  let user = await User.findOne({ email: userEmail, type: userTypes.PUSHUSER });
  if (!user?.verified) {
    return {
      message: "Success",
      counters: { gamesToVoteCounter: 0, gamesToSubmissionCounter: 0 },
      hasNewMessages: false,
    };
  }
  let counters = await GameService.getNewGamesForUserToTakeAction(user._id);
  return {
    message: "Success",
    counters: counters,
    hasNewMessages: user.hasNewMessage,
  };
}

async function gameRulesRead(userEmail, gameId) {
  let user = await User.findOne({ email: userEmail, type: userTypes.PUSHUSER });
  if (!user || !user?.verified) {
    return { message: "Success", rulesRead: false };
  } else {
    let rulesRead = await GameService.setGameRulesRead(user._id, gameId);
    await new Transaction({
      user: {
        email: user.email,
        id: user.id,
      },
      portal: "pushuser",
      reason: "Agreed to rules",
      symbol: [
        `${user.nodeID}`,
        symbolKeyWords.AGREED,
        symbolKeyWords.TO,
        symbolKeyWords.RULES,
        symbolKeyWords.FOR,
        rulesRead.brand.businessName,
      ],
      event: `${user.username} agreed to rules for ${rulesRead.brand.businessName}`,
      transactionCreated: new Date(),
    })
      .save()
      .catch((error) =>
        console.log(`New user not saved in transactions, reason: ${error}`)
      );
    return { message: "Success", rulesRead: true };
  }
}

function checkIfEmailIsVerified(customer) {
  if (customer.verifyEmail && customer.verifyEmail.verifyEmail) {
    if (Date.now() > customer.verifyEmail.verifyEmail.expiration) {
      emailService.sendMail(customer, emailTypes.VERIFY_EMAIL, "verifyEmail");
      return false;
    } else {
      return false;
    }
  }
  return true;
}

async function getAllUsers(search, page, limit) {
  try {
    const total = await User.find({
      type: userTypes.PUSHUSER,
      username: { $regex: new RegExp(search, "i") },
      onboarding: { $ne: false },
    }).count();

    const users = await User.find({
      type: userTypes.PUSHUSER,
      username: { $regex: new RegExp(search, "i") },
      onboarding: { $ne: false },
    })
      .sort({ role: 1, username: 1 })
      .skip((page - 1) * limit)
      .limit(+limit);

    let allUsers = [];

    for await (let user of users) {
      const portal = await Portal.findById(user["portalID"]).exec();
      if (!user["portalID"] || portal["active"]) {
        const { user_data } = await getUserData(user);
        allUsers.push(user_data);
      }
    }

    return {
      users: allUsers,
      total: total,
    };
  } catch (error) {
    return { message: "Error while fetching users" };
  }
}

async function getPhoneType(phone) {
  try {
    const message = await twilioClient.lookups.v2
      .phoneNumbers(phone)
      .fetch({ fields: "line_type_intelligence" });
    if (message?.lineTypeIntelligence?.type !== "mobile") {
      return { status: 500, message: "We only accept mobile phone numbers" };
    } else {
      return { status: 200, message: "Success" };
    }
  } catch (error) {
    return { status: 500, message: error.message };
  }
}

async function sendVerifyPhone(phone) {
  try {
    const message = await twilioClient.verify
      .services(process.env.TWILIO_VERIFY_SERVICE)
      .verifications.create({ to: phone, channel: "sms" });
    return { status: 200, message: message };
  } catch (error) {
    return { status: 500, message: error.message };
  }
}

async function verifyPhone(phone, code) {
  try {
    const message = await twilioClient.verify
      .services(process.env.TWILIO_VERIFY_SERVICE)
      .verificationChecks.create({ to: phone, code: code });
    return { status: 200, message: message };
  } catch (error) {
    return { status: 500, message: error.message };
  }
}

async function getExpressAccountLink(userData, body) {
  try {
    const user = await User.findOne({
      email: userData.email,
    });
    let stripeExpressAccount;
    if (user.stripeAccountID) {
      stripeExpressAccount = user.stripeAccountID;
    } else {
      const result = await stripeClient.createExpressAccount(user);
      stripeExpressAccount = result.id;
      user.stripeAccountID = stripeExpressAccount;
      await user.save();
    }
    const accountLink = await stripeClient.createAccountLink(
      stripeExpressAccount,
      body
    );
    return accountLink;
  } catch (error) {
    throw new Error(error.message);
  }
}

module.exports = {
  getAllUsers,
  updateAccount,
  updatePassword,
  updateEmail,
  updateRoyalties,
  resetPassword,
  signUpUser,
  getUser,
  getUserChatHistory,
  storyLinkMessageSeen,
  getGpcUser,
  forgotPassword,
  getUserData,
  verifyEmail,
  approvePushuser,
  uploadGameSubmission,
  completeOnboarding,
  getUsers,
  getUserOrders,
  getFields,
  verifyUser,
  userOnboarded,
  sendVerifyEmail,
  checkIfEmailIsVerified,
  systemMessageSeen,
  patchUser,
  getUserNewMessages,
  getNewUserActions,
  gameRulesRead,
  sendVerifyPhone,
  verifyPhone,
  getPhoneType,
  getExpressAccountLink,
};
