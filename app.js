require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const errorhandler = require("errorhandler");
const logger = require("morgan");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const JobScheduler = require("./src/Jobs/JobScheduler");
const { calculateRanks } = require("./src/services/Game/DistributionPhase");
const GameSave = require("./src/models/gameSave");
const Job = require("./src/models/job");
const session = require("express-session");
const { uuid } = require("uuidv4");
var moment = require("moment-timezone");
var passport = require("passport");
const Brand = require("./src/models/brand");
const MongoStore = require("connect-mongo")(session);
const User = require("./src/models/user");
var busboy = require("connect-busboy"); //middleware for form/file upload
var path = require("path"); //used for file path
var fs = require("fs-extra");
const messagesHandler = require("./src/services/Message/socket/messagesHandler");
const userRoles = require("./src/constants/userRoles");
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, {
  useFindAndModify: false,
  retryWrites: false,
  useUnifiedTopology: true,
  useNewUrlParser: true,
});

mongoose.Promise = global.Promise;
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error"));

passport.serializeUser((user, done) =>
  done(null, { id: user.id, role: user.role, type: user.type })
);

passport.deserializeUser((user, done) => {
  if (user.role === userRoles.USER || user.role === userRoles.ADMIN) {
    User.findById(user.id)
      .then((user) => done(null, user))
      .catch((err) => done(err));
  } else if (user.role === userRoles.BRAND) {
    Brand.findById(user.id)
      .then((user) => done(null, user))
      .catch((err) => done(err));
  }
});

let app = express();


// Middleware: Does stuff to the request and response objects
// before routing:

app.use((req, res, next) => {
  if (req.originalUrl === "/routes/users/stripe-identity-webhook") {
    bodyParser.raw({ type: "application/json" })(req, res, next);
  } else {
    bodyParser.json({ limit: "200mb" })(req, res, next);
  }
});

app.use((req, res, next) => {
  if (req.originalUrl === "/routes/users/stripe-identity-webhook") {
    next();
  } else {
    bodyParser.urlencoded({
      limit: "200mb",
      extended: true,
      parameterLimit: 1000000,
    })(req, res, next);
  }
});


app.set("trust proxy", 1);
var sessionInstance = {
  cookie: {
    domain: "",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  genid: (req) => uuid(),
  resave: false,
  saveUninitialized: true,
  secret: "keyboard cat",
  store: new MongoStore({ mongooseConnection: db }),
};
app.use(function (req, res, next) {
  if (req.headers.origin != null)
    sessionInstance.cookie.domain = req.headers.origin.replace("https://", "");
  if (req.headers.origin != null && req.headers.origin.includes("localhost"))
    sessionInstance.cookie.domain = "localhost";
  return next();
});
const sessionMiddleware = session(sessionInstance);
app.use(sessionMiddleware);

app.use(busboy());
app.use(express.static("./client"));
app.use(morgan("dev"));
app.use(logger("dev"));
app.use(errorhandler());
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept"
  );
  return next();
});
app.use(passport.initialize());
app.use(passport.session());

var brands = require("./src/routes/brands");
var missions = require("./src/routes/missions");
var games = require("./src/routes/games");
var globalRoute = require("./src/routes/global");
var objects = require("./src/routes/objects");
var products = require("./src/routes/products");
var transactions = require("./src/routes/transactions");
var routes = require("./src/routes/index");
var schedule = require("node-schedule");
var users = require("./src/routes/users");
var datastream = require("./src/routes/datastream");
var blockchain = require("./src/routes/blockchain");
var portal = require("./src/routes/portals");
var token = require("./src/routes/tokens");
var stories = require("./src/routes/stories");
var feed = require("./src/routes/feed");
const chatGames = require("./src/routes/chatGames");
const imagine = require("./src/routes/imagine");
const media = require("./src/routes/media");
const goPortalFeed = require("./src/routes/goPortalFeed");
const S3 = require("./src/routes/S3");

app.use("/routes", routes);
app.use("/routes/users", users);
app.use("/routes/objects", objects);
app.use("/routes/brands", brands);
app.use("/routes/games", games);
app.use("/routes/global", globalRoute);
app.use("/routes/products", products);
app.use("/routes/chat-games", chatGames);
app.use("/routes/imagine", imagine);
app.use("/routes/missions", missions);
app.use("/routes/transactions", transactions);
app.use("/routes/blockchain", blockchain);
app.use("/routes/datastream", datastream);
app.use("/routes/media", media);
app.use("/routes/portals", portal);
app.use("/routes/stories", stories);
app.use("/routes/tokens", token);
app.use("/routes/feed", feed);
app.use("/routes/go-portal-feed", goPortalFeed);
app.use("/routes/s3", S3);

