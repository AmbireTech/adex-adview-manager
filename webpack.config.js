const path = require('path');

module.exports = {
  entry: './main-browser.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist.browser')
  }
};
