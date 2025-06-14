const HttpStatusCodes = require('http-status-codes');
const userRoles = require('../constants/userRoles');

const isUser = (req, res, next) => {
   const userRole = req.user.role;
   if (userRole === userRoles.USER) {
      return next();
   } else {
      return res.status(HttpStatusCodes.FORBIDDEN).send({ message: 'This service is not for you.' })
   }
}

const isBrand = (req, res, next) => {
   const userRole = req.user.role;
   if (userRole === userRoles.BRAND) {
      return next();
   } else {
      return res.status(HttpStatusCodes.FORBIDDEN).send({ message: 'This service is not for you.' })
   }
}

const isAdmin = (req, res, next) => {
   const userRole = req.user.role;
   if (userRole === userRoles.ADMIN) {
      return next();
   } else {
      return res.status(HttpStatusCodes.FORBIDDEN).send({ message: 'This service is not for you.' })
   }
}

module.exports = {
   isUser,
   isBrand,
   isAdmin
};
