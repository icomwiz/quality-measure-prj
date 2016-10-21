var express = require('express');
var router = express.Router();
var Team = require('../models/team');

/* GET home page. */
router.get('/', function(req, res, next) {
    var teamName = req.body.teamName;
    Team.getOwnsTeamListByTeamName(teamName, function(err, results) {
        if (err) {
            return next(err);
        }
        res.send({
            result: results
        });
    })
});

router.get('/simple', function(req, res, next) {
    Team.getOwnsTeamListByPartId(req.user.partId, function(err, results) {
        if (err) {
            return next(err);
        }
        res.render('partsmain', {
            name: req.user.name,
            departmentPosition: req.user.departmentPosition,
            partName: req.user.partName,
            teamList: results
        });
    })
});

module.exports = router;
