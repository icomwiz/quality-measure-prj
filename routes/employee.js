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

//관리자 페이지(품질측정팀_일일업무보고)작성 API
router.get('/admin', function(req, res, next) {
    //작성페이지 불러오기
    var reportDate = req.query.date;
    Admin.measureTaskReport(reportDate, function(err, result) {
        if (err) {
            return next(err);
        }
        res.render('parts-admin-page', {
            result: result
        });
    });
});

//관리자 페이지(품질측정팀_일일업무보고)저장 API
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
