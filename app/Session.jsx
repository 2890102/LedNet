import ee from 'event-emitter';

class Session {
	constructor() {
		/* Init session */
		if(!window.__SESSION__) return;
		this.user = window.__SESSION__;
		delete window.__SESSION__;
	}
	req(method, payload, callback) {
		fetch(BASENAME + '/' + method, {
			credentials: 'same-origin',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(payload)
		}).then((response) => {
			if(response.status !== 200) return callback && callback(false);
			return response.json();
		}).then(callback).catch((ex) => {
			callback && callback(false);
		});
	}
	loggedIn() {
		return !!this.user;
	}
	login(email, password, callback) {
		this.req('login', {email, password}, (user) => {
			if(!user) return callback && callback(false);
			this.user = user;
			this.emit('change', true);
			callback && callback(true);
		});
	}
	get() {
		if(!this.loggedIn()) return;
		return {...this.user};
	}
	update(email, currentPassword, password, callback) {
		if(!this.loggedIn()) return callback && callback(false);
		this.req('user', {email, currentPassword, password}, (user) => {
			if(!user) return callback && callback(false);
			this.user = user;
			callback && callback(true);
		});
	}
}

export default ee(new Session());
