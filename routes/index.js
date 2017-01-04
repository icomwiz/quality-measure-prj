var express = require('express');
var router = express.Router();

/* GET home page. */
//세션에 따라서 페이지 다르게 띄우기
router.get('/', function(req, res, next) {
    function getYesterday(){
        var today = new Date();
        var yesterday = new Date(today.valueOf() - (24*60*60*1000));
        var year = yesterday.getFullYear();
        var month = yesterday.getMonth() + 1;
        var day = yesterday.getDate();

        if(month < 10) {
            month = "0"+month;
        }
        if(day < 10) {
            day = "0"+day
        }
        return year + '-' +month+ '-' +day;
    }

    if (req.user) { //세션이 있을 때
        if (req.user.teamPosition === 0 || req.user.teamPosition === 1 || req.user.teamPosition === 2 || req.user.teamPosition === 5 || req.user.teamPosition === 6) { //분석팀
             res.redirect('http://localhost:3000/employees/partsmain?date=' + getYesterday());
        } else if(req.user.teamPosition === 3 || req.user.teamPosition === 4) { //측정팀
           res.redirect('http://localhost:3000/reports?action=0');
        }
    } else { //세션이 없을 때
        res.redirect('http://localhost:3000/auth');
    }
});

module.exports = router;
