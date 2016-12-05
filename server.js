'use strict';

const production = process.env.NODE_ENV === 'production';
const LEDS = [];
const bodyParser = require('body-parser');
const express = require('express');
const expressValidator = require('express-validator');
const helmet = require('helmet');
const path = require('path');
const app = express();
const server = require('http').createServer();
const WS = new (require('ws').Server)({server: server});
const events = new (require('express-sse'))([]);

/* LedEvent Helper */
const LedEvent = (led) => (
	led.id + ',' + led.color.r + ',' + led.color.g + ',' + led.color.b + ',' + led.mode
);

/* UpdateLed Helper */
const UpdateLed = (id, r, g, b, mode) => {
	for(let i=0; i<LEDS.length; i++) {
		const led = LEDS[i];
		if(led.id === id) {
			led.color = {r, g, b};
			led.mode = mode;
			events.initial.length = 0;
			for(let i=0; i<LEDS.length; i++) events.initial.push(LedEvent(LEDS[i]));
			led.send(new Buffer([led.color.r, led.color.g, led.color.b, led.mode]), () => {});
			events.send(LedEvent(led), 'update');
			return true;
		}
	}
};

/* Exprees config & routes */
production && app.use(helmet());
app.use(bodyParser.json());
app.use(expressValidator());
app.set('trust proxy', 'loopback');
app.get('/events', events.init);
app.post('/led', (req, res) => {
	req.checkBody('id').notEmpty().isInt();
	req.checkBody('r').notEmpty().isInt();
	req.checkBody('g').notEmpty().isInt();
	req.checkBody('b').notEmpty().isInt();
	req.checkBody('mode').notEmpty().isInt();
	req.getValidationResult().then((result) => {
    if(!result.isEmpty()) return res.send('FAIL', 400);
		res.send(UpdateLed(req.body.id, req.body.r, req.body.g, req.body.b, req.body.mode) ? 'OK' : 'FAIL');
	});
});
app.post('/piwik', (req, res) => {
	req.checkBody('id').notEmpty().isInt();
	req.getValidationResult().then((result) => {
		if(!result.isEmpty()) return res.sendStatus(400).end();

		/* SUPER HACKY ALERT !!! */
		const ledID = 14150704;
		if(req.body.id === 1) {
			// dani.gatunes.com
			UpdateLed(ledID, 0, 0, 255, 1);
		}
		if(req.body.id === 2) {
			// voxels.es
			UpdateLed(ledID, 255, 0, 0, 1);
		}

		res.end();
	});
});

/* LedNet server */
WS.on('connection', (led) => {
	led.id = parseInt(led.upgradeReq.url.substr(1), 10);
	if(!led.id || isNaN(led.id)) return led.close();
	led.color = {r: 0, g: 0, b: 0};
	led.mode = 0;
	for(let i=0; i<LEDS.length; i++) {
		if(LEDS[i].id === led.id) {
			led.color = LEDS[i].color;
			led.mode = LEDS[i].mode;
			LEDS[i].close();
			break;
		}
	}
	led.on('close', () => {
		for(let i=0; i<LEDS.length; i++) {
			if(LEDS[i].id === led.id) {
				LEDS.splice(i, 1);
				break;
			}
		}
		events.initial.length = 0;
		for(let i=0; i<LEDS.length; i++) events.initial.push(LedEvent(LEDS[i]));
		events.send(led.id, 'remove');
	});
	LEDS.push(led);
	events.initial.push(LedEvent(led));
	events.send(LedEvent(led), 'add');
	led.send(new Buffer([led.color.r, led.color.g, led.color.b, led.mode]), () => {});
});

/* App server */
if(production) {
	app.use(express.static(__dirname + '/dist'));
  app.get('*', (req, res) => (
    res.sendFile(path.join(__dirname, 'dist/index.html'))
  ));
} else {
	const webpack = require('webpack');
	const webpackMiddleware = require('webpack-dev-middleware');
	const webpackHotMiddleware = require('webpack-hot-middleware');
	const config = require('./webpack.config.js');
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
    res.write(middleware.fileSystem.readFileSync(path.join(__dirname, 'dist/index.html')));
    res.end();
  });
}

/* HTTP server */
server.on('request', app);
server.listen(process.env.PORT || 8080, process.env.HOSTNAME || '');
