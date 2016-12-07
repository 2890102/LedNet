import React from 'react';
import Session from 'Session';

class Settings extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			error: false,
			passwordError: false,
			updated: false,
			user: Session.get()
		};
		this.handleSubmit = this.handleSubmit.bind(this);
		this.resetErrors = this.resetErrors.bind(this);
	}
	handleSubmit(event) {
		event.preventDefault();
		if(this.refs.password.value !== this.refs.confirmPassword.value) {
			return this.setState({passwordError: true});
		}
		this.resetErrors();
		Session.update(this.refs.email.value, this.refs.currentPassword.value, this.refs.password.value, (updated) => {
			this.setState(updated ? {user: Session.get(), updated} : {error: true});
		});
	}
	resetErrors() {
		this.setState({
			error: false,
			passwordError: false,
			updated: false
		});
	}
	render() {
		return (
			<form className="login" onSubmit={this.handleSubmit}>
				<label>Email</label>
				<input type="email" ref="email" defaultValue={this.state.user.email} onChange={this.resetErrors} required autoFocus />
				<label>Current password</label>
				<input type="password" ref="currentPassword" onChange={this.resetErrors} required />
				<label>New password</label>
				<input type="password" ref="password" onChange={this.resetErrors} required />
				<label>Confirm new password</label>
				<input type="password" ref="confirmPassword" onChange={this.resetErrors} required />
				<div>
					<button type="submit">Update</button>
				</div>
				{this.state.passwordError && (
					<p>The new passwords don't match!</p>
				)}
				{this.state.error && (
					<p>Couldn't update your settings!... Check your current password.</p>
				)}
				{this.state.updated && (
					<p>Your settings have been updated.</p>
				)}
			</form>
		)
	}
}

export default Settings;
