var Report = require('../models/report');
var formidable = require('formidable');
var path = require('path');
var express = require('express');
var date = require('date-utils');
var fs = require('fs');
var router = express.Router();

router.get('/', function(req, res, next) {
    var action = parseInt(req.query.action);
    var Reportid = parseInt(req.query.Reportid);
    if (action === 0 && !Reportid) {
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
                    base : results[2][0],
                    report_id : result[0].id
                });
            });
        });
    } else if ( action === 1 && !Reportid) {
        var teamId = req.query.teamId || -1;
        Report.getReportsByteamId(teamId, function(err, result) {
            if (err) {
                return next(err);
            }
            res.send({
                result: result
            });
        });
    } else if(action === 0 && Reportid) {
        res.send({
            result : "1234"
        });
    }
    else {
        res.send(new Error('action 지정 하세요'));
    }
});

router.post('/', function(req, res, next) {
    var info = {};
    info.report = req.body;
    info.report.user_id = req.user.id;

    Report.newReport(info.report, function(err, result) {
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
        var srcExcelPath = files.uploadExcelfile.path;
        var date = new Date();
        var dt = date.toFormat('YYYY-MM-DD HH24-MI-SS');

        var excelFileName = req.user.name + ' ' + dt + path.extname(srcExcelPath);
        var destExcelPath = path.join(path.dirname(srcExcelPath), excelFileName);
        fs.rename(srcExcelPath, destExcelPath, function(err) {
            if (err) {
                return next(err);
            }
            res.send({
                result: '계획서 업로드 완료!'
            });
        });
    });
});

module.exports = router;
