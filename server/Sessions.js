'use strict';

const Config = require('./Config.js');
const connectMongo = require('connect-mongo');
const connectRedis = require('connect-redis');
const mongoose = require('mongoose');
const passport = require('passport');
const localStrategy = require('passport-local');
const session = require('express-session');
const User = require('./User.js');

module.exports = (app) => {
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

	/* Default user population */
	mongoose.connection.once('connected', () => {
		/* Check for existing users */
		User.count({}, (err, count) => {
			if(count > 0) return;
			/* Populate default user */
			(new User({
				email: Config.defaultUser.email,
				password: Config.defaultUser.password
			})).save();
		});
	});

	/* Session */
	const sessionStore = (Config.redisURI ? connectRedis : connectMongo)(session);
	app.set('trust proxy', 'loopback');
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
		store: new sessionStore(Config.redisURI ? {url: Config.redisURI} : {mongooseConnection: mongoose.connection})
	}));
	app.use(passport.initialize());
	app.use(passport.session());

	/* Session routes */
	app.post('/login', (req, res, next) => {
		req.checkBody('email').notEmpty().isEmail();
		req.checkBody('password').notEmpty();
		req.getValidationResult().then((result) => {
			if(!result.isEmpty()) return res.status(400).end();
			passport.authenticate('local', (err, user) => {
				if(err) return next(err);
				if(!user) return res.status(401).end();
				req.logIn(user, (err) => {
					if(err) return res.status(401).end();
					res.json({
						id: req.user.id,
						email: req.user.email
					});
				});
			})(req, res, next);
		});
	});
	app.get('/logout', (req, res) => {
		req.logout();
		res.redirect(Config.basename);
	});
	app.post('/user', (req, res) => {
		if(!req.user) return res.status(401).end();
		req.checkBody('email').notEmpty().isEmail();
		req.checkBody('currentPassword').notEmpty();
		req.checkBody('password').notEmpty();
		req.getValidationResult().then((result) => {
			if(!result.isEmpty()) return res.status(400).end();
			req.user.comparePassword(req.body.currentPassword, (err, isMatch) => {
				if(!isMatch) return res.status(401).end();
				req.user.email = req.body.email;
				req.user.password = req.body.password;
				req.user.save((err) => {
					if(err) res.status(500).end();
					res.json({
						id: req.user.id,
						email: req.user.email
					});
				});
			});
		});
	});
};
