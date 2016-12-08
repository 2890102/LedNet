'use strict';

const Led = require('./Led.js');

const LEDS = [];
const CLIENTS = [];

/* UpdateLed Helper */
let timeout = null;
const UpdateLed = (id, state, from, delay) => {
	for(let i=0; i<LEDS.length; i++) {
		const led = LEDS[i];
		if(led.id === id) {
			/* Update state */
			led.state = Object.assign(led.state, state);

			/* Notify all clients */
			CLIENTS.forEach((client) => {
				if(from && client.id === from) return;
				client.send(JSON.stringify({
					event: 'update',
					led: led.id,
					state: led.state
				}), () => {});
			});

			/* Send the updated state to the LED */
			led.send(new Buffer([
				led.state.color.r,
				led.state.color.g,
				led.state.color.b,
				led.state.mode
			]), () => {});

			timeout !== null && clearTimeout(timeout);
			delay && (timeout = setTimeout(() => {
				UpdateLed(id, {
					color: {r: 0, g: 0, b: 0},
					mode: 0
				});
				timeout = null;
			}, delay));

			break;
		}
	}
};

module.exports = (app) => {
	/* LEDs endpoint */
	app.ws('/led/:id', (led, req) => {
		/* Check & Sanitize request params */
		req.checkParams('id').notEmpty().isInt();
		req.getValidationResult().then((result) => {
			if(!result.isEmpty()) return led.close();
			led.id = req.sanitizeParams('id').toInt();

			/* Check for an on-going session */
			for(let i=0; i<LEDS.length; i++) {
				if(LEDS[i].id === led.id) {
					/* LED already connected. Steal it's state and force disconnect. */
					led.state = LEDS[i].state;
					LEDS[i].removeListener('close', LEDS[i].listeners('close')[LEDS[i].listenerCount('close') - 1]);
					LEDS[i].close();
					LEDS.splice(i, 1);
					return push(false);
				}
			}

			/* Fetch LED state from DB */
			Led.findOne({_id: led.id}).select('-_id').lean().exec((err, state) => {
				if(state) {
					delete state.__v;
					led.state = state;
					return push(true);
				}

				/* Create initial LED state */
				state = new Led({
					_id: led.id,
					color: {r: 0, g: 0, b: 0},
					mode: 0
				});
				state.save(() => {
					state = state.toObject();
					delete state._id;
					delete state.__v;
					led.state = state;
					push(true);
				});
			});
		});

		const push = (notify) => {
			/* Push the LED & notify all clients */
			LEDS.push(led);
			notify && CLIENTS.forEach((client) => {
				client.send(JSON.stringify({
					event: 'add',
					led: led.id,
					state: led.state
				}), () => {});
			});

			/* Handle disconnects */
			led.on('close', () => {
				/* Pop the LED */
				for(let i=0; i<LEDS.length; i++) {
					if(LEDS[i].id === led.id) {
						LEDS.splice(i, 1);
						break;
					}
				}

				/* Notify all clients */
				CLIENTS.forEach((client) => {
					client.send(JSON.stringify({
						event: 'remove',
						led: led.id
					}), () => {});
				});

				/* Persist state */
				Led.findByIdAndUpdate(led.id, {$set: led.state}, () => {});
			});

			/* Request handler */
			led.on('message', (message, flags) => {
				if(!flags.binary) return;
				switch(message[0]) {
					case 1:
						UpdateLed(led.id, {
							color: {r: 0, g: 0, b: 0},
							mode: 0
						});
					break;
				}
			});

			/* Send the initial state to LED */
			led.send(new Buffer([
				led.state.color.r,
				led.state.color.g,
				led.state.color.b,
				led.state.mode
			]), () => {});
		};
	});

	/* Clients endpoint */
	app.ws('/', (client, req) => {
		if(!req.user) return client.close();

		/* Init the client state */
		client.id = client._socket._handle.fd;
		CLIENTS.push(client);

		/* Handle disconnects */
		client.on('close', () => {
			for(let i=0; i<CLIENTS.length; i++) {
				if(CLIENTS[i].id === client.id) {
					CLIENTS.splice(i, 1);
					break;
				}
			}
		});

		/* Request handler */
		client.on('message', (message, flags) => {
			if(flags.binary) return;
			try {
				message = JSON.parse(message);
			} catch(e) {
				return;
			}
			switch(message.event) {
				case 'update':
					UpdateLed(parseInt(message.led, 10) || 0, {
						color: {
							r: parseInt(message.state.color.r, 10) || 0,
							g: parseInt(message.state.color.g, 10) || 0,
							b: parseInt(message.state.color.b, 10) || 0
						},
						mode: parseInt(message.state.mode, 10) || 0
					}, client.id);
				break;
			}
		});

		/* Send LEDs list to the client */
		const leds = [];
		LEDS.forEach((led) => leds.push({id: led.id, state: led.state}));
		client.send(JSON.stringify({event: 'init', leds: leds}), () => {});
	});

	/* Piwik endpoint */
	app.post('/piwik', (req, res) => {
		req.checkBody('id').notEmpty().isInt();
		req.getValidationResult().then((result) => {
			if(!result.isEmpty()) return res.sendStatus(400).end();
			const siteID = req.sanitizeBody('id').toInt();

			/* SUPER HACKY ALERT !!! */
			const ledID = 14150704;
			if(siteID === 1) {
				// dani.gatunes.com
				UpdateLed(ledID, {
					color: {r: 0, g: 0, b: 255},
					mode: 1
				}, null, 10000);
			}
			if(siteID === 2) {
				// voxels.es
				UpdateLed(ledID, {
					color: {r: 255, g: 0, b: 0},
					mode: 1
				}, null, 10000);
			}

			res.end();
		});
	});
};
