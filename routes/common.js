function isAuthenticated(req, res, next) {
    if (!req.user) {
        return res.render({

        });
    }
    next();
}

module.exports.isAuthenticated = isAuthenticated;