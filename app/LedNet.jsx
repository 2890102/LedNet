import React from 'react';
import update from 'immutability-helper';
import Octicon from 'react-octicon';
import {hex2rgb, rgb2hex} from 'hexrgb';

class Led extends React.PureComponent {
	render() {
		const {id, state: {color: {r, g, b}, mode, piwik}, index, updateColor, updateMode, addHook, removeHook, updateHook} = this.props;
		return (
			<led>
				<h5>ChipId: {id}</h5>
				<div>
					<input type="number" min="0" max="255" value={r} onChange={(e) => updateColor(index, 'r', e.target.value)} />
					<input type="number" min="0" max="255" value={g} onChange={(e) => updateColor(index, 'g', e.target.value)} />
					<input type="number" min="0" max="255" value={b} onChange={(e) => updateColor(index, 'b', e.target.value)} />
				</div>
				<input type="color" value={rgb2hex('rgb(' + r + ',' + g + ',' + b + ')')} onChange={(e) => updateColor(index, 'picker', e.target.value)} />
				<div className="mode">
					<label>
						<input type="radio" checked={mode === 0} value="0" onChange={(e) => updateMode(index, e.target.value)} />
						ON
					</label>
					<label>
						<input type="radio" checked={mode === 1} value="1" onChange={(e) => updateMode(index, e.target.value)} />
						Pulse
					</label>
					<label>
						<input type="radio" checked={mode === 2} value="2" onChange={(e) => updateMode(index, e.target.value)} />
						OFF
					</label>
				</div>
				<h5>
					Piwik hooks
					<a className="action" onClick={(e) => addHook(index)}>
						<Octicon name="diff-added" />Add hook
					</a>
				</h5>
				<div className="piwik">
					{piwik.map(({site, color: {r, g, b}}, i) => (
						<div key={i}>
							<h5>
								SiteID: {site}
								<a className="action" onClick={(e) => removeHook(index, i)}>
									<Octicon name="diff-removed" />
								</a>
							</h5>
							<input type="color" value={rgb2hex('rgb(' + r + ',' + g + ',' + b + ')')} onChange={(e) => updateHook(index, i, e.target.value)} />
						</div>
					))}
					{!piwik.length && (
						<div>No hooks</div>
					)}
				</div>
			</led>
		);
	}
}

class LedNet extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			leds: []
		};
		this.updateColor = this.updateColor.bind(this);
		this.updateMode = this.updateMode.bind(this);
		this.addHook = this.addHook.bind(this);
		this.updateHook = this.updateHook.bind(this);
		this.removeHook = this.removeHook.bind(this);
	}
	componentWillMount() {
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
			let index;
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
					index = this.state.leds.findIndex((led) => (led.id === message.led));
					if(index === -1) return;
					leds = update(this.state.leds, {$splice: [[index, 1]]});
				break;
				case 'update':
					index = this.state.leds.findIndex((led) => (led.id === message.led));
					if(index === -1) return;
					leds = update(this.state.leds, {[index]: {state: {$set: message.state}}});
				break;
				default:
					return;
			}
			this.setState({leds});
		};
		this.socket.onclose = () => {
			this.setState({leds: []});
			setTimeout(this.connect.bind(this), 0);
		};
	}
	updateColor(i, c, value) {
		let color;
		if(c === 'picker') {
			const rgb = hex2rgb(value, true);
			if(rgb === null) color = {r: 0, g: 0, b: 0};
			else color = {r: rgb[0], g: rgb[1], b: rgb[2]};
		} else {
			color = update(this.state.leds[i].state.color, {[c]: {$set: Math.min(Math.max(parseInt(value, 10) || 0, 0), 255)}});
		}
		this.update(i, update(this.state.leds[i].state, {color: {$set: color}}));
	}
	updateMode(i, value) {
		this.update(i, update(this.state.leds[i].state, {mode: {$set: parseInt(value, 10) || 0}}));
	}
	addHook(i) {
		const site = parseInt(prompt('Enter a piwik siteID'), 10) || 0;
		if(!site) return;
		this.update(i, update(this.state.leds[i].state, {piwik: {$push: [{
			site,
			color: {r: 0, g: 0, b: 0}
		}]}}));
	}
	removeHook(i, hook) {
		this.update(i, update(this.state.leds[i].state, {piwik: {$splice: [[hook, 1]]}}));
	}
	updateHook(i, hook, value) {
		let color;
		const rgb = hex2rgb(value, true);
		if(rgb === null) color = {r: 0, g: 0, b: 0};
		else color = {r: rgb[0], g: rgb[1], b: rgb[2]};
		this.update(i, update(this.state.leds[i].state, {piwik: {[hook]: {color: {$set: color}}}}));
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
				{this.state.leds.map((led, index) => (
					<Led
						key={index}
						index={index}
						updateColor={this.updateColor}
						updateMode={this.updateMode}
						addHook={this.addHook}
						removeHook={this.removeHook}
						updateHook={this.updateHook}
						{...led}
					/>
				))}
			</div>
		)
	}
}

export default LedNet;
