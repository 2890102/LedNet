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
const LedEvent = function(led) {
	return led.id + ',' + led.color.r + ',' + led.color.g + ',' + led.color.b;
};

/* LedNet server */
WS.on('connection', function(led) {
	led.id = parseInt(led.upgradeReq.url.substr(1), 10);
	if(!led.id || isNaN(led.id)) return led.close();
	led.color = {r: 0, g: 0, b: 0};
	for(let i=0; i<LEDS.length; i++) {
		if(LEDS[i].id === led.id) {
			led.color = LEDS[i].color;
			LEDS[i].close();
			break;
		}
	}
	led.on('close', function() {
		events.initial.length = 0;
		let l = LEDS.length;
		for(let i=0; i<l; i++) {
			if(LEDS[i].id === led.id) {
				LEDS.splice(i, 1);
				i--;
				l--;
			} else {
				events.initial.push(LedEvent(LEDS[i]));
			}
		}
		events.send(led.id, 'remove');
	});
	LEDS.push(led);
	events.initial.push(LedEvent(led));
	events.send(LedEvent(led), 'add');
	led.send(new Buffer([led.color.r, led.color.g, led.color.b]), function() {});
});

/* Exprees config & routes */
production && app.use(helmet());
app.use(bodyParser.json());
app.use(expressValidator());
app.set('trust proxy', 'loopback');
app.post("/led", function(req, res) {
	req.checkBody('id').notEmpty().isInt();
	req.checkBody('r').notEmpty().isInt();
	req.checkBody('g').notEmpty().isInt();
	req.checkBody('b').notEmpty().isInt();
	req.getValidationResult().then(function(result) {
    if(!result.isEmpty()) return res.send("FAIL", 400);
		for(let i=0; i<LEDS.length; i++) {
			const led = LEDS[i];
			if(led.id === req.body.id) {
				led.send(new Buffer([led.color.r = req.body.r, led.color.g = req.body.g, led.color.b = req.body.b]), function() {});
				for(let i=0; i<events.initial.length; i++) {
					if(parseInt(events.initial[i].split(',')[0], 10) === led.id) {
						events.initial[i] = LedEvent(led);
						break;
					}
				}
				events.send(LedEvent(led), 'update');
				return res.send("OK");
			}
			res.send("FAIL");
		}
	});
});

/* Event source */
app.get('/events', events.init);

/* App server */
if(production) {
	app.use(express.static(__dirname + '/dist'));
  app.get('*', function response(req, res) {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
  });
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
  app.get('*', function response(req, res) {
    res.write(middleware.fileSystem.readFileSync(path.join(__dirname, 'dist/index.html')));
    res.end();
  });
}

/* HTTP server */
server.on('request', app);
server.listen(production ? 7480 : 8080);
