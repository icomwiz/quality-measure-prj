var express = require('express');
var router = express.Router();
var Team = require('../models/team');

router.get('/', function(req, res, next) {
    var reqData = {};
    reqData.teamName = req.query.teamName;
    reqData.date = req.query.date;
    Team.getTeamListByTeamName(reqData, function(err, results) {
        if (err) {
            return next(err);
        }
        res.send({
            result: results
        });
    });
});

router.get('/simple', function(req, res, next) {
    var date = req.query.date;
    Team.getTeamList(date, function(err, results) {
        if (err) {
            return next(err);
        }
        res.send({
            result: results
        });
    });
});

router.get('/:tid/analystEvaluationError/:ename', function(req, res, next) {
    var action = parseInt(req.query.action);
    var reqData = {};
    reqData.teamId = req.params.tid;
    reqData.errName = decodeURI(req.params.ename);
    if (action === 0) { //일별 내근자 에러
        reqData.date = req.query.date;
        Team.getAnalystsDetailErrorStatePerDay(reqData, function(err, result) {
            if (err) {
               return next(err);
            }
            res.send({
                result: result
            });
        });
    } else if (action === 1) { //주별 내근자 에러

    } else if (action === 2) { //월별 내근자 에러

    } else { //분기별 내근자 에러

    }
});

router.get('/analystEvaluationError', function(req, res, next) {
    var reqData = {};
    reqData.teamId = req.query.teamId;
    reqData.date = req.query.date;
    Team.getAnalystEvaluationError(reqData, function(err, results) {
        if (err) {
            return next(err);
        }
        if (results === 0) {
            res.send({
                result: 0
            });
        } else {
            res.send({
                result: results
            });
        }
    });
});

router.post('/analystEvaluationError', function(req, res, next) {
    var reqData = {};
    reqData.employeeId = req.user.id;
    reqData.teamId = req.body.teamId;
    reqData.date = req.body.date;
    reqData.errors = req.body.errors;
    Team.setAnalystEvaluationError(reqData, function(err, results) {
        if (err) {
            return next(err);
        }
        res.send({
            result: 1
        });
    });
});

module.exports = router;
