import ee from 'event-emitter';

class Session {
	constructor() {
		try {
			this.user = JSON.parse(localStorage.getItem('LedNet:Session'));
		} catch(e) {
			this.user = null;
		}
	}
	get() {
		if(!this.loggedIn()) return;
		return {...this.user};
	}
	loggedIn() {
		return !!this.user;
	}
	login(email, password, callback) {
		fetch(BASENAME + '/login', {
			credentials: 'same-origin',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				email,
				password,
			})
		}).then((response) => {
			return response.json();
		}).then((user) => {
			this.user = user;
			this.emit('change', true);
			callback && callback(true);
			localStorage.setItem('LedNet:Session', JSON.stringify(user));
		}).catch((ex) => {
			callback(false);
		});
	}
	logout() {
		this.emit('change', false);
		localStorage.removeItem('LedNet:Session');
	}
}

export default ee(new Session());
