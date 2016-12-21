var Employee = require('../models/employee');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var express = require('express');
var router = express.Router();

passport.use(new LocalStrategy( { usernameField: 'email', passwordField: 'password' }, function(email, password, done) {
    Employee.findEmployeeByEmail(email, function(err, employee) {
        if (err) {
            return done(err);
        }
        if (!employee) {
            return done(null, false);
        }
        Employee.verifyPassword(password, employee.password, function(err, result) {
            if (err) {
                return done(err);
            }
            if (!result) {
                return done(null, false);
            }
            delete employee.password;
            done(null, employee);
        })
    })
}));

passport.serializeUser(function(employee, done) {
    done(null, employee.id);
});

passport.deserializeUser(function(id, done) {
    Employee.findEmployeeById(id, function(err, employee) {
        if (err) {
            return done(err);
        }
        done(null, employee);
    });
});

router.get('/', function(req, res, next) {
    res.render('login', { title: 'Icomwiz' });
});

router.post('/', function(req, res, next) {
    passport.authenticate('local', function(err, employee) {
        if (err) {
            return next(err);
        }
        if (!employee) {
            return res.send({
                result: 'fail'
            });
        }
        req.login(employee, function(err) {
            if (err) {
                return next(err);
            }
            next();
        });
    })(req, res, next);
}, function(req, res, next) {
    if (req.user.teamPosition === 0 || req.user.teamPosition === 1 || req.user.teamPosition === 2 || req.user.teamPosition === 5 || req.user.teamPosition === 6 ) { //분석자, 관리자
        res.send({
            result: 1
        });
    } else if (req.user.teamPosition === 3 || req.user.teamPosition === 4) { //측정자
        res.send({
            result: 2
        });
    }
});

router.get('/logout', function(req, res, next) {
   req.session.destroy(function(err) {
       if (err) {
           return next(err);
       }
       res.render('login', { title: 'Icomwiz'});
   });
});

module.exports = router;
