/**
 * Created by pil on 2016-11-02.
 */
var Detail = require('../models/detail');
var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
    var report_id = req.query.Report;
    console.log(report_id);

    Detail.detailsList(report_id, function(err, result) {
        var team_name = "";
        if (err) {
            return next(err);
        }
        team_name = result[0].team_name+"/"+date();
        res.render('detail', {
            title: team_name,
            id : req.query.Report,
            detail : result
        });
    });
    function date(){
        var date = new Date();
        var year  = date.getFullYear();
        var month = date.getMonth() + 1; // 0부터 시작하므로 1더함 더함
        var day   = date.getDate();
        if(month < 10) {
            month = "0"+month;
        }
        if(day < 10) {
            day = "0"+day
        }
        return year +'년'+month+'월'+day+'일';
    }
});

router.post('/', function(req, res, next) {
    console.log(req.body);
    res.send({
        result : "ok"
    });
});
module.exports = router;