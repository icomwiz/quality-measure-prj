var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var passport = require('passport');
var redis = require('redis');
var redisClient = redis.createClient();
var redisStore = require('connect-redis')(session);

var routes = require('./routes/index');
var users = require('./routes/users');
var auth = require('./routes/auth');
var team = require('./routes/team');
var report = require('./routes/report');
var employee = require('./routes/employee');
var detail = require('./routes/detail');


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser(process.env.SESSION_SECRET));
app.use(session({
  secret : process.env.SESSION_SECRET,
  store : new redisStore({
    host : "127.0.0.1",
    port : 6379,
    client : redisClient
  }),
  resave : true,
  saveUninitialized : false,
  cookie : {
    path : '/',
    httpOnly : true,
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 30
  }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use('/', routes);
app.use('/users', users);
app.use('/auth', auth);
app.use('/reports', report);
app.use('/teams', team);
app.use('/employees', employee);
app.use('/details', detail);
app.use('/excelforms', express.static(path.join(__dirname, 'planners/form/excelform.xlsx')));
app.use('/imgs', express.static(path.join(__dirname, 'public/img')));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    console.log(err);
    console.log(err.message);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
