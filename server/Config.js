'use strict';

module.exports = {
	defaultUser: {
		email: 'admin@led.net',
		password: 'adm!n'
	},
	mongoURI: process.env.MONGOHQ_URL || process.env.MONGODB_URI || 'mongodb://localhost/LedNet',
	redisURI: process.env.REDIS_URL,
	hostname: process.env.HOSTNAME,
	port: process.env.PORT || 8080,
	basename: process.env.BASENAME || '/',
	sessionSecret: process.env.SESSION_SECRET || 'Your Session Secret goes here',
	production: process.env.NODE_ENV === 'production'
};