app.set("port", process.env.PORT || 8081);
let server = app.listen(app.get("port"), () => {
  console.log("Node app is running on port", app.get("port"));
});
global.io = require("socket.io")(server);
const wrap = (middleware) => (socket, next) =>
  middleware(socket.request, {}, next);

io.use(wrap(sessionMiddleware));
io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));

io.use((socket, next) => {
  let socketHeadersOriginExist =
    socket.request.headers && socket.request.headers.origin;
  if (
    socketHeadersOriginExist &&
    (socket.request.headers.origin.includes("portalpathway") ||
      socket.request.headers.origin.includes("icso") ||
      socket.request.headers.origin.includes("imaginecouncil") ||
      socket.request.headers.origin.includes("localhost"))
  ) {
    next();
  } else {
    next(new Error("unauthorized"));
  }
});

io.on("connection", (socket) => {
  const user = socket.request.user;
  console.log("user connected");

  messagesHandler(socket);

  socket.on("disconnect", function () {
    console.log("User Disconnected");
  });

  socket.on("userData", function (user) {
    setInterval(function () {
      User.findOne(
        { email: user.email, type: user.data.type },
        function (err, foundUser) {
          if (foundUser) {
            let userData = {
              verifiedEmail: foundUser.verifiedEmail,
              type: foundUser.type,
              bank: foundUser.bank,
              coins: foundUser.coinCount,
              color: foundUser.favoriteColor,
              debit_card: foundUser.card,
              entry: foundUser.entry,
              hasNewMessage: foundUser.hasNewMessage,
              first_name: foundUser.firstName,
              hub: foundUser.hub,
              onboardingIndex: foundUser.onboardingIndex,
              node_id: foundUser.nodeID,
              onboarding: foundUser.onboarding,
              username: foundUser.username,
              email: foundUser.email,
              verified: foundUser.verified,
              zone: foundUser.zone,
              gpcAccount: foundUser.gpcAccount,
            };
            socket.emit("userData", userData);
          }
        }
      );
    }, 3000);
  });

  socket.on("brandData", function (brand) {
    console.log("received brandData");
    setInterval(function () {
      Brand.findOne({ email: brand.email }, function (err, foundUser) {
        var coins = {
          verified: foundUser.verified,
          bank: foundUser.bank,
          card: foundUser.card,
          coinCount: foundUser.coinCount,
          onboarded: foundUser.onboarded,
          payment: foundUser.payment,
          paymentBank: foundUser.paymentBank,
          verifiedPaymentBank: foundUser.verifiedPaymentBank,
        };
        socket.emit("brandData", coins);
      });
    }, 1000);
  });

  socket.on("ranks", async (data) => {
    console.log("on ranks");
    let user = await User.findOne({
      email: data.user.email,
      type: data.user.type,
    });
    console.log("user from DB");
    const gameSave = await GameSave.findOne({
      userId: user._id,
      gameId: data.gameId,
    });

    if (!gameSave) {
      console.error(
        `User is not a participant in this game. [gameId = ${data.gameId}, user = ${user.id}]`
      );
      return;
    }

    setInterval(async () => {
      const { gameSaves, scores, totalScore } = await calculateRanks(
        data.gameId
      );

      const submissions = [];
      for (gs of gameSaves) {
        gs.royalty = Math.floor((scores[gs.id] / totalScore) * 100);
        submissions.push({
          id: gs.id,
          royalty: gs.royalty,
        });
      }

      socket.emit("ranks", submissions);
    }, 1000);
  });
});

schedule.scheduleJob("* 0 0 * * 7", function () {
  // each sunday at 00:00 - check stripe balance and update in Coin model
  JobScheduler.executeWeekly();
});

async function getJobsRunning() {
  const jobs = await Job.find({ pending: true });
  await JobScheduler.executePendingGames(jobs);
}
void getJobsRunning();
// check for which brands should job exist

const rule = new schedule.RecurrenceRule();
// runs at every minute in .env time zone
rule.second = 0;

let brandsJobs = schedule.scheduleJob(rule, () => {
  JobScheduler.checkForBrandsAndExecuteJobs(brandsJobs);
});
// JobScheduler.checkForBrandsAndExecuteJobs();
