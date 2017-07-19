var Esponce = require("../lib/Esponce.js");

var API_KEY = "API KEY GOES HERE";

exports["string as argument"] = function(test) {
  var esp = new Esponce({ verbose: true, auth: API_KEY });
  esp.generate("hello world", function(error, result) {
    if (error) {
      test.ok(false, error.message);
      test.done();
      return;
    }
    test.ok(typeof result == "object", "Expected an object for result");
    //test.ok(typeof result.data == "string");
    //test.ok(result.data.indexOf("<svg") >= 0, "Expected <svg> tag in response");
    test.done();
  });
};

exports["format svg"] = function(test) {
  var esp = new Esponce({ verbose: true, auth: API_KEY });
  esp.generate({ content: "hello world", format: "svg" }, function(error, result) {
    if (error) {
      test.ok(false, error.message);
      test.done();
      return;
    }
    test.ok(typeof result == "object", "Expected an object for result");
    test.ok(typeof result.data == "string");
    test.ok(result.data.indexOf("<svg") >= 0, "Expected <svg> tag in response");
    test.done();
  });
};
