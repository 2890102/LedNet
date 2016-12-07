import React from 'react';
import update from 'immutability-helper';
import {hex2rgb, rgb2hex} from 'hexrgb';

class LedNet extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			leds: []
		};
	}
	componentDidMount() {
		this.connect();
	}
	componentWillUnmount() {
		this.socket.onclose = null;
		this.socket.close();
	}
	connect() {
		this.socket = new WebSocket('ws' + (location.protocol === 'https:' ? 's' : '') + '://' + location.host + BASENAME + '/');
		this.socket.onmessage = (e) => {
			let message;
			try {
				message = JSON.parse(e.data);
			} catch(e) {
				return;
			}
			let leds;
			switch(message.event) {
				case 'init':
					leds = message.leds;
				break;
				case 'add':
					leds = update(this.state.leds, {$push: [{
						id: message.led,
						state: message.state
					}]});
				break;
				case 'remove':
					leds = this.state.leds.filter((led) => (led.id !== message.led));
				break;
				case 'update':
					const index = this.state.leds.findIndex((led) => (led.id === message.led));
					if(index === -1) return;
					leds = update(this.state.leds, {[index]: {state: {$set: message.state}}});
				break;
				default:
					return;
			}
			this.setState({leds});
		};
		this.socket.onclose = () => {
			setTimeout(this.connect.bind(this), 0);
		};
	}
	updateColor(i, c, value) {
		let color;
		if(c === 'picker') {
			const rgb = hex2rgb(value, true);
			if(rgb === null) color = {r: 0, g: 0, b: 0};
			else color = {
				r: Math.min(Math.max(rgb[0], 0), 255),
				g: Math.min(Math.max(rgb[1], 0), 255),
				b: Math.min(Math.max(rgb[2], 0), 255)
			};
		} else {
			color = update(this.state.leds[i].state.color, {[c]: {$set: parseInt(value, 10) || 0}});
		}
		this.update(i, update(this.state.leds[i].state, {color: {$set: color}}));
	}
	updateMode(i, value) {
		this.update(i, update(this.state.leds[i].state, {mode: {$set: parseInt(value, 10) || 0}}));
	}
	update(i, state) {
		this.setState({leds: update(this.state.leds, {[i]: {state: {$set: state}}})});
		this.socket.send(JSON.stringify({
			event: 'update',
			led: this.state.leds[i].id,
			state: state
		}));
	}
	render() {
		return (
			<div>
				{this.state.leds.map(({id, state: {color: {r, g, b}, mode}}, i) => (
					<led key={i}>
						<h5>ChipId: {id}</h5>
						<div>
							<input type="number" min="0" max="255" value={r} onChange={(e) => this.updateColor(i, 'r', e.target.value)} />
							<input type="number" min="0" max="255" value={g} onChange={(e) => this.updateColor(i, 'g', e.target.value)} />
							<input type="number" min="0" max="255" value={b} onChange={(e) => this.updateColor(i, 'b', e.target.value)} />
						</div>
						<input type="color" value={rgb2hex('rgb(' + r + ',' + g + ',' + b + ')')} onChange={(e) => this.updateColor(i, 'picker', e.target.value)} />
						<div>
							<label>
								<input type="radio" checked={mode === 0} value="0" onChange={(e) => this.updateMode(i, e.target.value)} />
								ON
							</label>
							<label>
								<input type="radio" checked={mode === 1} value="1" onChange={(e) => this.updateMode(i, e.target.value)} />
								Pulse
							</label>
							<label>
								<input type="radio" checked={mode === 2} value="2" onChange={(e) => this.updateMode(i, e.target.value)} />
								OFF
							</label>
						</div>
					</led>
				))}
			</div>
		)
	}
}

export default LedNet;
