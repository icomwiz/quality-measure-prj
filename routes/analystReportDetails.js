var express = require('express');
var router = express.Router();
var AnalystReportDetails = require('../models/analystReportDetails');

router.get('/', function(req, res, next) { //특정 날짜의 모든 리포트 디테일 불러오기
    var reqData = {};
    reqData.employeeId = req.user.id;
    reqData.date = req.query.date;
    AnalystReportDetails.getMyReportDetails(reqData, function(err, results) {
        if (err) {
            return callback(err);
        }
        res.send({
            result: results
        });
    });
});

router.post('/', function(req, res, next) { //특정 날짜의 리포트 디테일 추가하기
    
});

router.put('/:rid', function(req, res, next) { //특정 리포트 디테일 수정하기

});

router.delete('/:rid', function(req, res, next) { //특정 리포트 디테일 삭제하기
    
});

module.exports = router;