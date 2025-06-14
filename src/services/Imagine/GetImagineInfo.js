const HttpStatus = require("http-status-codes");

const Transaction = require("../../models/transaction");
const User = require("../../models/user");
const Object = require("../../models/object");

const execute = async (req, res) => {
  try {
    const transactionCount = await Transaction.countDocuments();
    const userCount = await User.countDocuments();
    const objectCount = await Object.countDocuments();

    const data = {
      portals: 6,
      objects: objectCount,
      pathways: transactionCount,
      nodes: userCount,
    };

    res.status(HttpStatus.OK).json(data);
  } catch (err) {
    console.error(err.message);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: "Server Error" });
  }
};

module.exports = { execute };
