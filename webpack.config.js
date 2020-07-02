const path = require('path');
const SriPlugin = require('webpack-subresource-integrity');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './main-browser.js',
  output: {
    filename: `main.js?t=${Date.now()}`,
    path: path.resolve(__dirname, 'dist.browser'),
    crossOriginLoading: 'anonymous',
  },
  plugins: [
    new HtmlWebpackPlugin({
      templateParameters: {
        title: 'AdEx Adview',
      },
      template: 'index.ejs',
    }),
    new SriPlugin({
      hashFuncNames: ['sha256', 'sha384'],
      enabled: true,
    }),
  ],
};
