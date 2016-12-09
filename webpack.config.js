'use strict';

const production = process.env.NODE_ENV === 'production';
const webpack = require('webpack');
const autoprefixer = require('autoprefixer');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const appPath = path.resolve(__dirname, 'app');
const outputPath = path.resolve(__dirname, 'dist');
const publicPath = process.env.BASENAME || '/';

module.exports = {
	entry: (!production ? [
		'webpack-hot-middleware/client?reload=true'
	] : []).concat([
		path.join(appPath, 'index.sass'),
		appPath
	]),
	resolve: {
		root: appPath,
		extensions: ['', '.js', '.jsx', '.sass']
	},
	output: {
		path: outputPath,
		filename: production ? '[hash].js' : 'app.js',
		publicPath: publicPath
	},
	devtool: production ? 'cheap-module-source-map' : 'eval',
	sassLoader: {
		outputStyle: 'compressed'
	},
	module: {
		loaders: [
			{
				test: /\.jsx$/,
				loader: 'babel-loader',
				exclude: /node_modules/,
				query: {
					presets: ['es2015', 'react', 'stage-1'].concat(!production ? ['react-hmre'] : [])
				}
			},
			{
				test: /\.sass$/,
				loader: ExtractTextPlugin.extract(
					'style',
					'css!postcss!sass'
				)
			},
			{
				test: /\.css$/,
				loader: ExtractTextPlugin.extract(
					'style',
					'css!postcss'
				)
			},
			{
				test: /\.(otf|eot|svg|ttf|woff|woff2)$/,
				loader: 'file',
				query: {
					name: 'fonts/' + (production ? '[hash].[ext]' : '[name].[ext]')
				}
			}
		]
	},
	postcss: [ autoprefixer({ browsers: ['last 2 versions'] }) ],
	plugins: [
		new webpack.DefinePlugin({
			'process.env': {
				NODE_ENV: JSON.stringify(production ? "production" : "development")
			},
			BASENAME: JSON.stringify(publicPath.substr(0, publicPath.length - 1))
		}),
		new ExtractTextPlugin(production ? '[hash].css' : 'app.css', {
			allChunks: true
		}),
		new HtmlWebpackPlugin({
			title: 'LedNet',
			template: path.join(appPath, 'index.ejs'),
			minify: {
				collapseWhitespace: true
			}
		}),
		new webpack.optimize.OccurrenceOrderPlugin()
	].concat(!production ? [
		new webpack.HotModuleReplacementPlugin(),
		new webpack.NoErrorsPlugin()
	] : [
		new webpack.optimize.UglifyJsPlugin({
			compressor: {
				warnings: false,
				screw_ie8: true
			}
		})
	])
};
