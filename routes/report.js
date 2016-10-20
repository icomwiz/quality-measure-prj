var Report = require('../models/report');

var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
    Report.report(function(err, result) {
        if(err) {
            return next(err);
        }
        res.render('main', {
            title : 'Icomwiz',
            report : result
        });
    });
});


router.post('/', function(req, res, next) {

});

module.exports = router;
