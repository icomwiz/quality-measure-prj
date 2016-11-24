function isAuthenticated(req, res, next) {
    if (!req.user) {
        res.redirect('http://124.137.28.247:8080/auth');
    }
    next();
}

module.exports.isAuthenticated = isAuthenticated;