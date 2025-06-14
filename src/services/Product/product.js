const Product = require("../../models/product");
const Game = require("../../models/game");
const Brand = require("../../models/brand");
const Unit = require("../../models/unit");
const User = require("../../models/user");
const ObjectModel = require("../../models/object");
const GameSave = require('../../models/gameSave')
const UnitType = require("../../constants/unitType");
const userTypes = require("../../constants/userType")
const s3Service = require("../S3/S3Service")
const productStates = require("../../constants/productStates");
const object = require("../../models/object");
var ObjectId = require('mongoose').Types.ObjectId;
const product = require("../../models/product");

async function createProduct(req, res) {
  let brand = await Brand.findOne({ email: req.body.brandEmail })
  var body = req.body;
  let image = [{ url: req.body.image }]


  // If we will let portal/brand to create image for products
  //let image = ""
  // try {
  //   image = await s3Service.uploadProductImageToS3(req.body.image)
  // } catch(error) {
  //   return res
  //       .status(500)
  //       .send({ message: "Unable to upload product photo " + error });
  // }

  new Product({
    tokenId: body.tokenId,
    brandId: brand?.id,
    type: body.type,
    description: body.description,
    cost: body.cost,
    images: image,
    name: body.name,
    size: body.size,
    pickSize: body.pickSize || body.size.length > 0,
    numberOfGames: body.numberOfGames,
    state: body.state,
  })
    .save()
    .then(async (product) => res.status(200).send({ message: "Success", product: product }))
    .catch((error) => {
      console.log("Unable to create product, " + error);
      return res
        .status(500)
        .send({ message: "Unable to create product, " + error });
    });
}

async function getProductsForSelling(req, res) {
  var products = await Product.find({ state: productStates.SELLING })
    .populate("brandId")
    .exec();

  var response = [];
  for (let product of products) {
    var productResponse = {};
    productResponse.brand = product.brandId?.businessName;
    productResponse.cost = product.cost;
    productResponse.description = product.description;
    productResponse.image = product.images[0];
    productResponse.id = product.id;
    productResponse.name = product.name;
    response.push(productResponse);
  }

  return res.status(200).send({ products: response });
}

const getUniqueListBy = (arr, key) => [...new Map(arr.map(item => [item[key], item])).values()]

async function getUsersWhoPlayedForProduct(req, res) {
  const productId = req.query.product_id
  let usersThatPlayed = []
  let usersToReturn = []
  let productUsers = await User.find({ type: userTypes.PUSHUSER })

  let games = await Game.find({ productId: productId })
  for (game of games) {
    var submissions = await GameSave.find({ gameId: game.id, submission: { $ne: '' } }).populate('userId').exec()
    if (submissions.length) {
      for (submission of submissions) {
        usersThatPlayed.push({ id: submission.userId._id.toString() })
      }
    }
  }

  let filteredArray = getUniqueListBy(usersThatPlayed, 'id')
  for (userThatPlayed of filteredArray) {
    let userPlayed = {
      _id: '',
      playedGame: false,
      username: '',
      nodeID: ''
    }
    let foundUser = productUsers.find(pu => pu._id.toString() === userThatPlayed.id.toString());
    if (foundUser) {
      userPlayed._id = foundUser._id
      userPlayed.playedGame = true
      userPlayed.nodeID = foundUser.nodeID
      userPlayed.username = foundUser.username
      usersToReturn.push(userPlayed)
    }
  }

  let results = productUsers.map(obj => usersToReturn.find(o => o._id.toString() === obj._id.toString()) || obj);
  res.status(200).send({ productUsers: results });
}

async function getProductsToReview(req, res) {

  let brand = await Brand.findOne({ email: req.query.brandEmail })
  var products = await Product.find({ brandId: brand._id, state: productStates.REVIEW }).exec();

  return res.status(200).send({ products: products });
}

async function getProductTopObjects(req, res) {
  let productId = req.query.productId
  var objects = await ObjeObjectModelct.find({ productId: productId, isMasterObject: true }).exec();

  for (o of objects) {
    //for now it is only one child object
    var childO = await ObjectModel.findById(o.childObjects[0]).exec();
    o.childObjects.push(childO)
  }

  return res.status(200).send({ topObjects: objects });
}

async function getProductsForPortal(req, res) {
  let portal = req.query.portal
  let products = await Product.find({ state: "SELLING", portal: portal }).exec();

  return res.status(200).send({ message: "Success", products: products });
}

async function getDummyProducts(req, res) {
  let products = await Product.find({ state: "DUMMY" }).exec();
  return res.status(200).send({ message: "Success", products: products });
}

