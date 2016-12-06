import React from 'react';
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
			const leds = [...this.state.leds];
			const getById = (id, justTheIndex) => {
				for(let i=0; i<leds.length; i++) {
					if(leds[i].id === id) {
						return justTheIndex ? i : leds[i];
					}
				}
				return false;
			};
			switch(message.event) {
				case 'init':
					return this.setState({leds: message.leds});
				break;
				case 'add':
					leds.push({
						id: message.led,
						state: message.state
					});
				break;
				case 'remove':
					const i = getById(message.led, true);
					i !== false && leds.splice(i, 1);
				break;
				case 'update':
					const led = getById(message.led);
					led.state = message.state;
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
		const state = {...this.state.leds[i].state};
		if(c === 'picker') {
			const rgb = hex2rgb(value, true);
			state.color = {
				r: isNaN(rgb[0]) ? 0 : rgb[0],
				g: isNaN(rgb[1]) ? 0 : rgb[1],
				b: isNaN(rgb[2]) ? 0 : rgb[2]
			};
		} else {
			value = parseInt(value, 10);
			state.color = {...state.color, [c]: isNaN(value) ? 0 : value};
		}
		this.update(i, state);
	}
	updateMode(i, value) {
		const state = {...this.state.leds[i].state};
		value = parseInt(value, 10);
		state.mode = isNaN(value) ? 0 : value;
		this.update(i, state);
	}
	update(i, state) {
		const leds = [...this.state.leds];
		leds[i].state = state;
		this.setState({leds});
		this.socket.send(JSON.stringify({
			event: 'update',
			led: leds[i].id,
			state: state
		}), () => {});
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
