import React from 'react';
import Octicon from 'react-octicon';
import Session from 'Session';

class App extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			session: Session.loggedIn()
		};
		this.logout = this.logout.bind(this);
	}
	componentWillMount() {
		Session.on('change', (loggedIn) => {
			this.setState({session: loggedIn});
		});
	}
	logout() {
		Session.logout();
	}
	render() {
		return (
			<root>
				<header>
					<h1>
						<Octicon mega name="light-bulb" />LedNet
					</h1>
					{this.state.session ? <a href={BASENAME + "/logout"} onClick={this.logout}>Log-out</a> : ''}
				</header>
				<route>
					{this.props.children}
				</route>
			</root>
		)
	}
}

export default App;
