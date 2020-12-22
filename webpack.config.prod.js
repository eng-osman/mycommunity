const config = require('./webpack.config');
const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
const ArchivePlugin = require('@laomao800/webpack-archive-plugin');
const package = require('./package.json');
const dist = 'build';
const archives = 'archives';

module.exports = {
  ...config,
  entry: ['./src/main.ts'],
  mode: 'production',
  devtool: 'source-map',
  externals: [
    nodeExternals({
      whitelist: [],
    }),
  ],
  output: {
    path: path.join(__dirname, dist),
    filename: 'compiled.js',
  },
  optimization: {
    minimize: false,
    namedModules: true,
    namedChunks: true,
    moduleIds: 'named',
  },
  plugins: [
    new CleanWebpackPlugin([dist]),
    new ArchivePlugin({
      // the output location, can be relative (to Webpack output path) or absolute
      output: path.join(__dirname, archives),

      // output archive filename, defaults to the Webpack output filename (above),
      // if not present, use the basename of the path
      filename: `${package.name}_${package.version}_${Date.now()}`,

      // defaults to the array ['zip', 'tar']
      // valid format is 'zip' and 'tar', can be a string or an array,
      format: 'tar',
    }),
    ...config.plugins,
  ],
};
