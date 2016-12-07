'use strict';

const Config = require('./Config.js');
const connectMongo = require('connect-mongo');
const localStrategy = require('passport-local');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const User = require('./User.js');

module.exports = (app) => {
	/* Mongoose connection */
	const connect = () => {
		mongoose.connect(Config.mongoURI, (err) => {
			err && console.log(err);
		});
	};
	mongoose.Promise = global.Promise;
	mongoose.connection.on('error', console.log);
	mongoose.connection.on('disconnected', connect);
	connect();

	/* Passport setup */
	passport.serializeUser((user, done) => {
		done(null, user.id);
	});
	passport.deserializeUser((id, done) => {
		User.findById(id, done);
	});
	passport.use(new localStrategy({
		usernameField: 'email'
	}, (email, password, done) => {
		User.findOne({email: email}, (err, user) => {
			if(!user) return done(null, false);
			user.comparePassword(password, (err, isMatch) => {
				done(null, isMatch ? user : false);
			});
		});
	}));

	/* Session */
	app.set('trust proxy', 'loopback');
	const MongoStore = connectMongo(session);
	app.use(session({
		resave: false,
		saveUninitialized: false,
		secret: Config.sessionSecret,
		proxy: true,
		name: 'lednet.sid',
		cookie: {
			httpOnly: true,
			secure: Config.production
		},
		store: new MongoStore({mongooseConnection: mongoose.connection})
	}));
	app.use(passport.initialize());
	app.use(passport.session());

	/* Session routes */
	app.post('/login', (req, res, next) => {
		req.checkBody('email').notEmpty().isEmail();
		req.checkBody('password').notEmpty();
		req.getValidationResult().then((result) => {
			if(!result.isEmpty()) return res.status(400).end();
			passport.authenticate('local', (err, user, info) => {
				if(err) return next(err);
				if(!user) return res.status(401).end();
				req.logIn(user, (err) => {
					res.status(err ? 401 : 200).end();
				});
			})(req, res, next);
		});
	});
	app.post('/logout', (req, res) => {
		if(!req.user) return res.status(401).end();
		req.logout();
		res.status(200).end();
	});
};
