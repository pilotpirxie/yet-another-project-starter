/* eslint no-console: 0 */
const express = require('express');

const app = express();
const path = require('path');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const rateLimit = require('express-rate-limit');

const config = require('./config/config');
const sql = require('./config/sequelize.config');
const cacheInvalidateMiddleware = require('./util/cacheInvalidateMiddleware');

// handlebars settings
const hbs = exphbs.create({
  helpers: {},
  extname: '.hbs',
  partialsDir: ['views/partials/', 'views/accounts/partials'],
});

console.info('App is starting...');
// settings
app.set('trust proxy', 1);
app.engine('hbs', hbs.engine);
app.set('port', process.env.PORT || config.DEFAULT_PORT);
app.disable('x-powered-by');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use(require('./lib/antiQueryPollution'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(rateLimit(require('./config/rateLimit.config')));

app.use(cookieSession({
  name: 'session',
  keys: [config.SESSION_SECRET],
  maxAge: config.SESSION_TIMEOUT,
  secure: false,
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
sql.testConnection(undefined, () => sql.synchronizeSchema());

app.use((req, res, next) => {
  req.setTimeout(config.SERVER_TIMEOUT);
  next();
});

app.use(cacheInvalidateMiddleware);

// routing
app.use('/', require('./routes/home.js'));
app.use('/accounts', require('./routes/accounts.js'));

// status code 404
app.use('*', require('./lib/status404'));

// catch server errors
app.use(require('./lib/status500'));

app.listen(app.get('port'), () => {
  try {
    console.info(`App is listening on http://localhost:${app.get('port')}`);
  } catch (err) {
    console.warn('App is listening but ip address information are unavailable');
    console.error(err);
  }
});
