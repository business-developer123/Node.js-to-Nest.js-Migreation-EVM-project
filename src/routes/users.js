const express = require("express");
require("dotenv").config();
const router = express.Router();
const bodyParser = require("body-parser");
const path = require("path");
const multer = require("multer");
const LocalStrategy = require("passport-local").Strategy;
const passport = require("passport");
const { body } = require("express-validator");
const bcrypt = require("bcrypt-nodejs");
const Stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const WebHook_Secret_Key = process.env.STRIPE_WEBHOOK_SECRET_KEY;
const User = require("../models/user");

const NextMessage = require("../services/chat/NextMessage");
const AnswerMessage = require("../services/chat/AnswerMessage");
const bank = require("../services/Bank/bank");
const userService = require("../services/User/user");
const tokenService = require("../services/Token/token");
const stripeService = require("../services/Stripe/Client");
const authentication = require("../middleware/authentication");
const { isUser, isBrand } = require("../middleware/authorization");
const TansactionsService = require("../services/Transaction/transaction");
const EmailService = require("../services/Email/email");

const upload = multer({ dest: "upload/" });

passport.use(
  "userLocal",
  new LocalStrategy(
    {
      usernameField: "username",
      passwordField: "password",
      passReqToCallback: true,
    },
    function (req, username, password, done) {
      User.findOne(
        username.includes("@")
          ? {
            email: username,
            // type: req.body.type,
          }
          : {
            username: new RegExp(`^${username}$`, "i"),
            // type: req.body.type,
          },
        (err, user) => {
          if (err) {
            return done(err);
          }
          if (!user) {
            return done(null, false, { message: "Incorrect username." });
          }
          if (!bcrypt.compareSync(password, user.password)) {
            return done(null, false, { message: "Incorrect password." });
          }
          return done(null, user);
        }
      );
    }
  )
);

router.post(
  "/signUpUser",
  [
    body("password").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Password confirmation does not match password");
      }
    }),
    body("email").custom((value) => {
      return User.findOne({ email: value }).then((user) => {
        if (user) {
          return Promise.reject("E-mail already in use");
        }
      });
    }),
    // body('phone').custom((value) => {
    //   return User.findOne({ phoneNumber: value }).then((user) => {
    //     console.log(user)
    //     if (user) {
    //       return Promise.reject('Phone already in use')
    //     }
    //   })
    // }),
  ],
  (req, res) => {
    const userData = req.body;
    return userService
      .signUpUser(userData)
      .then((data) =>
        res
          .status(data.status)
          .send({ message: data.message, user: userData.email })
      )
      .catch((error) => res.status(500).send({ message: error.message }));
  }
);

router.post("/logoutUser", (req, res) => {
  req.logout();
  return res.status(200).send({ message: "Success" });
});

router.post("/loginUser", (req, res, next) => {
  passport.authenticate("userLocal", (error, user, info) => {
    if (error) return next(error);
    if (!user) return res.status(403).send({ message: info.message });
    // if (user.type !== req.body.type) return res.status(403).send({ message: "User does not exist on this platform" })

    req.logIn(user, async function (err) {
      if (err) return next(err);
      const userData = await userService.getUserData(user);
      return res
        .status(200)
        .send({ message: "Success", user_data: userData.user_data });
    });
  })(req, res, next);
});

router.post("/forgotPassword", async function (req, res) {
  let { email, type } = req.body;
  return userService
    .forgotPassword(email, type)
    .then((data) => res.status(data.status).send({ message: data.message }))
    .catch((error) => res.status(500).json({ error: error.message }));
});

router.put("/sendVerifyEmail", async (req, res) => {
  let userEmail = req.body.email;
  userService
    .sendVerifyEmail(userEmail)
    .then((data) => res.status(data.status).send({ message: data.message }))
    .catch((error) => res.status(500).send({ message: error.message }));
});

router.put("/sendVerifyPhone", async (req, res) => {
  // FIXME: remove +1 from phone number
  let phone = `+${req.body.phone}`;
  userService
    .sendVerifyPhone(phone)
    .then((data) =>
      res
        .status(data.status)
        .send({ message: data.message, status: data.status })
    )
    .catch((error) => res.status(500).send({ message: error.message }));
});

router.put("/userOnboarded", async (req, res) => {
  let userEmail = req.body.email;
  userService
    .userOnboarded(userEmail)
    .then((data) => res.status(data.status).send({ message: data.message }))
    .catch((error) => res.status(500).send({ message: error.message }));
});

