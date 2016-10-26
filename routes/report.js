var Report = require('../models/report');
var formidable = require('formidable');

var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
    var action = parseInt(req.query.action);
    console.log(action);
    if (action === 0) {
        Report.report(function(err, result) {
            if(err) {
                return next(err);
            }
            res.render('main', {
                title : 'Icomwiz',
                report : result
            });
        });
    } else if ( action === 1 ) {
        var teamId = req.query.teamId || -1;
        Report.getReportsByteamId(teamId, function(err, result) {
            if (err) {
                return next(err);
            }
            console.log(result);
            res.send({
                result: result
            });
        });
    } else {
        res.send(new Error('action 지정 하세요'));
    }
});

router.post('/planner', function(req, res, next) {
    var form = new formidable.IncomingForm();
    form.uploadDir = path.join(__dirname, '../planners');
    form.keepExtensions = true;
    form.multiples = false;
    form.parse(req, function(err, fields, files) {
        if (err) {
            return next(err);
        }

    });
    res.send({
       result: 'hi'
    });
});

module.exports = router;
