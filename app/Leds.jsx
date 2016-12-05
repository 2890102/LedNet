import React from 'react';
import hex2rgb from 'hex-rgb';
import rgb2hex from 'rgb-hex';

class Leds extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			leds: []
		};
	}
	componentDidMount() {
		this.source = new EventSource(BASENAME + "/events");
		this.source.onmessage = (e) => {
			this.source.onmessage = null;
			this.setState({
				leds: [...this.state.leds, JSON.parse(e.data).split(',').map((n) => parseInt(n, 10))]
			});
		};
		this.source.addEventListener('add', (e) => {
			this.setState({
				leds: [...this.state.leds, JSON.parse(e.data).split(',').map((n) => parseInt(n, 10))]
			});
		});
		this.source.addEventListener('remove', (e) => {
			const id = parseInt(JSON.parse(e.data), 10);
			const leds = [...this.state.leds];
			for(let i=0; i<leds.length; i++) {
				if(leds[i][0] === id) {
					leds.splice(i, 1);
					break;
				}
			}
			this.setState({leds});
		});
		this.source.addEventListener('update', (e) => {
			const led = JSON.parse(e.data).split(',').map((n) => parseInt(n, 10));
			const leds = [...this.state.leds];
			for(let i=0; i<leds.length; i++) {
				if(leds[i][0] === led[0]) {
					leds[i] = led;
					break;
				}
			}
			this.setState({leds});
		});
	}
	componentWillUnmount() {
		this.source.close();
	}
	updateColor(i, c, value) {
		const led = [...this.state.leds[i]];
		if(c === -1) {
			const rgb = hex2rgb(value);
			led[1] = isNaN(rgb[0]) ? 0 : rgb[0];
			led[2] = isNaN(rgb[1]) ? 0 : rgb[1];
			led[3] = isNaN(rgb[2]) ? 0 : rgb[2];
		} else {
			value = parseInt(value, 10);
			led[c + 1] = isNaN(value) ? 0 : value;
		}
		this.update(i, led);
	}
	updateMode(i, value) {
		const led = [...this.state.leds[i]];
		value = parseInt(value, 10);
		led[4] = isNaN(value) ? 0 : value;
		this.update(i, led);
	}
	update(i, led) {
		const leds = [...this.state.leds];
		leds[i] = led;
		this.setState({leds});
		fetch(BASENAME + '/led', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				id: led[0],
				r: led[1],
				g: led[2],
				b: led[3],
				mode: led[4]
			})
		});
	}
	render() {
		const leds = this.state.leds.map(([id, r, g, b, mode], i) => (
			<led key={i}>
				<h5>ChipId: {id}</h5>
				<input type="number" value={r} onChange={(e) => this.updateColor(i, 0, e.target.value)} />
				<input type="number" value={g} onChange={(e) => this.updateColor(i, 1, e.target.value)} />
				<input type="number" value={b} onChange={(e) => this.updateColor(i, 2, e.target.value)} />
				<input type="color" value={'#' + rgb2hex(r, g, b)} onChange={(e) => this.updateColor(i, -1, e.target.value)} />
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
		))
		return (
			<leds>
				{leds}
			</leds>
		)
	}
}

export default Leds;