router.post("/verifyEmail", async function (req, res) {
  let userData = req.body;
  return userService
    .verifyEmail(userData)
    .then((data) => res.status(data.status).send({ message: data.message }))
    .catch((error) => res.status(500).send({ message: error.message }));
});

router.post("/sendVerifyPhone", async (req, res) => {
  const phone = req.body.phone;
  return userService
    .sendVerifyPhone(phone)
    .then((data) =>
      res
        .status(data.status)
        .send({ message: data.message, status: data.status })
    )
    .catch((error) => res.status(500).send({ message: error.message }));
});

router.post("/verifyPhone", async (req, res) => {
  const { phone, code } = req.body;
  return userService
    .verifyPhone(phone, code)
    .then((data) =>
      res
        .status(data.status)
        .send({ message: data.message, status: data.status })
    )
    .catch((error) => res.status(500).send({ message: error.message }));
});

router.post(
  "/updateAccount",
  authentication.isAuthenticated,
  async (req, res) => {
    let userData = req.body;
    return userService
      .updateAccount(userData)
      .then((data) =>
        res.status(data.status).send({ message: data.message, user: data.user })
      )
      .catch((error) => res.status(500).send({ message: error.message }));
  }
);

router.put(
  "/updatePassword",
  authentication.isAuthenticated,
  async (req, res) => {
    let userData = req.body;
    return userService
      .updatePassword(userData)
      .then((data) => res.status(data.status).send({ message: data.message }))
      .catch((error) => res.status(500).send({ message: error.message }));
  }
);

router.put("/updateEmail", authentication.isAuthenticated, async (req, res) => {
  let userData = req.body;
  return userService
    .updateEmail(userData)
    .then((data) =>
      res.status(data.status).send({ message: data.message, user: data.user })
    )
    .catch((error) => res.status(500).send({ message: error.message }));
});

router.post(
  "/updateRoyalties",
  authentication.isAuthenticated,
  isBrand,
  async (req, res) => {
    let userData = req.body;
    return userService
      .updateRoyalties(userData)
      .then((data) =>
        res.status(data.status).send({ message: data.message, user: data.user })
      )
      .catch((error) => res.status(500).send({ message: error.message }));
  }
);

router.get("/passwordReset/:id", function (req, res) {
  res.sendFile(path.resolve("./client/passwordReset.html"));
});

router.get("/getPaymentIntent", function (req, res) {
  let amount = req.query.amount;

  return stripeService
    .createPaymentIntent(amount)
    .then((data) =>
      res.status(200).send({
        message: data.message,
        success: data.success,
        secret: data.cSecret,
      })
    )
    .catch((error) => res.status(500).send({ message: error.message }));
});

router.post("/approvePushuser", (req, res) => {
  let userData = req.body;
  return userService
    .approvePushuser(userData)
    .then((data) => res.status(data.status).send({ message: data.message }))
    .catch((error) => res.status(500).send({ message: error.message }));
});

router.get("/getAllImagineUsers", (req, res) => {
  let { search, page, limit } = req.query;
  return userService
    .getAllUsers(search, page, limit)
    .then((data) =>
      res.status(200).send({
        users: data.users,
        total: data.total,
      })
    )
    .catch((err) => res.status(500).send({ message: err.message }));
});

router.post("/resetPassword", async function (req, res) {
  let userId = req.body.id;
  let password = req.body.password;
  return userService
    .resetPassword(userId, password)
    .then((data) => res.status(data.status).send({ message: data.message }))
    .catch((err) => res.status(500).send({ message: err.message }));
});

router.post(
  "/completeOnboarding",
  authentication.isAuthenticated,
  (req, res) => {
    let userData = req.body;
    let user = req.user;
    return userService
      .completeOnboarding(user, userData)
      .then((data) => res.status(data.status).send({ message: data.message }))
      .catch((err) => res.status(500).send({ message: err.message }));
  }
);

router.post("/addAndReplaceSource", (req, res) => {
  let data = req.body;
  return bank
    .addAndReplaceCreditCard(data)
    .then((data) => res.status(data.status).send({ message: data.message }))
    .catch((err) => res.status(500).send({ error: err }));
});

router.post("/addBank", authentication.isAuthenticated, (req, res) => {
  let bankUser = req.user;
  let { bankNumbers } = req.body;
  return bank
    .addBank(bankUser, bankNumbers)
    .then((data) => res.status(data.status).send({ message: data.message }))
    .catch((err) => res.status(500).send({ error: err }));
});

