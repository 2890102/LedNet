'use strict';

const production = process.env.NODE_ENV === 'production';
const webpack = require('webpack');
const autoprefixer = require('autoprefixer');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const ImageminPlugin = require('imagemin-webpack-plugin').default;
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const outputPath = path.resolve(__dirname, 'dist');
const modulesPath = path.resolve(__dirname, 'node_modules');
const appPath = path.resolve(__dirname, 'app');
const publicPath = production ? '/lednet/' : '/';

module.exports = {
	entry: (production ? [] : [
		'webpack-hot-middleware/client?reload=true'
	]).concat([
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
				test: /\.(js|jsx)$/,
				loader: 'babel-loader',
				include: appPath,
				exclude: modulesPath,
				query: {
					presets: ['es2015', 'react', 'stage-1'],
					compact: false
				}
			},
			{
				test: /\.sass$/,
				loader: ExtractTextPlugin.extract(
					'style',
					'css!postcss!sass'
				),
				include: appPath,
				exclude: modulesPath
			},
			{
				test: /\.(jpg|png)$/,
				loader: 'file',
				include: appPath,
				exclude: modulesPath,
				query: {
					name: 'snapshots/' + (production ? '[hash].[ext]' : '[name].[ext]')
				}
			},
			{
				test: /\.css$/,
				loader: ExtractTextPlugin.extract(
					'style',
					'css!postcss'
				),
				include: modulesPath
			},
			{
				test: /\.(otf|eot|svg|ttf|woff|woff2).*$/,
				loader: 'file',
				include: modulesPath,
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
	].concat(!production ? [
		new webpack.HotModuleReplacementPlugin(),
		new webpack.NoErrorsPlugin()
	] : []).concat(production ? [
		new webpack.optimize.DedupePlugin(),
		new webpack.optimize.OccurrenceOrderPlugin(),
		new webpack.optimize.UglifyJsPlugin({
			compressor: {
				warnings: false
			}
		}),
		new ImageminPlugin()
	] : [])
};
