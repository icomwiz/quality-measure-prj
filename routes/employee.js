var express = require('express');
var router = express.Router();
var Team = require('../models/team');
var Employee = require('../models/employee');
var isAuthenticatedForAnalyst = require('./common').isAuthenticatedForAnalyst;

/* GET home page. */
router.get('/partsmain', isAuthenticatedForAnalyst, function(req, res, next) {
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

//관리자 페이지 API
router.get('/admin', function(req, res, next) {
   res.render('parts-admin-page', {
      result: ''
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