router.post("/addDebitCard", authentication.isAuthenticated, (req, res) => {
  let bankUser = req.user;
  let { token } = req.body;
  return bank
    .addDebitCard(bankUser, token)
    .then((data) => res.status(data.status).send({ message: data.message }))
    .catch((err) => res.status(500).send({ error: err }));
});

router.post("/cashout", (req, res) => {
  let userInfo = req.body; // user to whom payout goes (it requires that user has stripeAccountID)
  return bank
    .cashOut(userInfo, true, false) //user is calling function
    .then((data) => res.status(data.status).send({ message: data.message }))
    .catch((err) => res.status(500).send({ error: err }));
});

router.post("/transactions", (req, res) => {
  let userEmail = req.body.email;

  return TansactionsService.getAllUserTransactions(userEmail)
    .then((data) =>
      res
        .status(200)
        .send({ message: data.message, transactions: data.transactions })
    )
    .catch((err) => res.status(500).send({ error: err }));
});

router.get("/getUserData", (req, res) => {
  let user = req.user;
  return userService
    .getUserData(user, true)
    .then((data) =>
      res.status(200).send({ message: data.message, user_data: data.user_data })
    );
});

router.get(
  "/getUserChatHistory",
  authentication.isAuthenticated,
  (req, res) => {
    let userEmail = req.query.userEmail;
    return userService
      .getUserChatHistory(userEmail)
      .then((data) =>
        res
          .status(200)
          .send({ message: data.message, chatHistory: data.chatHistory })
      )
      .catch((err) => res.status(500).send({ error: err }));
  }
);

router.get("/hasNewMessage", authentication.isAuthenticated, (req, res) => {
  let userEmail = req.query.userEmail;
  return userService
    .getUserNewMessages(userEmail)
    .then((data) =>
      res
        .status(200)
        .send({ message: data.message, hasNewMessages: data.hasNewMessages })
    )
    .catch((err) => res.status(500).send({ error: err }));
});

router.get(
  "/hasNewUserActivity",
  authentication.isAuthenticated,
  (req, res) => {
    let userEmail = req.query.userEmail;
    return userService
      .getNewUserActions(userEmail)
      .then((data) =>
        res.status(200).send({
          message: data.message,
          counters: data.counters,
          hasNewMessages: data.hasNewMessages,
        })
      )
      .catch((err) => res.status(500).send({ error: err }));
  }
);

router.get("/user", authentication.isAuthenticated, (req, res) => {
  const userEmail = req.query.user;
  const userType = req.query.type;
  return userService
    .getUser(userEmail, userType)
    .then((data) =>
      res.status(200).send({ message: data.message, data: data.user_data })
    );
});

router.get("/orders", authentication.isAuthenticated, (req, res) => {
  const userEmail = req.query.user;
  const userType = req.query.type;
  return userService
    .getUserOrders(userEmail, userType)
    .then((data) =>
      res.status(200).send({ message: data.message, data: data.user_data })
    );
});

router.get("/gpcUser", authentication.isAuthenticated, (req, res) => {
  const gpcUser = req.query;
  return userService
    .getGpcUser(gpcUser)
    .then((data) =>
      res.status(200).send({ message: data.message, gpcUser: data.gpcUser })
    )
    .catch((error) => res.status(500).send({ message: error.message }));
});

router.post(
  "/verifyUser",
  upload.single("file"),
  // authentication.isAuthenticated,
  (req, res) => {
    let file = req.file.path;
    let body = req.body;
    let remoteAddress = req.connection.remoteAddress;
    return userService
      .verifyUser(body, file, remoteAddress)
      .then((data) => res.status(data.status).send({ message: data.message }))
      .catch((error) => res.status(500).send({ message: error.message }));
  }
);

router.put("/updateUser", authentication.isAuthenticated, (req, res) => {
  let { email, patchData } = req.body;
  return userService
    .patchUser(email, patchData)
    .then((data) => res.status(data.status).send({ message: data.message }))
    .catch((error) => res.status(500).send({ message: error.message }));
});

router.put("/gameRulesRead", authentication.isAuthenticated, (req, res) => {
  let { email, gameId } = req.body;
  return userService
    .gameRulesRead(email, gameId)
    .then((data) =>
      res.status(200).send({ message: data.message, rulesRead: data.rulesRead })
    )
    .catch((error) => res.status(500).send({ message: error.message }));
});

