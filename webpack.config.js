const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HappyPack = require('happypack');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = {
  target: 'node',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: ['source-map-loader'],
        enforce: 'pre',
        exclude: /node_modules/,
      },
      {
        enforce: 'pre',
        test: /\.tsx?$/,
        use: 'source-map-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.tsx?$/,
        loader: 'happypack/loader?id=ts',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js', '.tsx'],
    plugins: [new TsconfigPathsPlugin()],
  },
  plugins: [
    new HardSourceWebpackPlugin(),
    new CopyWebpackPlugin([
      { from: './firebase-privatekey.pem', to: '.' },
      { from: './.env', to: '.' },
      { from: './locales', to: './locales' },
    ]),
    new HappyPack({
      id: 'ts',
      // We will leve one core for the type-checker
      threads: require('os').cpus().length - 1,
      loaders: [
        {
          path: 'ts-loader',
          query: { happyPackMode: true, transpileOnly: process.env.NODE_ENV === 'development' },
        },
      ],
    }),
    new ForkTsCheckerWebpackPlugin({ checkSyntacticErrors: true }),
  ],
  stats: {
    // fallback value for stats options when an option is not defined (has precedence over local webpack defaults)
    all: undefined,

    // Add asset Information
    assets: false,

    // Sort assets by a field
    // You can reverse the sort with `!field`.
    // Some possible values: 'id' (default), 'name', 'size', 'chunks', 'failed', 'issuer'
    // For a complete list of fields see the bottom of the page
    assetsSort: 'size',

    // Add build date and time information
    builtAt: true,

    // Add information about cached (not built) modules
    cached: true,

    // Show cached assets (setting this to `false` only shows emitted files)
    cachedAssets: true,

    // Add children information
    children: false,

    // Add chunk information (setting this to `false` allows for a less verbose output)
    chunks: true,

    // Add namedChunkGroups information
    chunkGroups: true,

    // Add built modules information to chunk information
    chunkModules: false,

    // Add the origins of chunks and chunk merging info
    chunkOrigins: true,

    // Sort the chunks by a field
    // You can reverse the sort with `!field`. Default is `id`.
    // Some other possible values: 'name', 'size', 'chunks', 'failed', 'issuer'
    // For a complete list of fields see the bottom of the page
    chunksSort: 'name',

    // `webpack --colors` equivalent
    colors: true,

    // Display the distance from the entry point for each module
    depth: false,

    // Display the entry points with the corresponding bundles
    entrypoints: true,

    // Add --env information
    env: true,

    // Add errors
    errors: true,

    // Add details to errors (like resolving log)
    errorDetails: true,

    // Add the hash of the compilation
    hash: true,

    // Set the maximum number of modules to be shown
    maxModules: 6,

    // Add built modules information
    modules: true,

    // Sort the modules by a field
    // You can reverse the sort with `!field`. Default is `id`.
    // Some other possible values: 'name', 'size', 'chunks', 'failed', 'issuer'
    // For a complete list of fields see the bottom of the page
    modulesSort: 'name',

    // Show dependencies and origin of warnings/errors (since webpack 2.5.0)
    moduleTrace: true,

    // Show performance hint when file size exceeds `performance.maxAssetSize`
    performance: true,

    // Show the exports of the modules
    providedExports: false,

    // Add public path information
    publicPath: true,

    // Add information about the reasons why modules are included
    reasons: true,

    // Add the source code of modules
    source: false,

    // Add timing information
    timings: true,

    // Show which exports of a module are used
    usedExports: false,

    // Add webpack version information
    version: true,

    // Add warnings
    warnings: true,
  },
};
