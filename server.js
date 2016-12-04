'use strict';

const production = process.env.NODE_ENV === 'production';
const LEDS = [];
const bodyParser = require('body-parser');
const express = require('express');
const helmet = require('helmet');
const path = require('path');
const app = express();
const server = require('http').createServer();
const WS = new (require('ws').Server)({server: server});
const events = new (require('express-sse'))([]);

/* LedNet server */
WS.on('connection', function(led) {
	led.id = parseInt(led.upgradeReq.url.substr(1), 10);
	if(!led.id || isNaN(led.id)) return led.close();
	led.color = {r: 0, g: 0, b: 0};
	for(let i=0; i<LEDS.length; i++) {
		if(LEDS[i].id === led.id) {
			LEDS[i].close();
			break;
		}
	}
	led.on('close', function() {
		for(let i=0; i<LEDS.length; i++) {
			if(LEDS[i].id === led.id) {
				LEDS.splice(i, 1);
				break;
			}
		}
		for(let i=0; i<events.initial.length; i++) {
			if(parseInt(events.initial[i].split(',')[0], 10) === led.id) {
				events.initial.splice(i, 1);
				break;
			}
		}
		events.send(led.id, 'remove');
	});
	LEDS.push(led);
	events.initial.push(led.id + ',' + led.color.r + ',' + led.color.g + ',' + led.color.b);
	events.send(led.id + ',' + led.color.r + ',' + led.color.g + ',' + led.color.b, 'add');
});

/* Exprees config & routes */
if(production) {
	app.use(helmet());
	app.use(bodyParser.json());
}
app.get("/led/:id/:r/:g/:b", function(req, res) {
	const id = parseInt(req.params.id, 10);
	const r = parseInt(req.params.r, 10);
	const g = parseInt(req.params.g, 10);
	const b = parseInt(req.params.b, 10);
	if(isNaN(id) || isNaN(r) || isNaN(g) || isNaN(b)) return res.send("FAIL");
	for(let i=0; i<LEDS.length; i++) {
		const led = LEDS[i];
		if(led.id === id) {
			led.send(new Buffer([led.color.r = r, led.color.g = g, led.color.b = b]), function() {});
			for(let i=0; i<events.initial.length; i++) {
				if(parseInt(events.initial[i].split(',')[0], 10) === led.id) {
					events.initial[i] = led.id + ',' + led.color.r + ',' + led.color.g + ',' + led.color.b;
					break;
				}
			}
			events.send(led.id + ',' + led.color.r + ',' + led.color.g + ',' + led.color.b, 'update');
			return res.send("OK");
		}
	}
	return res.send("FAIL");
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
