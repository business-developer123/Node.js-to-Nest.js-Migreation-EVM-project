require("dotenv").config();
const s3Service = require("../S3/S3Service");
const paymentType = require("../../constants/paymentType");
const StripeClient = require("../Stripe/Client");
const CheckoutProduct = require("../Product/CheckoutProduct");
const EmailService = require("../Email/email");
const blockchainService = require("../Blockchain/blockchain");
const ipfsService = require("../Blockchain/ipfs");
const User = require("../../models/user");
const userToken = require("../../constants/userToken");
const Token = require("../../models/token");
const Portal = require("../../models/portal");
const Game = require("../../models/game");
const Story = require("../../models/story");
const Product = require("../../models/product");
const Brand = require("../../models/brand");
const BlockchainTransaction = require("../../models/blockchainTransaction");
const tokenStatus = require("../../constants/tokenStatus");
const productStates = require("../../constants/productStates");
const Transaction = require("../../models/transaction");
const TransactionType = require("../../constants/transactionType");
const symbolKeyWords = require("../../constants/symbolKeyWords");
const gameStatus = require("../../constants/gameStatus");
const Mongoose = require("mongoose");
const GameService = require("../Game/GameService");
const Order = require("../../models/order");
const tokenType = require("../../constants/tokenType");
const tokenTradableType = require("../../constants/tokenTradableType");

const MARKETPLACE_ADDRESS = process.env.BLOCKCHAIN_MARKETPLACE_ADDRESS;
const MAIN_TOKEN_ADDRESS = process.env.BLOCKCHAIN_MAINTOKEN_ADDRESS;

