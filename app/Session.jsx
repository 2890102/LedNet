import ee from 'event-emitter';

class Session {
	constructor() {
		/* Restore session from localStorage */
		try {
			this.user = JSON.parse(localStorage.getItem('LedNet:Session'));
		} catch(e) {
			this.user = null;
		}
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
			localStorage.setItem('LedNet:Session', JSON.stringify(user));
		});
	}
	logout() {
		this.emit('change', false);
		localStorage.removeItem('LedNet:Session');
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
			localStorage.setItem('LedNet:Session', JSON.stringify(user));
		});
	}
}

export default ee(new Session());
