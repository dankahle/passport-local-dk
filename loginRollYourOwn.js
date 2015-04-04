var express = require('express'),
  bodyParser = require('body-parser'),
  apiErrorHandler = require('api-error-handler'),
  expressDomainMiddleware = require('express-domain-middleware'),
  session = require('express-session'),
  cookieParser = require('cookie-parser'),
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

var app = express()
app.use(cookieParser())
app.use(session({secret: 'secret', resave: true, saveUninitialized: true}))
app.use(bodyParser.json())
app.use(expressDomainMiddleware)

app.use('/login', express.static('login', {index: false})) // open up only login dir to anonymous

app.post('/login', function (req, res, next) {
  var username = req.body.username,
    password = req.body.password;

  if (!username || !password)
    return next({status: 400, message: 'Missing credentials'});

  findByUsername(username, function (err, user) {
    if (err)
      return next(err);
    if (!user)
      return next({status: 401, message: 'Unknown user ' + username});

    if (user.password != password)
      return next({status: 401, message: 'Invalid password'});

    req.session.user = user;
    return res.end();
  })
});

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
    res.send(user);
  });

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
