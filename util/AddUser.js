'use strict';

const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
const optionList = [
	{
		name: 'email',
		alias: 'e',
		typeLabel: '[underline]{email}',
		description: 'The user email.',
		type: String
	},
	{
		name: 'password',
		alias: 'p',
		typeLabel: '[underline]{password}',
		description: 'The user password.',
		type: String
	},
];
const options = commandLineArgs(optionList);
if(!options.email || !options.password) return console.log(getUsage([
	{
		header: 'Add User',
		optionList: optionList
	}
]));

const config = require('../server/config.js');
const mongoose = require('mongoose');
const User = require('../server/User.js');
mongoose.Promise = global.Promise;
mongoose.connect(config.mongoURI, (err) => {
	if(err) return console.log('Error: Couldn\'t connect to the database!');
	const user = new User({
		email: options.email,
		password: options.password
	});
	User.findOne({email: options.email}, (findErr, existingUser) => {
		if(existingUser) {
			mongoose.disconnect();
			return console.log('Error: User already exists!');
		}
		user.save((err) => {
			console.log(err ? 'Error creating the user!' : 'User successfully created!');
			mongoose.disconnect();
		});
	});
});
