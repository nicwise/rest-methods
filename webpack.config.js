var webpack = require('webpack');
var fsPath = require('path');
const NODE_MODULES_PATH = fsPath.join(__dirname, 'node_modules');


module.exports = {
  entry: './src/client/webpack-build',
  output: {
    filename: 'client.js',
    path: './dist'
  },

  resolveLoader: { fallback: NODE_MODULES_PATH },
  module: {
    loaders: [
      // ES6/JSX.
      { test: /\.js$/,  exclude: /(node_modules)/, loader: 'babel-loader' },
    ]
  }
};