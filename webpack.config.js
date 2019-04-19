const path = require('path');

module.exports = {
  entry: './lib/main.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist.browser')
  }
};
