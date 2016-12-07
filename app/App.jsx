import React from 'react';
import Octicon from 'react-octicon';

class App extends React.Component {
	render() {
		return (
			<root>
				<header>
					<h1>
						<Octicon mega name="light-bulb" />LedNet
					</h1>
				</header>
				<route>
					{this.props.children}
				</route>
			</root>
		)
	}
}

export default App;