router.post("/sendFeedback", (req, res) => {
  let user = req.body.user;
  let feedback = req.body.feedback;
  return EmailService.sendFeedbackEmail(user, feedback)
    .then(() => res.status(200).send({ message: "Feedback sent successfully" }))
    .catch((error) => res.status(500).send({ message: error.message }));
});

router.put("/linkMessageSeen", authentication.isAuthenticated, (req, res) => {
  let { email, chatMessageId } = req.body;
  return userService
    .storyLinkMessageSeen(email, chatMessageId)
    .then((data) => res.status(data.status).send({ message: data.message }))
    .catch((error) => res.status(500).send({ message: error.message }));
});

router.post(
  "/uploadGameSubmission",
  authentication.isAuthenticated,
  (req, res) => {
    let file = JSON.parse(Object.keys(req.body)[0]);
    userService
      .uploadGameSubmission(file, file.user)
      .then((data) => {
        res.status(200).json({
          method: "put",
          url: data.url,
          img: data.img,
          fields: {},
          headers: { "x-amz-tagging": `fileName=${file.metadata.name}` },
        });
      })
      .catch((error) => res.status(500).send({ message: error.message }));
  }
);

router.put("/messageSeen", authentication.isAuthenticated, (req, res) => {
  let userEmail = req.body.userEmail;
  return userService
    .systemMessageSeen(userEmail)
    .then((data) => res.status(200).send({ message: data.message }))
    .catch((error) => res.status(500).send({ message: error.message }));
});

router.put(
  "/nextMessage",
  authentication.isAuthenticated,
  isUser,
  NextMessage.getNextMessage
);

router.put(
  "/answerMessage",
  authentication.isAuthenticated,
  isUser,
  AnswerMessage.saveAnswerMessage
);

router.post("/query", authentication.isAuthenticated, isBrand, (req, res) => {
  const { queryType, username, email, page, limit } = req.query;
  const { filters } = req.body;
  return userService
    .getUsers(queryType, filters, username, email, page, limit)
    .then((data) =>
      res.status(data.status).json({ message: data.message, users: data.data })
    );
});

router.get("/fields", authentication.isAuthenticated, isBrand, (req, res) => {
  return userService
    .getFields()
    .then((data) =>
      res.status(data.status).json({ message: data.message, fields: data.data })
    );
});

router.get("/tokens", (req, res) => tokenService.getTokensForUser(req, res));

router.post("/getEarlyAccess", (req, res) => {
  const password = "nodnarb882211";
  if (req.body.password === password) {
    return res.status(200).send({ message: "Success" });
  }
  return res.status(403).send({ message: "You have no access" });
});

router.post("/create-verification-session", (req, res) => {
  return stripeService
    .createVerificationSession(req.body.user)
    .then((response) => res.status(200).send({ client_secret: response }))
    .catch((error) => res.status(500).send({ message: error.message }));
});

router.post(
  "/stripe-identity-webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    let event;
    // You can find your endpoint's secret in your webhook settings
    const endpointSecret = WebHook_Secret_Key;
    try {
      const sig = req.headers["stripe-signature"];
      event = Stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      // On error, log and return the error message
      console.log(`❌ Error message: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    let user;
    let stripeIdentityState;
    // Successfully constructed event
    switch (event.type) {
      case "identity.verification_session.verified": {
        // All the verification checks passed
        const verificationSession = event.data.object;
        console.log("Stripe webhook received - verified", verificationSession);
        user = await User.findOne({
          stripeCustomerID: verificationSession?.metadata?.user_id,
        }).exec();
        stripeIdentityState = "success";
        break;
      }
      case "identity.verification_session.requires_input": {
        const verificationSession = event.data.object;
        console.log(
          "Stripe webhook received - requires_input",
          verificationSession
        );
        user = await User.findOne({
          stripeCustomerID: verificationSession?.metadata?.user_id,
        }).exec();
        stripeIdentityState = "none";
        break;
      }
    }

    if (user) {
      user.stripeIdentityState = stripeIdentityState;
      await user.save();
    }

    res.json({ received: true });
  }
);

router.post(
  "/createStripeExpressAccount",
  authentication.isAuthenticated,
  async (req, res) => {
    try {
      const accountLink = await userService.getExpressAccountLink(
        req.user,
        req.body
      );
      res.status(200).send({ link: accountLink });
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  }
);

module.exports = router;
