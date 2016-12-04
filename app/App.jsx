import React from 'react';
import {Link} from 'react-router';
import Octicon from 'react-octicon';

class App extends React.Component {
  render() {
		return (
      <root>
				<header>
					<h1>
						<Link to="/">
							<Octicon mega name="light-bulb" />LedNet
						</Link>
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
