var login = require('../../../../Users/taehwan/Desktop/quality-measure-prj/models/login');

var express = require('express');
var router = express.Router();


router.get('/', function(req, res, next) {
    res.render('login', { title: 'Icomwiz' });
});

router.post('/', function(req, res, next) {
    var user = {};
    user.email = req.body.c_id;
    user.pw = req.body.c_pw;

    login.login(user, function(err, result) {
        if(err) {
            return next(err);
        }
        console.log(result);
        if(result) {
            return res.redirect('/main');
        }
        res.redirect('/login');
    });
});

module.exports = router;
