var Employee = require('../models/employee');

var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
    res.render('login', { title: 'Icomwiz' });
});

router.post('/', function(req, res, next) {
    var user = {};
    user.email = req.body.email;
    user.password = req.body.password;

    Employee.login(user, function(err, result) {
        if(err) {
            return next(err);
        }
        if (result) {
            //return res.render('/login', {result: 'ok'});
            return res.send({
                result: 'ok'
            });
        }
        res.send({
            result: 'fail'
        });
    });
});

module.exports = router;
