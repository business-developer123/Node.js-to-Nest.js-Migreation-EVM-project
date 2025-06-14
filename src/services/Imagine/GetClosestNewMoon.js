const HttpStatus = require("http-status-codes");

const MoonService = require("../newMoon");

const execute = async (req, res) => {
  try {
    const closestNewMoon = await MoonService.getClosestNewMoon();
    res.status(HttpStatus.OK).json({ newMoon: closestNewMoon });
  } catch (err) {
    console.error(err.message);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: "Server Error" });
  }
};

module.exports = { execute };
