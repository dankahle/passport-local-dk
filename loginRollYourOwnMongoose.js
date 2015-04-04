var express = require('express'),
  bodyParser = require('body-parser'),
  apiErrorHandler = require('api-error-handler'),
  expressDomainMiddleware = require('express-domain-middleware'),
  session = require('express-session'),
  debug = require('debug')('login'),
  passportLocalMongoose = require('passport-local-mongoose'),
  mongoose = require('mongoose')

var userSchema = new mongoose.Schema({
  fullName: String,
  email: String
})
userSchema.plugin(passportLocalMongoose, {saltlen: 8, keylen:16});
var db = mongoose.createConnection('mongodb://localhost:27017/db')
  .on('error', function (err) {
    console.error('mongerr:', err.stack);
  })
var User = db.model('User', userSchema);

var app = express()
app.use(session({secret: 'secret', resave: true, saveUninitialized: true}))
app.use(bodyParser.json())
app.use(expressDomainMiddleware)

app.use('/login', express.static('login', {index: false})) // open up only login dir to anonymous

app.post('/login', function (req, res, next) {
  var username = req.body.username,
    password = req.body.password;

  if (!username || !password)
    return next({status: 400, message: 'Missing credentials'});

  User.findByUsername(username, function (err, user) {
    if (err)
      return next(err);
    if (!user)
      return next({status: 401, message: 'Unknown user ' + username});

    user.authenticate(password, function(err, _User, passwordErr) {
      if(err)
        return next(err);
      if(passwordErr) {
        passwordErr.status = 401;
        return next(passwordErr); //todo:dank does this have a status in it? if not put one in
      }
      req.session.user = user;
      return res.end();
    })
  })
});

app.post('/login/register', function (req, res, next) {
  var user = req.body

  if (!user.username || !user.password)
    return next({status: 400, message: 'username and password are required'});

  User.register(new User(user), user.password, function(err, user) {
    if (err) {
      if(err.name && err.name == 'BadRequestError') err.status = 400;
      return next(err);
    }

    res.send(user);
  })
});

app.get('/login/logout', function(req, res) {
  req.session.user = null;
  res.redirect('/login')
})

function ensureAuthenticated(req, res, next) {
  if (req.session.user)
    return next();

  var query = req.url.slice(0, 6) == '/login' ? '' : '?returnUrl=' + encodeURIComponent(req.url);
  res.redirect('/login/login.html' + query)
}

// nothing gets past this unless authed
app.use(ensureAuthenticated)

app.use(express.static('public'))

app.get('/api/user', function (req, res) {
  res.send(req.session.user);
})

//////////// bottom
app.use(function (req, res) {
  res.status(404).send('Oops, file not found')
})

app.use(apiErrorHandler())

app.listen(3000, function () {
  console.log('server started on 3000')
})
