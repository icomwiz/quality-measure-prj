var express = require('express');
var router = express.Router();
var AnalystReport = require('../models/analystReport');

router.get('/', function(req, res, next) { //모든 내근자의 일일 업무 보고서 불러오기
    
});

router.get('/me', function(req, res, next) { //자신이 작성한 일일 업무 보고서 내역 모두 불러오기
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

router.post('/', function(req, res, next) { //내근자의 일일 업무 작성
    
});

router.delete('/:rid', function(req, res, next) { //특정 업무 보고서 삭제하기
    
});

module.exports = router;