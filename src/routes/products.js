const ProductService = require('../services/Product/product')
const CheckoutProduct = require('../services/Product/CheckoutProduct')
const TokenService = require('../services/Token/token')
const authentication = require('../middleware/authentication')
const PutProductInMarketplace = require('../services/Product/PutProductInMarketplace')
const { isBrand } = require('../middleware/authorization');

var express = require('express')
var router = express.Router()

router.post('/createProduct', authentication.isAuthenticated, function (req,res) { ProductService.createProduct(req, res) })
router.post('/buyProducts', function (req,res) { CheckoutProduct.buyProducts(req, res) })
router.get('/getProducts', function (req,res) { ProductService.getProductsForSelling(req, res) })
router.get('/getDummyProducts', function (req,res) { ProductService.getDummyProducts(req, res) })
router.get('/getProductsByToken', function(req, res) { ProductService.getProductsByToken(req, res) })
router.get('/getProductById', authentication.isAuthenticated, function (req,res) { ProductService.getProductById(req, res) })
router.get('/getProductsForGame', authentication.isAuthenticated, function (req,res) { ProductService.getProductsForGame(req, res) })
router.get('/getProductsToReview', authentication.isAuthenticated, (req,res) => ProductService.getProductsToReview(req, res))
router.get('/getProductTopObjects', authentication.isAuthenticated, (req, res) => ProductService.getProductTopObjects(req, res))
router.get('/getProductsForBrand', authentication.isAuthenticated, function (req,res) { ProductService.getProductsForBrand(req, res) })
router.get('/getProductsForPortal', function (req,res) { ProductService.getProductsForPortal(req, res) })
router.get('/getProductUsers', authentication.isAuthenticated, function (req,res) { ProductService.getUsersWhoPlayedForProduct(req, res) })
router.post('/putProductInMarketplace', authentication.isAuthenticated, function (req,res) { PutProductInMarketplace.execute(req, res) })
router.delete('/deleteProduct', authentication.isAuthenticated, isBrand, function (req, res) { ProductService.deleteProduct(req, res) })
router.post('/createDummyProduct', authentication.isAuthenticated, isBrand, function (req, res) { ProductService.createDummyProduct(req, res) })
router.put('/updateProduct', authentication.isAuthenticated, isBrand, function (req, res) { ProductService.updateProduct(req, res) })
// TODO: remove to Tokens route
router.get('/getTokenForPortal', function(req, res){
  const portal = req.query
  const user = req.user
  return TokenService.getTokenForPortal(portal, user?.ethAddress)
      .then(data => res.status(data.status).send({message: data.message, token: data.token, nftData: data.nftData}))
      .catch(err => res.status(500).send({message: err.message}))
})

module.exports = router
