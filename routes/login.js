var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
    res.render('login', { title: 'Icomwiz' });
});

router.post('/', function(req, res, next) {
    console.log(req.body);
    if(req.body.c_id === 'aa' && req.body.c_pw === 'aa') {
        return res.redirect('/main');
    }
    next(new Error('Check ID or PW'));
});
module.exports = router;