async function createToken(req, res) {
  try {
    const values = req.body.values;
    const { makers } = values;
    const undeployedToken = await Token.findOne({
      address: { $in: [null, " "] },
      isDeployed: false,
    });

    if (undeployedToken) {
      return res.status(400).send({
        message: `Please deploy the previous token "${undeployedToken.name}" before creating a new one.`,
      });
    }

    const input = values.tradable?.toLowerCase();
    const validTradableValues = [tokenTradableType.TRADABLE, tokenTradableType.NON_TRADABLE]

    if (!validTradableValues.includes(input)) {
      throw new Error(
        `Invalid tradable value. Must be one of: ${validTradableValues.join(
          ", "
        )}`
      );
    }

    if (!values.name || !values.symbol || !values.description || !values.category || !values.type) {
      throw new Error("Missing required fields: name, symbol, description, category, and type are required")
    }

    const validTypes = [tokenType.DRRT, tokenType.PORTAL, tokenType.COLLECTIBLE];
    if (!validTypes.includes(values.type)) {
      throw new Error(`Invalid token type. Must be one of: ${validTypes.join(", ")}`);
    }

    const existingToken = await Token.findOne({ symbol: values.samble });
    if (existingToken) {
      throw new Error(`A token with symbol "${values.symbol}" already exists`);
    }

    const brand = await Brand.findOne({ email: req.user.email });
    const portal =
      values.portal && values.portal !== "none"
        ? await Portal.findById(values.portal)
        : null;
    const game =
      values.game && values.game !== "none"
        ? await Game.findById(values.game)
        : null;

    const story =
      values.story && values.story !== "none"
        ? await Story.findById(values.story)
        : null;

    if (!values.icon) {
      throw new Error("Please upload an icon");
    }

    if (!values.banner) {
      throw new Error("Please upload a banner");
    }

    const token = new Token({
      name: values.name,
      audio: values.audio,
      description: values.description,
      symbol: values.symbol,
      category: values.category,
      icon: values.icon,
      banner: values.banner,
      portalID: portal,
      gameID: game,
      storyID: story,
      type: values.type,
      tradable: values.tradable,
      status: values.status,
      makers: makers || {},
      external_link: values.external_link,
      seller_fee_basis_points: values.seller_fee_basis_points || 20000,
      price: values.price,
      createdDate: new Date(),
    });


    if (values.type === tokenType.DRRT) {
      const product = new Product({
        brandId: brand._id,
        tokenId: token._id,
        type: "DRRT",
        description: values.description,
        cost: 0,
        images: values.icon,
        name: values.name,
        pickSize: false,
        numberOfGames: 29,
        state: productStates.DEVELOPING,
      });

      await product.save();
    } else if (values.type === tokenType.COLLECTIBLE) {
      if (!values.product) {
        throw new Error(
          "Product information is required for COLLECTIBLE tokens"
        );
      }
      token.product = {
        isProduct: values.product.isProduct || false,
        isCommemorative: values.product.isCommemorative || false,
        isMultiplatform: values.product.isMultiplatform || false,
        sizes: values.product.isProduct ? values.product.sizes || [] : [],
      };
      if (token.product.isProduct && token.product.isCommemorative && portal) {
        const existingCommemorative = await Token.findOne({
          portalID: portal._id,
          type: tokenType.COLLECTIBLE,
          "product.isCommemorative": true,
        });
        if (existingCommemorative) {
          throw new Error(
            `Token ${existingCommemorative.name} is already a commemorative product for this Portal`
          );
        }
      }
    }

    await token.save();

    return res.status(200).send({ message: "Success", data: token });
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
}

async function updateToken(req, res) {
  try {
    const values = req.body.values;
    const { makers } = values;

    const portal =
      values.portal && values.portal !== "none"
        ? await Portal.findById(values.portal)
        : null;
    const game =
      values.game && values.game !== "none"
        ? await Game.findById(values.game)
        : null;
    const story =
      values.story && values.story !== "none"
        ? await Story.findById(values.game)
        : null;

    const brand = await Brand.findOne({ email: req.user.email });

    const token = await Token.findById(values.tokenId);
    if (!token) {
      throw new Error(`Token with ID ${values.tokenId} not found`);
    }
    token.name = values?.name || token.name;
    token.symbol = values?.symbol || token.symbol;
    token.description = values?.description || token.description;
    token.category = values?.category || token.category;
    token.makers = makers && Object.keys(makers).length ? makers : token.makers;
    token.icon = values?.icon || token.icon;
    token.banner = values?.banner || token.banner;
    token.type = values?.type || token.type;
    token.status = values?.status || token.status;
    token.tradable = values?.tradable || token.tradable;
    token.portalID = portal;
    token.storyID = story;
    token.gameID = game;
    token.audio = values?.audio;

    if (values.type === "DRRT") {
      let product = await Product.findOne({ tokenId: token._id });
      if (!product) {
        product = new Product({
          brandId: brand._id,
          tokenId: token._id,
          type: "DRRT",
          description: values.description,
          cost: 0,
          images: token.icon,
          name: values.name,
          pickSize: false,
          numberOfGames: 30,
          state: productStates.DEVELOPING,
        });
      }

      product.name = values.name;
      product.description = values.description;
      product.images = token.icon;
      product.cost = 0;

      await product.save();
    } else if (values.type === "COLLECTIBLE") {
      token.product = {
        isProduct: values.product.isProduct,
        isCommemorative: values.product.isCommemorative,
        isMultiplatform: values.product.isMultiplatform,
        sizes: values.product.sizes,
      };

      if (values.product.isProduct && values.product.isCommemorative) {
        const portalToken = await Token.findOne({
          portalID: token.portalID,
          type: "COLLECTIBLE",
          "product.isCommemorative": true
        }).exec();
        if (portalToken) {
          return res.status(500).send({
            message: `Token ${portalToken.name} is already a commemorative product for same Portal`
          });
        }
      }
    }

    await token.save();

    return res.status(200).send({ message: "Success", data: token });
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
}

async function addSlides(req, res) {
  try {
    const values = req.body.values;
    const token = await Token.findById(req.body.tokenId);
    token.slides = values.slides;
    await token.save();
    return res.status(200).send({ message: "Success", data: token });
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
}

async function getAllTokens(req, res) {
  try {
    const tokens = await Token.find({
      $or: [{ type: "DRRT" }, { type: "PORTAL" }, { type: "COLLECTIBLE" }],
    }).exec();
    return res.status(200).send({ message: "Success", data: tokens });
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
}

const getTokenData = async (token) => {
  let data = token;
  if (token?.icon) {
    if (token?.icon?.app && token?.icon?.app?.type) {
      data.icon = `/api/routes/media/file/${token.icon.app.url}/image`;
    } else if (
      token?.icon?.url?.includes(
        "https://ic-filestack.s3.us-west-1.amazonaws.com"
      )
    ) {
      data.icon = token?.icon?.url;
    } else {
      data.icon = `/api/routes/media/image/${token?.icon?.app?.url || token.icon.url
        }`;
    }
  }
  if (token?.banner) {
    if (token?.banner?.desktop && token?.banner?.desktop?.type) {
      const desktopType =
        token.banner.desktop?.type?.indexOf("video") >= 0 ? "video" : "image";
      const mobileType =
        token.banner.mobile?.type?.indexOf("video") >= 0 ? "video" : "image";
      data.banner = {
        mobile: `/api/routes/media/file/${token.banner.mobile.url}/${mobileType}`,
        desktop: `/api/routes/media/file/${token.banner.desktop.url}/${desktopType}`,
      };
    } else if (
      typeof token?.banner === "string" &&
      token?.banner?.length < 200 &&
      token?.banner?.includes("https://ic-filestack.s3.us-west-1.amazonaws.com")
    ) {
      data.banner = {
        mobile: token?.banner,
        desktop: token?.banner,
      };
    } else {
      data.banner = {
        mobile: `/api/routes/media/image/${token.banner?.mobile?.url || token.banner.url
          }`,
        desktop: `/api/routes/media/image/${token.banner?.desktop?.url || token.banner.url
          }`,
      };
    }
  }

  if (data?.storyID) {
    const story = await Story.findById(data.storyID).exec();
    data.storyFull = story;
  }

  if (data?.gameID) {
    const game = await Game.findById(data.gameID).exec();
    data.gameFull = game;
  }

  if (data?.portalID) {
    const portal = await Portal.findById(data.portalID).exec();
    data.portalFull = portal;
    data.portalFull.icon = `/api/routes/media/image/${portal.icon.url}`;
  }
  if (data?.slides) {
    data.slides = data.slides.map((slide) => ({
      id: slide.id,
      desktopLink: `/api/routes/media/file/${slide.desktopLink}/video`,
      mobileLink: `/api/routes/media/file/${slide.mobileLink}/video`,
      desktopLinkDuration: slide.desktopLinkDuration || 0,
      mobileLinkDuration: slide.mobileLinkDuration || 0,
      theme: slide.theme || "light",
    }));
  }
  return data;
};

async function getTokensForStory(req, res) {
  try {
    let allTokens = [];
    const storyId = req.query.storyId;
    const collectibleTokens = await Token.find({
      $and: [
        {
          type: "COLLECTIBLE",
          storyID: storyId,
        },
      ],
    })
      .sort({ createdDate: "desc" })
      .exec();
    for await (let token of collectibleTokens) {
      const fullToken = await getTokenData(token);
      allTokens.push(fullToken);
    }
    return res.status(200).send({ message: "Success", data: allTokens });
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
}

async function getTokens(req, res) {
  try {
    let allTokens = [];
    const stories = await Story.find({}).sort({ number: "desc" }).exec();
    for await (let story of stories) {
      const drrtTokens = await Token.find({
        $and: [
          {
            type: "DRRT",
            storyID: story?._id,
            status: tokenStatus.ACTIVE,
          },
        ],
      })
        .sort({ createdDate: "desc" })
        .exec();
      const collectibleTokens = await Token.find({
        $and: [
          {
            type: "COLLECTIBLE",
            storyID: story?._id,
            status: tokenStatus.ACTIVE,
          },
        ],
      })
        .sort({ createdDate: "desc" })
        .exec();

      const fullStory = await getTokenData(story);
      const fullDrrtTokens = await Promise.all(
        drrtTokens.map(async (token) => await getTokenData(token))
      );
      const fullCollectibleTokens = await Promise.all(
        collectibleTokens.map(async (token) => await getTokenData(token))
      );
      allTokens = [
        ...allTokens,
        fullStory,
        ...fullDrrtTokens,
        ...fullCollectibleTokens,
      ];
    }
    return res.status(200).send({ message: "Success", data: allTokens });
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
}

async function getTokenById(req, res) {
  try {
    const token = await Token.findById(req.params.id).exec();
    const fullToken = await getTokenData(token);
    return res.status(200).send({ message: "Success", data: fullToken });
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
}

async function getTokensForPortal(req, res) {
  try {
    const tokens = await Token.find({
      portalID: req.query.portalId,
    }).exec();

    return res
      .status(200)
      .send({ status: 200, message: "Success", tokens: tokens });
  } catch (error) {
    console.log("error", error);
    return res
      .status(500)
      .send({ status: 500, message: "Tokens failed to fetch", tokens: [] });
  }
}

async function getTokenForPortal(data, userEthAddress) {
  try {
    const tokens = await Token.find({
      portal: data.portal,
      tradable: false,
    }).exec();
    if (tokens.length && tokens[0].address) {
      const nftData = await blockchainService.getNftToken(
        tokens[0].address,
        userEthAddress
      );
      return {
        status: 200,
        message: "Success",
        token: tokens[0],
        nftData: nftData,
      };
    }

    return {
      status: 200,
      message: "Success",
      token: tokens[0],
      nftData: undefined,
    };
  } catch (error) {
    console.log("error", error);
    return {
      status: 500,
      message: "tokens failed to fetch",
      token: undefined,
      nftData: undefined,
    };
  }
}

async function getTokensByType(tokenType) {
  try {
    let tokens = await Token.find({ type: tokenType }).exec();
    return { status: 200, message: "Success", tokens: tokens };
  } catch (error) {
    return { status: 500, message: "tokens failed to fetch", tokens: [] };
  }
}

async function getTokensForUser(req, res) {
  try {
    const email = req.query.email;
    const username = req.query.username;
    const user = await User.findOne({
      $or: [{ email: email }, { username: username }],
    });

    if (!user) {
      return res
        .status(200)
        .send({ data: { royalty: [], imagination: [], data: [] } });
    }

    const tokens = await Token.find({
      $or: [{ type: "DRRT" }, { type: "PORTAL" }, { type: "COLLECTIBLE" }],
    }).exec();
    const addresses = tokens.map((item) => item.address);

    const uColor = userToken.colors
      .filter(
        (c) =>
          c?.name?.toLocaleLowerCase() ===
          user?.favoriteColor?.toLocaleLowerCase()
      )
      .map((c) => ({
        ...c,
        type: "color",
      }));

    const uHub = userToken.hubs
      .filter(
        (h) => h?.name?.toLocaleLowerCase() === user?.hub?.toLocaleLowerCase()
      )
      .map((c) => ({
        ...c,
        type: "hub",
      }));

    const uCreativity = userToken.creativities
      .filter(
        (c) =>
          c?.name?.toLocaleLowerCase() === user?.creative?.toLocaleLowerCase()
      )
      .map((c) => ({
        ...c,
        type: "creativity",
      }));

    const DataTokens = [...uColor, ...uHub, ...uCreativity];

    if (!addresses?.length) {
      return res
        .status(200)
        .send({ data: { royalty: [], imagination: [], data: DataTokens } });
    }

    let RoyaltyTokens = [];
    let ImaginationTokens = [];

    for await (let address of addresses) {
      const userHasToken = await BlockchainTransaction.findOne({
        tokenAddress: address,
        to: user.ethAddress,
      });
      if (userHasToken) {
        const token = tokens.find((t) => t.address === address);
        if (token) {
          const fullToken = await getTokenData(token);
          ImaginationTokens.push(fullToken);
        }
      }
      //     if (token.tokenType === 0) { // FIXME TOKEN_TYPE.DRRT
      //       RoyaltyTokens.push(token);
      //     } else if (token.tokenType === 1) {
      //       ImaginationTokens.push(token);
      //     }
    }

    res.status(200).send({
      data: {
        royalty: RoyaltyTokens,
        imagination: ImaginationTokens,
        data: DataTokens,
      },
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
}

async function getVideoForToken(tokenId, color) {
  try {
    // const token = await Token.findById(tokenId).exec();
    const videoName = `upload/bisney/${color.toLowerCase()}.mp4`;
    const videoPath = `https://superman-color-token-test.s3.us-east-1.amazonaws.com/Superman-03-Billion_Dollar_Limited_${color.toUpperCase()}.mp4`;
    return { videoPath, videoName };
  } catch (error) {
    throw new Error(error);
  }
}

async function deleteToken(tokenId) {
  if (!tokenId) {
    return { status: 404, message: "Not found" };
  }
  try {
    await Token.findOneAndRemove({ _id: tokenId });
    return { status: 200, message: "Success" };
  } catch (error) {
    return { status: 500, message: error.message };
  }
}

async function pinMetadata(req, res) {
  try {
    const token = await Token.findById(req.params.id).exec();
    let iconUrl = "";
    if (token?.icon?.meta?.type) {
      iconUrl = await s3Service.getPresignedUrl({
        Bucket: "ic-filestack",
        Key: token?.icon?.meta?.url,
      });
    } else {
      iconUrl = `https://uppyupload.s3.amazonaws.com/${token?.icon?.meta?.url || token.icon.url
        }.png`;
    }
    const icon = await ipfsService.pinTokenIcon(iconUrl);
    token.ipfsIcon = icon.IpfsHash;
    const contractMetadata = await ipfsService.pinContractMetadata(
      token,
      icon.IpfsHash
    );
    token.ipfsContractMetadata = contractMetadata.IpfsHash;
    const nftMetadata = await ipfsService.pinNftMetadata(token, icon.IpfsHash);
    token.ipfsNftMetadata = nftMetadata.IpfsHash;
    await token.save();
    return res.status(200).send({ message: "Success" });
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
}

async function deployToken(req, res) {
  try {
    const token = await Token.findById(req.params.id).exec();
    const address = await blockchainService.deployToken(token);
    token.address = address;
    token.isDeployed = true;
    await token.save();
    return res.status(200).send({ message: "Success" });
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
}

async function isTokenRelatedToSomeNotValidGame(req, res) {
  try {
    const token = await Token.findOne({
      _id: Mongoose.Types.ObjectId(req.params.id),
    }).exec();

    if (token.type !== "DRRT") {
      return res
        .status(200)
        .send({ message: "Token not of type DRRT", clear: false });
    } else if (!token) {
      return res
        .status(200)
        .send({ message: "No token with this id", clear: true });
    }

    const game = await Game.find({
      $and: [
        {
          state: {
            $in: [
              gameStatus.SUBMISSION,
              gameStatus.VOTING,
              gameStatus.DISTRIBUTION,
              gameStatus.COMPLETE,
              gameStatus.FAILED,
            ],
          },
        },
        { idOfToken: req.params.id },
      ],
    }).exec();

    if (game.length) {
      return res
        .status(200)
        .send({
          message: "Token can not allowed to by from cart",
          clear: true,
        });
    }

    return res
      .status(200)
      .send({ message: "Token can be soled from cart", clear: false });
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
}

async function startTokenSale(req, res) {
  try {
    const price = req.body.price;
    const token = await Token.findById(req.params.id).exec();
    await blockchainService.startTokenSale(token.address, price, 0);
    token.price = price;
    await token.save();
    await blockchainService.mintToken(token.address, 3);
    return res.status(200).send({ message: "Success" });
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
}
async function calculatePointsToSend(tokenPrice) {
  const currency = 0.01;
  // calculate money to send
  const tokenPriceMinusPercent = tokenPrice - (tokenPrice * 20) / 100;
  const value = (tokenPriceMinusPercent * 20) / 100;
  const moneyToSend = (value * 7) / 100;
  // calculate points
  const points = moneyToSend / currency;
  // return points to send with currency = 0.01;
  return Math.round(points);
}

function handleError(message, session) {
  console.log(message);
  session.abortTransaction();
  session.endSession();
  throw message;
}

async function buyToken(req, res) {
  try {
    const body = req.body;
    const tokens = req.body.tokens;

    const user = await User.findOne({ email: req.user.email }).exec();
    const userEthAddress = user.ethAddress;

    user.address.street = body.userInfo.street;
    user.address.city = body.userInfo.city;
    user.address.zip = body.userInfo.zip;
    user.address.state = body.userInfo.state;

    const addressInfo = {
      firstName: body.userInfo.firstName || user.firstName,
      lastName: body.userInfo.lastName || user.lastName,
      country: body.userInfo.country,
      street: body.userInfo.street || user.address.street,
      city: body.userInfo.city || user.address.city,
      zip: body.userInfo.zip || user.address.zip,
      state: body.userInfo.state || user.address.state,
    };
    await user.save();

    if (!userEthAddress) {
      throw new Error(
        "You do not have eth address, please contact us to get it for you and connect to your account."
      );
    }

    const selectedProducts = body.selectedProducts;
    const payment = body.payment || "stripe";
    const delivery = body.delivery || "hold";

    // Check if token sale started
    for await (let token of body.tokens) {
      if (!token.address) {
        throw new Error("Token sale haven't started yet.");
      }
      await blockchainService.checkIfTokenSaleStarted(token.address);
    }

    // Charge stripe or goborb
    for await (let token of body.tokens) {
      if (
        payment === paymentType.GOBORB &&
        token.address !== MAIN_TOKEN_ADDRESS
      ) {
        await blockchainService.buyTokenWithGoborb(userEthAddress, token.price);
      } else {
        await StripeClient.chargeCustomersCard(
          token.price * (token.count || 1) * 100
        );
      }
    }

    // Run blockchain transaction and write logs to db
    for await (let token of body.tokens) {
      if (token.count > 1) {
        for (let i = 0; i < token.count; i++) {
          const blockchainTransaction = new BlockchainTransaction({
            from: MARKETPLACE_ADDRESS,
            to: userEthAddress,
            tokenAddress: token.address,
            amount: token.price,
            quantity: 1,
            deliverAssets: delivery !== "hold",
          });
          await blockchainTransaction.save();

          if (token.address === MAIN_TOKEN_ADDRESS) {
            user.goBorbBalance += token.price;
            await user.save();
          }
        }
      } else {
        const blockchainTransaction = new BlockchainTransaction({
          from: MARKETPLACE_ADDRESS,
          to: userEthAddress,
          tokenAddress: token.address,
          amount: token.price,
          quantity: token.count || 1,
          deliverAssets: delivery !== "hold",
        });
        await blockchainTransaction.save();

        if (token.address === MAIN_TOKEN_ADDRESS) {
          user.goBorbBalance += token.price;
          await user.save();
        }
      }
    }

    await CheckoutProduct.createOrders(selectedProducts, user, delivery);

    // Distribute royalties
    for await (let token of body.tokens) {
      await CheckoutProduct.distributeConnectedRoyalties(
        token.price,
        token.address
      );
    }

    let transactionId;
    let orderId;
    for await (let token of body.tokens) {
      const session = await Mongoose.startSession();
      session.startTransaction();

      if (token?.gameFull && token.gameFull?.usersToShow) {
        const points = await calculatePointsToSend(token.price);

        const users = token?.gameFull?.usersToShow;
        const game = token?.gameFull;
        for (const user of users) {
          const userFromDb = await User.findById(user._id);
          userFromDb.coinCount += points;
          await userFromDb
            .save()
            .catch((error) =>
              handleError("Failed to send points to user" + error, session)
            );

          const trans = new Transaction({
            user: {
              email: userFromDb["email"],
              id: userFromDb["_id"],
              symbol: userFromDb["nodeID"],
            },
            storyId: token?.storyFull?._id,
            storyFull: token?.storyFull,
            tokenFull: token,
            type:
              game.tokenID || game.token
                ? TransactionType.TOKEN_SALE
                : TransactionType.POOL,
            coinAmount: points,
            symbol: [
              `${user.nodeID}`,
              symbolKeyWords.PAY,
              symbolKeyWords.BY,
              "Sale of Token",
            ],
            portal: token?.portalFull?.name || "Pushuser",
            event: `${user.username} paid by Sale of Token ${token.name}`,
            transactionCreated: new Date(),
          });
          const t = await trans
            .save()
            .catch((error) =>
              handleError(
                "Failed to create transaction for user which was paid by Sale of Token" +
                error,
                session
              )
            );
          transactionId = t?._id;
          orderId = t?._id;
        }
      }

      const finedGame = await Game.findOne({
        idOfToken: token._id.toString(),
      }).exec();
      if (finedGame) {
        await GameService.setUserTermsConfirm({
          userEmail: req.user.email,
          gameId: finedGame._id.toString(),
        });
      }

      await session.commitTransaction();
      session.endSession();
    }

    
    await EmailService.sendProductBought(
      user,
      addressInfo,
      body.tokens,
      delivery === "hold",
      transactionId,
      orderId,
      payment
    );

    return res.status(200).send({ message: "Success" });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ message: error.message });
  }
}

async function buyTokenFromGoPortal(req, res) {
  try {
    const { userInfo, selectedTokens } = req.body;

    const optInWithEthAddress = userInfo?.optIn;
    const ethAddress = userInfo?.ethAddress;

    if (optInWithEthAddress && !ethAddress) {
      throw new Error("Please provide your ETH address");
    }


    let entireCost = 0;
    for (const token of selectedTokens) {
      entireCost += token.price * token.quantity;
    }

    let chargeId;
    try {
      const tokenInfo = userInfo.paymentTokenInfo.id;
      chargeId = await StripeClient.chargeCustomersCard(entireCost * 100, tokenInfo);
    } catch (error) {
      console.error('Failed to charge customer:', error);
      throw new Error('Failed to charge customer.');
    }

    for (const token of selectedTokens) {
      for (const size of token.selectedSizes) {
        const order = new Order({
          tokenId: token._id,
          productId: null,
          userId: null,
          chargeId: chargeId,
          deliveryInfo: userInfo.deliveryInfo,
          userEthAddress: ethAddress,
          cost: token.price,
          size: size.symbol,
          quantity: size.quantity,
          color: "",
          name: `${size.name} ${token.name}`,
          image: token.icon.app.url
        });
        await order.save();
      }
    }

    return res.status(200).send({ message: "Customer charged", chargeId });
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
}

async function mintTokenForUser(transactionId) {
  try {
    const bt = await BlockchainTransaction.findById(transactionId).exec();
    await blockchainService.buyToken(bt.tokenAddress, bt.amount, bt.to);

    bt.success = true;
    await bt.save();
    return bt._id;
  } catch (error) {
    throw new Error(error.message);
  }
}

module.exports = {
  getTokens,
  getTokensForStory,
  getAllTokens,
  getTokenById,
  createToken,
  updateToken,
  getTokensByType,
  getTokensForPortal,
  getTokenForPortal,
  getTokensForUser,
  getVideoForToken,
  deleteToken,
  pinMetadata,
  deployToken,
  startTokenSale,
  buyToken,
  buyTokenFromGoPortal,
  addSlides,
  mintTokenForUser,
  isTokenRelatedToSomeNotValidGame,
};
