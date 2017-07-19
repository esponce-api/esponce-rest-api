var fs = require('fs');
var minify = require('minify');
var pkg = require('./package.json');

var src = './lib/Esponce.js';
var dst = './dist/esponce.min.js';

minify(src, function(error, data) {
  if (error) return console.error(error);
  var comment = "/*! Esponce API v" + pkg.version + " | " + pkg.repository.url + " | MIT license */\n";
  var js = comment + data;
  fs.writeFileSync(dst, js);
  console.log("Done!");
});