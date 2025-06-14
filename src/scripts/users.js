require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/user");

mongoose.connect(process.env.MONGODB_URI, {
  useFindAndModify: false,
  retryWrites: false,
  useUnifiedTopology: true,
  useNewUrlParser: true,
});

const resetUserOnboarding = async () => {
  const users = await User.find({ onboarding: true, role: "user" });

  for await (const user of users) {
    const userId = user._id;

    user.onboarding = false;
    user.onboardingIndex = 8;
    user.chatQuestionIndex = 7;
    user.systemMessageIndex = 8;
    user.chatQuestions = [];
    user.chatSystemMessages = [];
    user.chatHistory = [{
      picture: "",
      messageCreationDate: new Date(),
      field: "verifyEmail",
      _id: userId,
      isMyOwn: false,
      seen: true,
      link: "",
      chatGameType: "systemMessage",
      message: "Verify your email by typing the pin I just sent you to activate me so we can chat. Don't worry if your inbox is still empty, it takes a little while to get there."
    }, {
      picture: "",
      _id: userId,
      field: "verifyEmail",
      isMyOwn: true,
      chatGameType: "systemMessage",
      link: "",
      seen: true,
      message: "****"
    }, {
      picture: "",
      messageCreationDate: new Date(),
      field: "greeting_user",
      _id: userId,
      isMyOwn: false,
      seen: true,
      link: "",
      chatGameType: "systemMessage",
      message: `What up ${user?.username} ❗ My name is \"Kawaii\" and welcome to Imagine Council.`
    }, {
      picture: "",
      messageCreationDate: new Date(),
      field: "message",
      _id: userId,
      isMyOwn: false,
      seen: true,
      link: "",
      chatGameType: "systemMessage",
      message: "Imagine Council produces the Globe’s imagination by creating, building and producing new stories to distribute."
    }, {
      picture: "",
      messageCreationDate: new Date(),
      field: "message",
      _id: userId,
      isMyOwn: false,
      seen: true,
      link: "",
      chatGameType: "systemMessage",
      message: "The mission is to create new ideas, new stories and new collectible tokens collectively with people all around the 🌎 . Collectible tokens consist of props, wardrobe, music, set design and more."
    }, {
      picture: "",
      messageCreationDate: new Date(),
      field: "message",
      _id: userId,
      isMyOwn: false,
      seen: true,
      link: "",
      chatGameType: "systemMessage",
      message: "So here we go — here I present to you Data Identity Token (DiT), we will use it to recognize you in the system."
    }, {
      picture: "",
      messageCreationDate: new Date(),
      field: "avatar",
      _id: userId,
      isMyOwn: false,
      seen: true,
      link: "",
      chatGameType: "systemMessage",
      message: "https:\/\/used-node-images.s3.amazonaws.com\/node_design_ID_bacth3-26.png"
    }, {
      picture: "",
      messageCreationDate: new Date(),
      field: "message",
      _id: userId,
      isMyOwn: false,
      seen: true,
      link: "",
      chatGameType: "systemMessage",
      message: "We use Data Identity Token (DiT) because you may purchase a Digital Royalty Rights Token (DRRT) that gives you access to catch plays to come up with ideas for collectible tokens and earn royalties as you will be competing with other members for the best ideas and we do not want you voting for someone because you think they look cute — like me. 😊"
    }, {
      picture: "",
      messageCreationDate: new Date(),
      field: "hub",
      _id: userId,
      isMyOwn: false,
      seen: false,
      link: "",
      chatGameType: "multiple",
      message: "Now first question I need to know. What hub do you most identify with or want to rep for?"
    }];
    await user.save();
  }

  process.exit(1);
};

resetUserOnboarding();
