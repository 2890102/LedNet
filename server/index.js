'use strict';

const production = process.env.NODE_ENV === 'production';
const bodyParser = require('body-parser');
const express = require('express');
const expressValidator = require('express-validator');
const helmet = require('helmet');
const path = require('path');
const LedNet = require('./LedNet.js');

/* Express */
const app = express();
production && app.use(helmet());
app.use(bodyParser.json());
app.use(expressValidator());
require('express-ws')(app, undefined, {wsOptions: {clientTracking: false}});

/* Backend */
LedNet(app);

/* App server */
if(production) {
	app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => (
    res.sendFile(path.join(__dirname, '../dist/index.html'))
  ));
} else {
	const webpack = require('webpack');
	const webpackMiddleware = require('webpack-dev-middleware');
	const webpackHotMiddleware = require('webpack-hot-middleware');
	const config = require('../webpack.config.js');
	const compiler = webpack(config);
  const middleware = webpackMiddleware(compiler, {
    publicPath: config.output.publicPath,
    contentBase: 'src',
    stats: {
      colors: true,
      hash: false,
      timings: true,
      chunks: false,
      chunkModules: false,
      modules: false
    }
  });
  app.use(middleware);
  app.use(webpackHotMiddleware(compiler));
  app.get('*', (req, res) => {
    res.write(middleware.fileSystem.readFileSync(path.join(__dirname, '../dist/index.html')));
    res.end();
  });
}

app.listen(process.env.PORT || 8080, process.env.HOSTNAME || '');
