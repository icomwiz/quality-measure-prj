var express = require('express');
var router = express.Router();
var Team = require('../models/team');

/* GET home page. */
router.get('/partsmain', function(req, res, next) {
    var employeesInfo = {
        name: req.user.name,
        departmentPosition: req.user.departmentPosition,
        partId: req.user.partId,
        partName: req.user.partName
    };
    res.render('partsmain', {
        result: employeesInfo
    });
});

module.exports = router;
