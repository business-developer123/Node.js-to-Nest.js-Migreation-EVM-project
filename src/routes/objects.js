var express = require('express');
var router = express.Router();
let ObjectService = require('../services/Object/object')
const authentication = require('../middleware/authentication')

router.get('/objects', authentication.isAuthenticated, function(req, res){
    const file = ObjectService.getObjects();
    res.sendFile(file)
})

router.get('/gameObjects', authentication.isAuthenticated, function(req, res) {
    const gameId = req.query.game_id
    ObjectService.getAllGamesObjects(gameId)
        .then(data => res.status(200).send({object : data.object}))
        .catch(err => res.status(500).send({message : err}));
})

router.get('/brandObjects', authentication.isAuthenticated, function(req, res) {
    const brandId = req.query.brand_id
    ObjectService.getAllBrandObjects(brandId)
        .then(data => res.status(200).send({object : data.object}))
        .catch(err => res.status(500).send({message : err}));
})

router.get('/productObjects', authentication.isAuthenticated, function(req, res) {
    const productId = req.query.product_id
    ObjectService.getAllProductObjects(productId)
        .then(data => res.status(200).send({object : data.object}))
        .catch(err => res.status(500).send({message : err}));
})

router.post('/createObject', authentication.isAuthenticated, function(req, res){
    let objectData = req.body; 
    ObjectService.createObject(objectData)
        .then(data => {
            if (data.message === 'Success') {
                return res.status(200).send({object : data.object})   
            }
            return res.status(500).send({message : data.message})
        })
        .catch(err => res.status(500).send({message : err}));
})

router.post("/getObject", function(req, res) {
    let object = ObjectService.getObject()
    if (object === null) return res.status(500).send({message : 'Could not get object'});
    return res.status(200).send({message : 'Success', object});
  })  
  
router.post("/purchase", async (req, res)=>{
    let data = ObjectService.purchase()
    if (data.message === 'Success') {
        res.status(200).send({message : 'Success'});
    }
})

module.exports = router;