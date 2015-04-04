/*
 a bare bones implementation, problem is: it's useless as the inability to get the errors
 to the login page is unforgivable. They have no idea what's going on, just that they failed. Not
 a crime I suppose, i.e. you maybe don't want them knowing what's going on? That they finally
 got a good username and now just just need the right password?
 */


var express = require('express'),
  bodyParser = require('body-parser'),
  apiErrorHandler = require('api-error-handler'),
  expressDomainMiddleware = require('express-domain-middleware'),
  session = require('express-session'),
  cookieParser = require('cookie-parser'),
  passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy,
  debug = require('debug')('login')

var users = [
  { id: 1, username: 'dank', password: '50', email: 'bob@example.com', fullName: 'Dan K' },
  { id: 2, username: 'carl', password: '60', email: 'joe@example.com', fullName: 'Carl Y' }
];

function findById(id, fn) {
  var idx = id - 1;
  if (users[idx]) {
    fn(null, users[idx]);
  } else {
    fn(new Error('User ' + id + ' does not exist'));
  }
}

function findByUsername(username, fn) {
  for (var i = 0, len = users.length; i < len; i++) {
    var user = users[i];
    if (user.username === username) {
      return fn(null, user);
    }
  }
  return fn(null, null);
}

passport.use(new LocalStrategy(
  function (username, password, done) {
    findByUsername(username, function (err, user) {
      if (err)
        return done(err);

      if (!user)
        return done(null, false, {message: 'Unknown user ' + username});

      if (user.password != password)
        return done(null, false, {message: 'Invalid password'});

      return done(null, user);
    })
  }
));

var app = express()
app.use(cookieParser())
app.use(session({secret: 'secret', resave: true, saveUninitialized: true}))
app.use(bodyParser.urlencoded({extended: false}))
app.use(expressDomainMiddleware)
app.use(passport.initialize());
app.use(passport.session());

app.use('/login', express.static('login', {index: false})) // open up only login dir to anonymous
app.post('/login', function (req, res, next) {
  next()
})
app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login/loginRedirect.html'
}));

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  findById(id, function (err, user) {
    done(err, user);
  });
});

// in a function for resuse
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login/loginRedirect.html')
}

// nothing gets past this unless authed
app.use(ensureAuthenticated)

app.use(express.static('public'))

app.get('/api/user', function(req, res) {
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
