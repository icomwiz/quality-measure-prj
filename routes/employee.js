var express = require('express');
var router = express.Router();
var Team = require('../models/team');
var Employee = require('../models/employee');
var Admin = require('../models/admin');


/* GET home page. */
router.get('/partsmain', function(req, res, next) {
    var employeesInfo = {
        name: req.user.name,
        departmentPosition: req.user.departmentPosition,
        partId: req.user.partId,
        partName: req.user.partName,
        teamPosition: req.user.teamPosition
    };
    res.render('parts-main', {
        result: employeesInfo
    });
});

//(품질측정팀_일일업무보고)작성 API
router.get('/admin', function(req, res, next) {
    //작성페이지 불러오기
    var reportDate = req.query.date;
    if (req.query.action==0) {
        Admin.daily_briefingView(reportDate, function(err, data_daily_briefing, daily_briefing_id, briefing) {
            if (err) {
                return next(err);
            }
            if(daily_briefing_id[0]) {
                // console.log("수정모드");
                res.render('parts-admin-page', {
                    result: data_daily_briefing,
                    daily_briefing_id : daily_briefing_id[0].id,
                    briefing : briefing
                });
            } else {
                // console.log("삽입모드");
                res.render('parts-admin-page', {
                    result: data_daily_briefing,
                    daily_briefing_id : null,
                    briefing : briefing
                });
            }
        });
    } else {
        Admin.daily_briefingView(reportDate, function(err, data_daily_briefing, daily_briefing_id, briefing) {
            if (err) {
                return next(err);
            }
            if(daily_briefing_id[0]) {
                res.render('parts-admin-page-view', {
                    result: data_daily_briefing,
                    daily_briefing_id : daily_briefing_id[0].id,
                    briefing : briefing
                });
            } else {
                res.render('parts-admin-page-view', {
                    result: data_daily_briefing,
                    daily_briefing_id : null,
                    briefing : briefing
                });
            }
        });
    }
});

//(품질측정팀_일일업무보고)삽입 API
router.post('/admin', function(req, res, next) {
    var info = {};
    info = req.body;
    info.Date = req.query.date;

    Admin.daily_briefing(info, function(err, result) {
        if (err) {
            return next(err);
        }
        res.send({
            result : 'ok'
        });
    });
});

router.get('/management', function(req, res, next) {
    Admin.managementView(function(err, result) {
        res.render('management-employee', {
            managementList: result
        });
    });
});

router.post('/management', function(req, res, next) {
    var info = req.body;
    Admin.managementInsert(info, function(err, result) {
        res.send({
            result : 'ok'
        });
    });
});

router.put('/', function(req, res, next) {
    var employee = {};
    employee.id = req.user.id;
    employee.password = req.body.password;
    Employee.passwordChange(employee, function(err, result) {
        delete employee.password;
        delete req.body.password;
        if (err) {
            return next(err);
        }
        res.send({
           result : 'ok'
        });
    });
});

module.exports = router;
