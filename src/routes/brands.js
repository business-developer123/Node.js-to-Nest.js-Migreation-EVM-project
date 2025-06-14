LocalStrategy  = require("passport-local")
passportLocalMongoose = require("passport-local-mongoose")
passport = require("passport")
const multer = require("multer")
let express = require('express')
let fs = require('file-system')
let request = require('request')

const { isBrand } = require('../middleware/authorization');
const brandService = require('../services/Brand/brand')
const tokenService = require('../services/Token/token')
const bank = require('../services/Bank/bank')

const authentication = require('../middleware/authentication')

var Brand = require('../models/brand')
const S3Service = require("../services/S3/S3Service")

var router = express.Router()
let upload = multer({ dest: 'upload/' })

passport.use('localBrand', Brand.createStrategy());

router.get("/all", async function(req, res) {
  return brandService.getAllBrands()
      .then(data => res.status(data.status).send({ message: data.message, data: data.brands }))
      .catch(error => res.status(500).send({ message: error.message }))
})

router.post("/signUpBrand", async function(req, res){
  let brandData = req.body;
  return brandService.signUpBrand(brandData)
    .then(data => res.status(data.status).send({message : data.message, user: brandData.email}))
    .catch(error => res.status(500).send({message: error.message}))
})

router.put("/:brandId", async function(req, res) {
  let brandId = req.params.brandId;
  let values = req.body;
  return brandService.updateBrand(brandId, values)
      .then(data => res.status(data.status).send({message: data.message, status: data.status}))
      .catch(error => res.status(500).send({message: error.message}))
})

router.post('/loginBrand', (req, res, next) => {
  passport.authenticate('localBrand', (error, brand, info) => {
    if (error) return next(error)
    if (!brand) return res.status(403).send({ message: 'Login failed!' })

    let isVerified = brandService.checkIfEmailIsVerified(brand);
    if (!isVerified) return res.status(403).send({ message: 'Your email still needs to be verified, check your inbox and click the link to verify!' });

    req.logIn(brand, function(err) {
      if (err) return next(err)
      return res.status(200).send({ message: 'Success', brand: brand })
    })
  })(req, res, next)
})

router.post("/forgotPassword", async function(req, res){
  let {email} = req.body;
  return brandService.forgotPassword(email)
    .then(data => res.status(data.status).send({ message: data.message }))
    .catch(error => res.status(500).json({ error: error.message }));
})

router.post('/resetPassword', async function(req, res) {
  let {id, pin, password} = req.body;
  return brandService.resetPassword(id, password, pin)
    .then(data => res.status(data.status).send({message: data.message}))
    .catch(err => res.status(500).send({message: err.message}))
})

router.get('/verifyEmail', async function(req, res) {
  let brandData = req.query;
  return brandService.verifyEmail(brandData)
    .then(data => res.status(data.status).send({message: data.message}))
    .catch(error => res.status(500).send({message: error.message}))
})

router.get('/getBrandData', authentication.isAuthenticated, function(req, res) {
  let brand = req.user;
  res.status(200).send({ message: "Success", brand_data: brand })
  // return brandService.getBrandData(brand)
  //   .then(data => res.status(200).send({ message: data.message, brand_data: data.brand_data }))
})

router.post('/uploadBrandProductlogo', authentication.isAuthenticated, function(req, res) {
  let file = JSON.parse(Object.keys(req.body)[0]);
  brandService.uploadProductImage(file, file.user)
    .then(data => {
    res.status(200).json({
      method: 'put',
      url: data.url,
      img: data.img,
      fields: {},
      headers: {'x-amz-tagging': `fileName=${file.metadata.name}`}
    })
    }).catch(error => res.status(500).send({message: error.message}))
})

router.post('/completeOnboarding', authentication.isAuthenticated, function(req, res){
  let brandUserData = req.body
  return brandService.completeOnboarding(brandUserData)
      .then(data => res.status(data.status).send({message: data.message, brand: data.brand}))
      .catch(err => res.status(500).send({message: err.message}))
})

