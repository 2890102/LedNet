'use strict';

const mongoose = require('mongoose');

const LedSchema = new mongoose.Schema({
	_id: Number,
	color: {
		r: {type: Number, default: 0},
		g: {type: Number, default: 0},
		b: {type: Number, default: 0}
	},
	mode: {type: Number, default: 0},
	piwik: [
		{
			site: Number,
			color: {
				r: {type: Number, default: 0},
				g: {type: Number, default: 0},
				b: {type: Number, default: 0}
			}
		}
	]
});

LedSchema.methods = {};

LedSchema.statics = {};

module.exports = mongoose.model('Led', LedSchema);
