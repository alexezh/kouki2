//var DeclarationBundlerPlugin = require('types-webpack-bundler');
const TypescriptDeclarationPlugin = require('typescript-declaration-webpack-plugin');
const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/digruntime.ts',
  devtool: 'inline-source-map',
  optimization: {
    concatenateModules: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.json$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'file-loader',
            options: {
              limit: 64 * 1024,
              mimetype: "text/plain",
            },
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.json'],
  },
  output: {
    filename: 'digruntime.js',
    path: path.resolve(__dirname, 'public'),
    library: {
      name: "pokman",
      type: "umd",
    },
  },
  plugins: [
    new TypescriptDeclarationPlugin({
      out: `digruntime.d.ts`,
    })
  ],
  devServer: {
    // progress: true,
    hot: true,
    //https: true,
    allowedHosts: 'all',
    port: 8081,
    //    static: {
    //      directory: path.resolve(__dirname, 'public'),
    //    },
    proxy: {
      "/api": {
        target: 'http://localhost:5054',
        secure: false,
        changeOrigin: true
      },
      //"/assets": {
      //  target: 'http://localhost:5082',
      //  secure: false,
      //  changeOrigin: true
      //},
      '/updates': {
        target: 'ws://localhost:5054',
        ws: true
      },
    },
  },
};
