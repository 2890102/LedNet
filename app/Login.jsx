import React from 'react';
import {withRouter} from 'react-router';
import Session from 'Session';

class Login extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			error: false
		};
		this.handleSubmit = this.handleSubmit.bind(this);
	}
	handleSubmit(event) {
		event.preventDefault();
		Session.login(this.refs.email.value, this.refs.password.value, (loggedIn) => {
			if(!loggedIn) return this.setState({error: true});
			if(this.props.location.state && this.props.location.state.nextPathname) {
				this.props.router.replace(this.props.location.state.nextPathname);
			} else {
				this.props.router.replace('/');
			}
		});
	}
	render() {
		return (
			<form className="login" onSubmit={this.handleSubmit}>
				<label>Email</label>
				<input type="email" ref="email" required autoFocus />
				<label>Password</label>
				<input type="password" ref="password" required />
				<div>
					<button type="submit">Login</button>
				</div>
				{this.state.error && (
					<p>Error! Invalid email/password combination.</p>
				)}
			</form>
		)
	}
}

export default withRouter(Login);
