'use strict';

const bcrypt = require('bcrypt-nodejs');
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
	email: {type: String, unique: true, lowercase: true},
	password: String
});

UserSchema.pre('save', function(next) {
	const user = this;
	if(!user.isModified('password')) return next();
	return bcrypt.genSalt(5, (err, salt) => {
		if(err) return next(err);
		return bcrypt.hash(user.password, salt, null, (err, hash) => {
			if(err) return next(err);
			user.password = hash;
			return next();
		});
	});
});

UserSchema.methods = {
	comparePassword(candidatePassword, cb) {
		bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
			if(err) return cb(err);
			return cb(null, isMatch);
		});
	}
};

UserSchema.statics = {};

module.exports = mongoose.model('User', UserSchema);
