import React from 'react';
import hex2rgb from 'hex-rgb';
import rgb2hex from 'rgb-hex';

class Home extends React.Component {
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
	update(i, value, picker) {
		const leds = [...this.state.leds];
		const led = leds[i];
		const rgb = picker ? hex2rgb(value) : value.split(',').map((n) => parseInt(n, 10));
		led[1] = isNaN(rgb[0]) ? 0 : rgb[0];
		led[2] = isNaN(rgb[1]) ? 0 : rgb[1];
		led[3] = isNaN(rgb[2]) ? 0 : rgb[2];
		this.setState({leds});
		fetch(BASENAME + '/led/' + led[0] + '/' + led[1] + '/' + led[2] + '/' + led[3] + '/');
	}
	render() {
		const leds = this.state.leds.map(([id, r, g, b], i) => (
			<row key={i}>
				ChipId: {id}
				<input type="text" value={r + "," + g + "," + b} onChange={(e) => this.update(i, e.target.value)} />
				<input type="color" value={'#' + rgb2hex(r, g, b)} onChange={(e) => this.update(i, e.target.value, true)} />
			</row>
		))
		return (
			<div>
				{leds}
			</div>
		)
	}
}

export default Home;
