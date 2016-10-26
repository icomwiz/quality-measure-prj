var Report = require('../models/report');
var formidable = require('formidable');

var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
    var action = parseInt(req.query.action);
    if (action === 0) {
        var user_id = req.user.id;
        Report.reportList(function(err, result) {
            if(err) {
                return next(err);
            }
            Report.addReport(user_id, function(err, leader, member, equipment, results) {
                if (err) {
                    return next(err);
                }

                // console.log(results[2][0].id);
                // console.log(results[2][0].location);
                // console.log(results[2][0].car_number);
                // console.log(results[2][0].car_type);
                // console.log(results[2][0].type);
                // console.log(results[2][0].date);

                res.render('main', {
                    title : 'Icomwiz',
                    report : result,
                    leader : leader,
                    member : member,
                    equipment : equipment,
                    base : results[2][0]
                });

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

router.post('/', function(req, res, next) {
    var info = {};
    info.report = req.body;
    info.report.user_id = req.user.id;
    console.log(info);
    console.log("===============================================");
    console.log(info.report);

    Report.newReport(info, function(err, result) {
        if(err) {
            return next(err);
        }
        res.send({result : "ok"});
    });
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
