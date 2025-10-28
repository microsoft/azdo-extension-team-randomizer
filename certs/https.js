var fs = require('fs');

module.exports = {
  cert: fs.readFileSync(__dirname + '/localhost.crt'),
  key: fs.readFileSync(__dirname + '/localhost.key')
};
