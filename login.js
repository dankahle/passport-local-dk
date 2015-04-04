var express = require('express'),
  bodyParser = require('body-parser'),
  apiErrorHandler = require('api-error-handler'),
  expressDomainMiddleware = require('express-domain-middleware'),
  session = require('express-session'),
  passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy,
  debug = require('debug')('login')

var users = [
  {id: 1, username: 'dank', password: '50', email: 'bob@example.com', fullName: 'Dan K'},
  {id: 2, username: 'carl', password: '60', email: 'joe@example.com', fullName: 'Carl Y'}
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
app.use(session({secret: 'secret', resave: true, saveUninitialized: true}))
app.use(bodyParser.json())
app.use(expressDomainMiddleware)
app.use(passport.initialize());
app.use(passport.session());

app.use(function (req, res, next) {
  next()
})

app.use('/login', express.static('login', {index: false})) // open up only login dir to anonymous

// verbose error version
app.post('/login', function (req, res, next) {
  // we have to hook into authentication to get the login errors as the flashes are of
  // no use to us in xhr land
  passport.authenticate('local', function (err, user, info) {
    if (err)
      return next(err)

    if (!user)
      return next({status: 401, message: info.message})

    req.logIn(user, function (err) {
      if (err)
        return next(err);

      return res.end();//res.send(req.user)
    });
  })(req, res, next);
});

/*
// simple error version (400/bad request, 401/unauthorized)
app.post('/login', passport.authenticate('local'), function(req, res) {
  res.send(req.user);
});
*/

app.post('/login/register', function (req, res, next) {
  var user = req.body

  if (!user.username || !user.password)
    return next({status: 400, message: 'username and password are required'});

  findByUsername(user.username, function (err, fuser) {
    if (err) next(err)
    if (fuser)
      return next({status: 401, message: 'username is already taken'});

    user.id = users.length + 1;
    users.push(user);

    // login for them after they register, so they can be redirected to main page
    req.login(user, function(err) {
      if(err) return next(err)
      //res.cookie('stuff', 'lala') // this will work on xhr
      //res.redirect(req.query.returnUrl || '/') // this won't work, it's xhr
      res.send(user);
    })
  })
})

app.get('/login/logout', function(req, res) {
  req.logout();
  res.redirect('/login')
})

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  findById(id, function (err, user) {
    done(err, user);
  });
});

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
