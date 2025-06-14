function isAuthenticated (req, res, next) {
    if(req.user)
       return next()
    else
       return res.status(401).send({ message: 'User not authenticated.' })
}

module.exports = { isAuthenticated }
