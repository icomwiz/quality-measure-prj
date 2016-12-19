var express = require('express');
var router = express.Router();
var Team = require('../models/team');

router.get('/', function(req, res, next) {
    Team.getTeamListByTeamName(req.query.teamName, function(err, results) {
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
