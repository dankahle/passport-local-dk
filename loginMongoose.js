var express = require('express'),
  bodyParser = require('body-parser'),
  apiErrorHandler = require('api-error-handler'),
  expressDomainMiddleware = require('express-domain-middleware'),
  session = require('express-session'),
  passport = require('passport'),
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

app.use(passport.initialize());
app.use(passport.session());
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use('/login', express.static('login', {index: false})) // open up only login dir to anonymous

// use for generic 400/401 messages
/*
app.post('/login', passport.authenticate('local'), function(req, res) {
  res.send(req.user);
});
*/

// use for verbose messages
app.post('/login', function (req, res, next) {
  // we have to hook into authentication to get the login errors as the flashes are of
  // no use to us in xhr land
  passport.authenticate('local', function (err, user, info) {
    if (err)
      return next(err)

    if (!user)
      return next({status: 401, message: info.message})

    req.login(user, function (err) {
      if (err)
        return next(err);

      return res.end();
    });
  })(req, res, next);
});

app.post('/login/register', function (req, res, next) {
  var user = req.body

  User.register(new User(user), user.password, function(err, user) {
    if (err) {
      if(err.name && err.name == 'BadRequestError') err.status = 400;
      return next(err);
    }
    // login for them after they register, so they can be redirected to main page
    req.login(user, function(err) {
      if(err) return next(err)
      res.end();

    })
  })
})

app.get('/login/logout', function(req, res) {
  req.logout();
  res.redirect('/login')
})

// website AND api version, check for req.xhr for api otherwise redirect for web
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated())
    return next();

  if(req.xhr)
    next({staus: 401, message: 'Unauthorized'})
  else {
    var query = req.url.slice(0, 6) == '/login' ? '' : '?returnUrl=' + encodeURIComponent(req.url);
    res.redirect('/login/login.html' + query)
  }
}

// nothing gets past this unless authed
app.use(ensureAuthenticated)

app.use(express.static('public'))

app.get('/api/user', function (req, res) {
  res.send(req.user);
})

//////////// bottom
app.use(function (req, res) {
  res.status(404).send('Oops, file not found')
})

app.use(apiErrorHandler())

app.listen(3000, function () {
  console.log('server started on 3000')
})
