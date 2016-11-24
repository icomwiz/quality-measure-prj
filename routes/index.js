var express = require('express');
var router = express.Router();

/* GET home page. */
//세션에 따라서 페이지 다르게 띄우기
router.get('/', function(req, res, next) {
  if (req.user) { //세션이 있을 때
      if (req.user.teamPosition === 1 || req.user.teamPosition === 2) { //분석팀
          //리다이렉트
          res.redirect('http://localhost:3000/employees/partsmain');
      } else if(req.user.teamPosition === 3 || req.user.teamPosition === 4) { //측정팀
          res.redirect('http://localhost:3000/reports?action=0');
      }
  } else { //세션이 없을 때
      res.redirect('http://localhost:3000/auth');
  }
});

module.exports = router;
