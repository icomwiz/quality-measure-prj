var express = require('express');
var router = express.Router();
var AnalystReport = require('../models/analystReport');
var AnalystReportDetails = require('../models/analystReportDetails');
var async = require('async');
var isAuthenticated = require('./common').isAuthenticated;

router.get('/', function(req, res, next) { //날짜를 통해 리포트가 있는지 없는지 검사하기
    var reqData = {};
    reqData.date = req.query.date;
    reqData.employeeId = req.user.id;
    AnalystReport.getExistingReport(reqData, function(err, result) {
        if (err) {
            return next(err);
        }
        res.send({
            result: result //result값이 0이면 존재하지 않는것. 1이면 존재하는것.
        });
    });
});

router.get('/me', isAuthenticated, function(req, res, next) { //자신이 작성한 일일 업무 보고서 내역 모두 불러오기
    var eid = req.user.id;
    AnalystReport.getMyReport(eid, function(err, result) {
        if (err) {
            return next(err);
        }
        res.send({
            result: result
        });
    });
});

router.get('/commutestates', isAuthenticated, function(req, res, next) {
    AnalystReport.getAnalystCommuteState(function(err, result) {
        if (err) {
            return next(err);
        }
        res.render('parts-commute-state', {
            result: result
        });
    });
});

router.get('/:rid', isAuthenticated, function(req, res, next) {
    var reportId = req.params.rid;
    AnalystReport.getParticularReport(reportId, function(err, result) {
        if (err) {
            return next(err);
        }
        res.send({
            result: result
        });
    });
});

router.post('/', isAuthenticated, function(req, res, next) { //내근자의 일일 업무 작성
    var action = parseInt(req.query.action);
    var reqData = {};
    reqData.employeeId = req.user.id;
    reqData.date = req.body.date;
    reqData.majorJob = req.body.majorJob;
    reqData.workStartTime = req.body.workStartTime;
    reqData.workEndTime = req.body.workEndTime;
    reqData.etcTime = req.body.etcTime;
    reqData.overTime = req.body.overTime;
    if (action == 1) { //내근자의 일일 리포트만 insert
        AnalystReport.postMyReport(reqData, function(err, result) {
            if (err) {
                return next(err);
            }
            res.send({
                result: result
            });
        });
    } else if (action == 2) { //내근자의 일일 리포트 1개와 리포트 디테일 1개 insert
        AnalystReport.postMyReport(reqData, function(err, result, reportId) {
            if (err) {
                return next(err);
            }
            if (result === 0 ) { //입력한 날짜의 보고서가 이미 있을 때
                return res.send({
                    result: result
                });
            } else {
                var reqData2 = {};
                reqData2.reportId = reportId;
                reqData2.startTime = req.body.startTime;
                reqData2.endTime = req.body.endTime;
                reqData2.workDetails = req.body.workDetails;
                reqData2.note = req.body.note;
                reqData2.type = req.body.type;
                AnalystReportDetails.postMyReportDetails(reqData2, function(err, result) {
                    if (err) {
                        return next(err);
                    }
                    res.send({
                       result: result
                    });
                });
            }
        });
    } else if (action == 3) { //내근자의 일일 리포트 1개와 리포트 디테일 여러개 insert
        AnalystReport.postMyReport(reqData, function(err, result, reportId) {
            if (err) {
                return next(err);
            }
            if (result === 0) { //입력한 날짜의 보고서가 이미 있을 때
                return next(err);
            } else {
                var workDetailsInfo = req.body.workDetailsInfo;
                for(var i = 0; i < workDetailsInfo.length; i++) {
                    workDetailsInfo[i].reportId = reportId;
                }
                async.each(workDetailsInfo, function(item, callback) {
                    AnalystReportDetails.postMyReportDetails(item, function(err, results) {
                        if (err) {
                            callback(err);
                        }
                        callback();
                    });
                }, function(err) {
                    if (err) {
                        return next(err);
                    }
                    res.send({ result: 1 });
                });
            }
        });
    } else if (action == 4) { //휴가
        var vacationData = {};
        vacationData.employeeId = req.user.id;
        vacationData.vacationStart = req.body.vacationStart;
        vacationData.vacationEnd = req.body.vacationEnd;
        vacationData.majorWork = req.body.majorWork;
        AnalystReport.postVacation(vacationData, function(err, result) {
            if (err) {
                return res.send({
                    result: 0,
                    msg: err.message
                });
            }
            res.send({
                result: 1
            });
        });
    }
});

router.delete('/:rid', isAuthenticated, function(req, res, next) { //특정 업무 보고서 삭제하기
    var reportId = req.params.rid;
    AnalystReport.deleteMyReport(reportId, function(err) {
        if (err) {
            return next(err);
        }
        res.send({
            result: '삭제 완료'
        });
    });

});

module.exports = router;