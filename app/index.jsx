import React from 'react';
import {render} from 'react-dom';
import {IndexRoute, Router, Route, Redirect, useRouterHistory} from 'react-router';
import {createHistory} from 'history';
import Session from 'Session';
import App from 'App';
import Login from 'Login';
import LedNet from 'LedNet';

/* Session helpers */
const requireAuth = (nextState, replace) => {
  if(!Session.loggedIn()) {
    replace({
      pathname: '/login',
      state: {
				nextPathname: nextState.location.pathname
			}
    })
  }
}
const redirectIfAuth = (nextState, replace) => {
	if(Session.loggedIn()) replace({pathname: '/'});
};

/* Mount the app */
const mount = document.createElement('mount');
document.body.appendChild(mount);
render((
	<Router history={useRouterHistory(createHistory)({basename: BASENAME})}>
		<Route path="/" component={App}>
			<IndexRoute component={LedNet} onEnter={requireAuth} />
			<Route path="login" component={Login} onEnter={redirectIfAuth} />
			<Redirect from="*" to="/" />
		</Route>
	</Router>
), mount);