router.post('/createToken', authentication.isAuthenticated, isBrand, function(req, res){
  let tokenData = req.body
  return tokenService.createToken(tokenData)
      .then(data => res.status(data.status).send({message: data.message, token: data.token}))
      .catch(err => res.status(500).send({message: err.message}))
})

router.delete('/deleteToken', authentication.isAuthenticated, isBrand, function(req, res){
  let tokenId = req.query.tokenId
  return tokenService.deleteToken(tokenId)
      .then(data => res.status(data.status).send({message: data.message}))
      .catch(err => res.status(500).send({message: err.message}))
})

router.get('/getTokensForPortal', authentication.isAuthenticated, isBrand, function(req, res){
  let portal = req.query
  return tokenService.getTokensForPortal(portal)
      .then(data => res.status(data.status).send({message: data.message, tokens: data.tokens}))
      .catch(err => res.status(500).send({message: err.message}))
})

router.get('/getTokensByType', authentication.isAuthenticated, isBrand, function(req, res) {
  let tokenType = req.query.type
  return tokenService.getTokensByType(tokenType)
      .then(data => res.status(data.status).send({message: data.message, tokens: data.tokens}))
      .catch(err => res.status(500).send({message: err.message}))
})

router.post('/addPaymentBank', authentication.isAuthenticated, function(req,res) {
  let brandData = req.body
  return brandService.addPaymentBank(brandData)
      .then(data => res.status(data.status).send({message: data.message}))
      .catch(err => res.status(500).send({message: err.message}))
})

router.post('/verifyAmounts', authentication.isAuthenticated, function (req, res) {
  let brandData = req.body
  return brandService.verifyAmounts(brandData)
      .then(data => res.status(data.status).send({message: data.message}))
      .catch(err => res.status(500).send({message: err.message}))
})

router.post('/purchaseCoins', authentication.isAuthenticated, function (req, res) {
  let brandData = req.body;
  return brandService.purchaseCoins(brandData)
      .then(data => res.status(data.status).send({message: data.message}))
      .catch(err => res.status(500).send({message: err.message}))
})

router.post('/purchasePackage', authentication.isAuthenticated, function (req, res) {
  let brandData = req.body;
  return brandService.purchasePackage(brandData)
      .then(data => res.status(data.status).send({message: data.message}))
      .catch(err => res.status(500).send({message: err.message}))
})

router.post('/addBank', authentication.isAuthenticated, function(req, res) {
  let bankUser = req.user;
  let bankNumbers = req.body
  return bank.addBank(bankUser, bankNumbers)
    .then((data) => res.status(data.status).send({ message : data.message }))
    .catch(err => res.status(500).send({error: err}))
})
router.post('/addDebitCard', authentication.isAuthenticated, function(req, res) {
   let bankUser = req.user;
   let {token} = req.body
   return bank.addDebitCard(bankUser, token)
    .then((data) => res.status(data.status).send({ message : data.message }))
    .catch(err => res.status(500).send({error: err}))
})
router.post('/cashout', authentication.isAuthenticated, function(req, res) {
  let brand = {email: req.body.user};
  return bank.cashOut(brand, false, true) //brand is calling function
    .then((data) => res.status(data.status).send({ message : data.message }))
    .catch(err => res.status(500).send({error: err}))
})
router.post('/verifyUser', authentication.isAuthenticated, upload.single('file'), function(req, res) {
  let brand = req.user;
  let file = req.file.path;
  let body= JSON.parse(req.body.data);
  let remoteAddress = req.connection.remoteAddress;
  return brandService.verifyBrand(brand, body, file, remoteAddress)
    .then(data => res.status(data.status).send({message: data.message}))
    .catch(error => res.status(500).send({message: error.message}))
})

module.exports = router;
