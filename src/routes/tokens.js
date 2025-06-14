const TokenService = require("../services/Token/token");
const authentication = require("../middleware/authentication");
const authorization = require("../middleware/authorization");

var express = require("express");
var router = express.Router();

router.get(
  "/all",
  // authentication.isAuthenticated,
  // authorization.isBrand,
  (req, res) => TokenService.getAllTokens(req, res)
);
router.get("/get", (req, res) => TokenService.getTokens(req, res));
router.get("/getForStory", (req, res) =>
  TokenService.getTokensForStory(req, res)
);

router.get("/getForPortal", (req, res) =>
  TokenService.getTokensForPortal(req, res)
);

router.get("/:id", (req, res) => TokenService.getTokenById(req, res));
router.post("/buy", authentication.isAuthenticated, (req, res) =>
  TokenService.buyToken(req, res)
);
router.post("/buyFromGoPortal", (req, res) =>
  TokenService.buyTokenFromGoPortal(req, res)
);
router.post(
  "/create",
  // authentication.isAuthenticated,
  // authorization.isBrand,
  (req, res) => TokenService.createToken(req, res)
);
router.put(
  "/update",
  // authentication.isAuthenticated,
  // authorization.isBrand,
  (req, res) => TokenService.updateToken(req, res)
);
router.put(
  "/add-slides",
  authentication.isAuthenticated,
  authorization.isBrand,
  (req, res) => TokenService.addSlides(req, res)
);
router.post(
  "/:id/metadata",
  authentication.isAuthenticated,
  authorization.isBrand,
  (req, res) => TokenService.pinMetadata(req, res)
);
router.post(
  "/:id/deploy",
  // authentication.isAuthenticated,
  // authorization.isBrand,
  (req, res) => TokenService.deployToken(req, res)
);
router.post(
  "/:id/start-sale",
  authentication.isAuthenticated,
  authorization.isBrand,
  (req, res) => TokenService.startTokenSale(req, res)
);
router.get(
  "/isTokenRelatedToSomeNotValidGame/:id",
  authentication.isAuthenticated,
  (req, res) => TokenService.isTokenRelatedToSomeNotValidGame(req, res)
);

module.exports = router;