async function getProductsForBrand(req, res) {
  let brand = await Brand.findOne({ email: req.query.brandEmail })
  var products = await Product.find({ brandId: brand._id }).exec();
  var response = [];
  for (product of products) {
    var gamesPlayed = await Game.find({
      productId: product.id,
      state: productStates.COMPLETE,
    }).exec();
    var gamesInPlay = await Game.find({
      productId: product.id,
      state: { $nin: [productStates.COMPLETE, productStates.FAILED] },
    }).exec();
    var productResponse = {};
    productResponse.cost = product.cost;
    productResponse.description = product.description;
    productResponse.image = product.images[0];
    productResponse.games_played = gamesPlayed.length;
    productResponse.games_in_play = gamesInPlay.length;
    productResponse.id = product.id;
    productResponse.name = product.name;
    productResponse.numberOfGames = product.numberOfGames;
    productResponse.state = product.state;
    response.push(productResponse);
  }

  return res.status(200).send({ products: response });
}

async function getProductsForGame(req, res) {
  let brand = await Brand.findOne({ email: req.query.email })
  var products = await Product.find({
    brandId: brand._id,
    state: productStates.DEVELOPING,
    type: "DRRT",
  }).exec();
  var response = [];
  for (let product of products) {
    let games = await Game.find({ productId: product.id, brandId: brand.id })
    if (games.length <= product.numberOfGames) {
      var productResponse = {};
      productResponse.id = product.id;
      productResponse.name = product.name;
      productResponse.image = product.images[0]
      productResponse.numberOfGames = product.numberOfGames
      productResponse.gamesCreated = games.length ? games.length : 0
      productResponse.productDetail = product.productDetail
      response.push(productResponse);
    }

  }

  return res.status(200).send({ products: response });
}

async function getProductById(req, res) {
  let productId = req.query.product_id
  let product = await Product.findById(ObjectId(productId));
  return res.status(200).send({ product: product });
}

async function getProductsByToken(req, res) {
  try {
    let products = await Product.find({ tokenId: req.query.tokenId })

    if (products.length > 0) {
      return res.status(200).send({ message: "Success", products: products });

    } else {
      throw new Error();
    }
  } catch (error) {
    return res.status(500).send({ message: "Not Found", products: [] });
  }
}

async function deleteProduct(req, res) {
  const productId = req.query.productId;
  if (!productId) {
    return res.status(404).send({ message: 'Not found' });
  }
  try {
    await Product.findOneAndRemove({ _id: req.query.productId })
    return res.status(200).send({ message: "Success" });
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
}

async function createDummyProduct(req, res) {
  let brand = await Brand.findOne({ email: req.body.brandEmail })
  var body = req.body;

  let image = ""
  try {
    image = await s3Service.uploadProductImageToS3(req.body.image)
  } catch (error) {
    return res.status(500).send({ message: "Unable to upload product photo " + error });
  }

  try {
    const product = new Product({
      tokenId: body.tokenId,
      brandId: brand?.id,
      type: body.type,
      description: body.description,
      cost: body.cost,
      images: image,
      name: body.name,
      size: body.size,
      pickSize: body.pickSize || body.size && body.size.length > 0,
      numberOfGames: body.numberOfGames,
      state: productStates.DUMMY,
    });

    await product.save();
    return res.status(200).send({ message: "Success", product: product })
  } catch (error) {
    console.log("Unable to create product, " + error);
    return res.status(500).send({ message: "Unable to create product, " + error });
  }
}

async function updateProduct(req, res) {
  const params = ['type', 'description', 'cost', 'name', 'size', 'pickSize', 'numberOfGames', 'state'];
  const body = req.body;
  let product = null;

  try {
    product = await Product.findOne({ _id: body.productId });
  } catch (error) {
    console.log("Unable to update product, " + error);
    return res.status(500).send({ message: "Unable to update product" });
  }

  if (!product) {
    return res.status(404).send({ message: 'Not found' });
  }

  if (req.body.image) {
    let image = ""
    try {
      image = await s3Service.uploadProductImageToS3(req.body.image)
      product.images = image;
    } catch (error) {
      return res.status(500).send({ message: "Unable to upload product photo " + error });
    }
  }

  Object.keys(body).forEach((key) => {
    if (params.indexOf(key) >= 0) {
      product[key] = body[key];
    }
  });

  try {
    await product.save();
    return res.status(200).send({ message: "Success", product: product })
  } catch (error) {
    console.log("Unable to update product, " + error);
    return res.status(500).send({ message: "Unable to update product" });
  }
}

module.exports = {
  createProduct,
  getDummyProducts,
  getProductsByToken,
  getProductsForSelling,
  getProductsForBrand,
  getProductsToReview,
  getProductTopObjects,
  getProductsForGame,
  getUsersWhoPlayedForProduct,
  getProductsForPortal,
  getProductById,
  deleteProduct,
  createDummyProduct,
  updateProduct,
};
