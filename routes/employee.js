var express = require('express');
var router = express.Router();
var Team = require('../models/team');
var Employee = require('../models/employee');
var Admin = require('../models/admin');
var isAuthenticated = require('./common').isAuthenticated;
var isAuthenticatedForMeasurerManager_Officer = require('./common').isAuthenticatedForMeasurerManager_Officer;

/* GET home page. */
router.get('/partsmain', isAuthenticated, function(req, res, next) {
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
router.get('/admin', isAuthenticated, function(req, res, next) {
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
router.post('/admin', isAuthenticated, function(req, res, next) {
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

router.get('/management', isAuthenticated, function(req, res, next) {
    Admin.managementView(function(err, result) {
        res.render('management-employee', {
            managementList: result
        });
    });
});

router.post('/management', isAuthenticated, function(req, res, next) {
    var info = req.body;
    Admin.managementInsert(info, function(err, result) {
        res.send({
            result : 'ok'
        });
    });
});

router.delete('/management', isAuthenticated, function(req, res, next) {
    var info = req.body;
    Admin.managementDelete(info, function(err, result) {
        res.send({
            result : 'ok'
        });
    });
});

router.put('/management', isAuthenticated, function(req, res, next) {
    if (req.query.action === 'password') {  //비밀번호초기화
        var id = req.body.id;
        Admin.managementPassword(id, function(err, result) {
            res.send({
                result : 'ok'
            });
        });
    } else if(req.query.action === 'info') {    //회원정보수정
        var info = req.body;
        console.log(info);
        info.updatePart = null;
        Admin.managementUpdate(info, function(err, result) {
            res.send({
                result : 'ok'
            });
        });
    }
});

router.put('/',isAuthenticated, function(req, res, next) {
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
