const HttpStatus = require("http-status-codes");

const Unit = require("../../models/unit");
const UnitType = require("../../constants/unitType");

const DEFAULT_LIMIT = 30;

const execute = async (req, res) => {
  try {
    const { page, limit, search, unitType } = req.query;

    const opts = { sort: "unitType" };

    if (page) {
      opts.page = page;
      opts.limit = limit || DEFAULT_LIMIT;
    } else {
      opts.pagination = false;
    }

    const query = {};

    if (search) {
      query["name"] = { $regex: new RegExp(`${search}`), $options: "i" };
    }
    if (unitType) {
      query["unitType"] = UnitType[unitType];
      if (unitType === "CARTOON" || unitType === "USER") {
        query["unitType"] = { $in: [UnitType.CARTOON, UnitType.USER] };
      }
    }

    const data = await Unit.paginate(query, opts);

    res.status(HttpStatus.OK).json(data);
  } catch (err) {
    console.error(err.message);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: "Server Error" });
  }
};

module.exports = { execute };
