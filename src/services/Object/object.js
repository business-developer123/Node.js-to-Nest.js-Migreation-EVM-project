const path = require("path");
const Object = require("../../models/object");
const User = require("../../models/user");
const Transaction = require("../../models/transaction");
const Coin = require("../../models/coin");
const Product = require("../../models/product");
const ObjectSymbol = require("../../models/objectSymbol");
const Unit = require("../../models/unit");
const Brand = require("../../models/brand");
const UnitType = require("../../constants/unitType");
const productStates = require("../../constants/productStates");
var ObjectId = require('mongoose').Types.ObjectId;

async function createObjectFromGame(objectData, game) {
  let oSymbol = await ObjectSymbol.findOne({
    category: game.type.toLowerCase(),
  });
  if (!oSymbol) {
    return false
  }
  let object = new Object({
    brandOwner: game.brandId,
    gameId: objectData.game_id,
    description: objectData.submission,
    symbol: oSymbol.symbolUrl,
    type: game.type,
    // productId: game.productId.toString().split(),
    users: objectData.username.split(),
    image: game.image,
    name: game.name,
  });

  const oldObject = await Object.findOne({
    brandOwner: game.brandId,
    gameId: objectData.game_id,
    users: objectData.username.split(),
    symbol: oSymbol.symbolUrl
  })

  if (oldObject) {
    oldObject.description = objectData.submission
    await oldObject.save().catch((error) => {
      console.log(`Failed to create object ${error}` )
      return false
    });
  } else {
    await object.save().catch((error) => {
      console.log(`Failed to create object ${error}` )
      return false
    });
  }

  const unit = new Unit({
    unitType: UnitType.OBJECT,
    image: object.image,
    name: object.name,
    unitId: oldObject?._id || object._id,
    description: object.description,
  });
  try {
    await unit.save();
  } catch (error) {
    console.log(`Failed to create object ${error}` )
    return false
  }

  return true;
}

async function createObject(objectBody) {
  let oSymbol = await ObjectSymbol.findOne({
    category: objectBody.type.toLowerCase(),
  });
  let existingObject = await Object.findOne({gameId: objectBody.gameId, isMasterObject: true}).exec()
  if (existingObject) {
    return {message: `Master object already created for this game: ${objectBody.gameId}`, status: 500}
  }
  let masterObjects = await Object.find({productId: objectBody.productId.split(), isMasterObject: true}).exec()
  let objectPercentage = 25/(masterObjects.length+1)
  for (masterObject of masterObjects) {
    masterObject.percentage = objectPercentage
    masterObject.markModified("percentage")
    await masterObject.save()
  }
  let brand = await Brand.findById(objectBody.brandId)
  let product = await Product.findById(objectBody.productId.split())

  if (product.topObjectCreated >= product.numberOfGames) {
    return { message: `All top objects created for this product`, status:400 };
  }

  let object = new Object({
    brandOwner: brand.id,
    description: objectBody.description,
    symbol: oSymbol.symbolUrl,
    price: objectBody.price,
    gameId: objectBody.gameId,
    percentage: objectPercentage,
    type: objectBody.type,
    //image: objectBody.image,
    name: objectBody.name,
    childObjects: objectBody.objectIds,
    productId: objectBody.productId.split(),
    isMasterObject: true
    //inventory: parseInt(objectBody.inventory)
    //users: objectBody.users,
  });
  object.save();
  await object.save().catch((error) => {
    `Unable to create product, ${error}`;
  });

  const unit = new Unit({
    unitType: UnitType.OBJECT,
    image: object.image,
    name: object.name,
    unitId: object._id,
    description: object.description,
  });
  try {
    await unit.save();
  } catch (error) {
    return { message: `Failed to create object ${error}`, status:500 };
  }

  product.topObjectCreated += 1
  if (product.topObjectCreated === product.numberOfGames) {
    product.state = productStates.REVIEW;
  }

  let productId = objectBody.productId;
  product.objects.push(object._id);
  await product.save().catch((error) => {
    return {message: `unable to update product:${productId}, ${error}`, status:500};
  });
  return { message: "Success", object: object, productState: product.state, status:200 };
}

async function getObjects() {
  return path.resolve("../../../client/purchaseObj.html");
}

async function getObject() {
  return Object.findOne({}, (err, object) => {
    if (err) {
      return { object: null, message: err };
    }
    return { object: object, message: "Success" };
  });
}

async function getAllGamesObjects(gameId) {
  let objects = await Object.find({gameId: gameId}).catch(err => {
    return {message: `Unable to find objects for game:${gameId}, ${err}`};
  });
  return { object: objects, message: "Success" };
}

async function getAllBrandObjects(brandId) {
  let objects = await Object.find({brandOwner: new ObjectId(brandId)}).catch(err => {
    return {message: `Unable to find objects for game:${gameId}, ${err}`};
  });
  return { object: objects, message: "Success" };
}

async function getAllProductObjects(productId) {
  let objects = await Object.find({productId: productId}).catch(err => {
    return {message: `Unable to find objects for game:${gameId}, ${err}`};
  });
  return { object: objects, message: "Success" };
}

async function purchase() {
  async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  }

  Object.findOne({}, async (err, object) => {
    if (object.inventory !== 0) {
      object.inventory -= 1;
      object.save();
      var amount = (parseFloat(object.price) * 100) / object.users.length;

      const session = await User.startSession();
      session.startTransaction();
      const opts = { session };
      asyncForEach(object.users, async (user) => {
        var date = new Date();
        var transaction = new Transaction({
          received: true,
          user: {

          },
          from: "https://nodeid.s3.amazonaws.com/imagine_council_logo.png",
          to: '',
          event: `${user} has received ${amount} points from a purchased object`,
          transactionCreated: date,
        });
        console.log("in session");
        try {
          var date = new Date();
          const A = await User.findOne(
            { username: user },
            (err, foundUser) => {
              foundUser.coinCount = (
                parseFloat(foundUser.coinCount) + amount
              ).toString();
              foundUser.save();
            },
            opts
          );

          const B = await Coin.findOne(
            {},
            (err, coin) => {
              coin.amountInSystem = (
                parseFloat(coin.amountInSystem) + amount
              ).toString();
              coin.save();
            },
            opts
          );
          const C = await transaction.save();
          console.log("saved");
          await session.commitTransaction();
          session.endSession();
          return { message: "Success" };
        } catch (error) {
          // If an error occurred, abort the whole transaction and
          // undo any changes that might have happened
          await session.abortTransaction();
          session.endSession();
          throw error;
        }
      });
    } else {
      // return none in stock
    }
  });
}

module.exports = {
  getObjects,
  getObject,
  purchase,
  getAllBrandObjects,
  getAllGamesObjects,
  getAllProductObjects,
  createObjectFromGame,
  createObject,
};
