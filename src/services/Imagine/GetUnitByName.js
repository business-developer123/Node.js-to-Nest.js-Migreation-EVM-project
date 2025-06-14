const HttpStatus = require("http-status-codes");

const Unit = require("../../models/unit");

const execute = async (req, res) => {
  try {
    const unit = await Unit.findOne({ name: req.params.name });

    if (!unit) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ message: "Unit not found" });
    }

    res.status(HttpStatus.OK).json(unit);
  } catch (err) {
    console.error(err.message);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: "Server Error" });
  }
};

module.exports = { execute };
