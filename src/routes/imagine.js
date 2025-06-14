const express = require("express");
const router = express.Router();

const GetImagineInfo = require("../services/Imagine/GetImagineInfo");
const GetUnits = require("../services/Imagine/GetUnits");
const GetUnitByName = require("../services/Imagine/GetUnitByName");
const GetClosestNewMoon = require("../services/Imagine/GetClosestNewMoon");

router.get("/", GetImagineInfo.execute);
router.get("/searchUnits", GetUnits.execute);
router.get("/getClosestNewMoon", GetClosestNewMoon.execute);
router.get("/getUnitByName/:name", GetUnitByName.execute);

module.exports = router;
