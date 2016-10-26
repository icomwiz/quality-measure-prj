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
    Team.getTeamList(function(err, results) {
        if (err) {
            return next(err);
        }
        res.send({
            result: results
        });
    });
});

module.exports = router;
