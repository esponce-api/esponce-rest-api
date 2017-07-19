;(function(global) {

/******************************************************************************************
 * Resolve dependencies
 ******************************************************************************************/
var request;
if (typeof exports === 'object' || (typeof define === 'function' && define.amd)) {
  request = require('request');
}
else if (typeof jQuery !== 'undefined') {
  //jQuery wrapper for require('request')
  request = function(options, callback) {
    var ajax = {
      cache: false,
      type: options.method || "GET",
      url: options.url || "#",
      error: function(xhr, status, error) {
        if (callback) {
          callback(xhr.responseJSON || new Error(error || "Error"), { statusCode: status }, null);
        }
      },
      success: function(result, status, xhr) {
        if (callback) {
          callback(null, { statusCode: status }, result);
        }
      }
    };
    if (options.body) {
      ajax.data = options.body;
      ajax.dataType = "json";
    }
    if (options.headers) {
      ajax.headers = options.headers;
    }
    if (options.headers && options.headers["Content-Type"]) {
      ajax.contentType = options.headers["Content-Type"];
    }
    console.log(ajax);
    jQuery.ajax(ajax);
  };
}
else {
  return console.error("Esponce library is not available in this environment! Hint: try with Node.js or web browser with jQuery.");
}

/******************************************************************************************
 * Extensions
 ******************************************************************************************/
Array.prototype.contains = function(obj) {
  var i = this.length;
  while (i--) {
    if (this[i] === obj) {
      return true;
    }
  }
  return false;
};

Object.prototype.toQueryString = function() {
  var obj = this;
  var result = "";
  Object.keys(typeof obj == "object" ? obj : { }).forEach(function (key, index) {
    if (obj.hasOwnProperty(key) && /string|number|boolean/.test(typeof obj[key])) {
      result += (result.length == 0 ? "?" : "&") + encodeURIComponent(key) + "=" + encodeURIComponent(obj[key]);
    }
  });
  return result;
};

/******************************************************************************************
 * Constructor
 * @param options Object with arguments: verbose, url, userAgent
 ******************************************************************************************/
function Esponce(options) {
  var self = this;
  self.events = { };

  //Default option values
  var defaults = {
    verbose: false,
    url: null,
    userAgent: null
  };
  
  //Merge objects
  self.options = Object.assign({ }, defaults, options || { });
  
  //REST API base URL
  if (!self.options.url) {
    self.options.url = "https://www.esponce.com/";
  }
  
  //Define User-Agent
  if (!self.options.userAgent && typeof require === 'function') {
    var pkg = require('../package.json');
    self.options.userAgent = "Esponce/" + pkg.version + " (JavaScript)";
  }
  
  if (typeof request.defaults === 'function') {
    request.defaults({
      headers: {
        "Accept": "application/json",
        "User-Agent": self.options.userAgent
      }
    });
  }
  
  //A private method to handle HTTP requests
  self.request = function(options, callback) {
    try {
      if (self.options.verbose) {
        console.log((options.method || "GET") + " " + self.options.url + options.route);
        console.log("req.headers", options.headers);
        console.log("req.body", options.body);
      }
      
      var req = {
        method: options.method || "GET",
        url: self.options.url + options.route,
        encoding: null //Response body as Buffer instead of String
      };
      
      if (options.headers) {
        req.headers = options.headers;
      }
      
      if (options.body) {
        if (typeof options.body == "object") {
          req.body = JSON.stringify(options.body, " ", 2);
        }
        else {
          req.body = options.body;
        }
      }
      
      request(req, function (error, response, body) {
        try {
          if (error) {
            throw error;
          }
          
          if (response && response.statusCode >= 400) {
            var message = "HTTP Status Code " + response.statusCode;
            if (response.caseless) {
              var headers = response.caseless.dict || { };
              message += ", subcode " + headers['x-api-error-code'];
              message += ", details: " + headers['x-api-error'];
            }
            throw new Error(message);
          }
          
          //String or Buffer or JSON data
          var data = null;
          try {
            var type = Object.prototype.toString.call(body);
            if (type == "[object Uint8Array]" || type == "[object Buffer]") {
              if (body.length == 0) {
                data = null;
              }
              else {
                data = JSON.parse(body.toString('utf-8'));
              }
            }
            else {
              data = JSON.parse(body);
            }
          }
          catch (err) {
            if (type == "[object Uint8Array]" || type == "[object Buffer]") {
              if (body.length == 0) {
                data = null;
              }
              else {
                var s = body.toString('utf-8');
                var ascii = s.replace(/[^\w\d\r\n\s\.,\-\+:"'\{\}]+/gi, "");
                if (ascii.length / s.length >= 0.5) { //At least 50% chars must be ASCII to be treated as string
                  data = s; //String
                }
                else {
                  data = body; //Binary data
                }
              }
            }
            else {
              data = body;
            }
          }
          
          //Build result object
          var result = { };
          if (response && response.caseless) {
            var headers = response.caseless.dict || { };
            result.meta = {
              apiVersion: headers['x-api-version'],
              contentType: headers['content-type'],
              contentLength: parseInt(headers['content-length']),
              rateLimit: {
                total: parseInt(headers['x-ratelimit-limit']),
                remaining: parseInt(headers['x-ratelimit-remaining']),
                reset: parseInt(headers['x-ratelimit-reset'])
              }
            };
          }
          result.data = data;
          
          //Invoke callback function
          if (typeof callback == "function") {
            callback(null, result);
          }
        }
        catch (err) {
          if (self.options.verbose) {
            console.error(err);
          }
          if (typeof callback == "function") {
            callback(err);
          }
        }
      });
    }
    catch (error) {
      if (self.options.verbose) {
        console.error(error);
      }
      if (typeof callback == "function") {
        callback(error);
      }
    }
  };
}

/******************************************************************************************
 * Gets or sets the API key.
 * @param key Esponce API key
 ******************************************************************************************/
Esponce.prototype.auth = function(key) {
  var self = this;
  if (arguments.length == 0) {
    return self.options.auth;
  }
  else {
    self.options.auth = key;
  }
};

/******************************************************************************************
 * Generates a QR Code.
 * @param options    Object with arguments
 * @param callback   function(error, result)
 ******************************************************************************************/
Esponce.prototype.generate = function(options, callback) {
  var self = this;

  if (typeof callback != "function") {
    callback = function(error, result) { };
  }
  
  try {
    var auth = self.options.auth;
    
    if (typeof options == "undefined") {
      throw new Error("Missing 'options' argument!");
    }
    
    if (typeof options == "string") {
      options = { content: options };
    }
    
    if (typeof options.auth == "string") {
      auth = options.auth;
    }
    
    if (typeof auth == "undefined") {
      throw new Error("API key is missing!");
    }
    
    if (typeof auth != "string") {
      throw new Error("API key should be a string!");
    }
    
    //Supported parameters
    var getParameters = [ "content", "format", "version", "size", "padding", "em", "ec", "foreground", "background", "shorten", "attachment", "filename" ];
    
    //Filter out unnecessary parameters
    var query = { auth: auth };
    var keys = Object.keys(options);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (getParameters.contains(key)) {
        query[key] = options[key]; 
      }
    }
    
    self.request({
      method: "GET",
      route: "api/v3/generate" + query.toQueryString()
    }, callback);
  }
  catch (e) {
    callback(e);
  }
};

/******************************************************************************************
 * Decodes the QR Code image and gets the content.
 * @param image      QR Code image
 * @param callback   function(error, result)
 ******************************************************************************************/
Esponce.prototype.decode = function(image, callback) {
  var self = this;
  
  if (typeof callback != "function") {
    callback = function(error, result) { };
  }
  
  try {
    var query = { auth: self.options.auth };
    
    if (typeof query.auth == "undefined") {
      throw new Error("API key is missing!");
    }
    
    if (typeof query.auth != "string") {
      throw new Error("API key should be a string!");
    }
    
    if (typeof image == "undefined") {
      throw new Error("Image data is missing!")
    }
    
    self.request({
      method: "POST",
      route: "api/v3/decode" + query.toQueryString(),
      headers: {
        "Accept": "application/json",
        "Content-Type": "image/png"
      },
      body: image
    }, callback);
  }
  catch (e) {
    callback(e);
  }
};

/******************************************************************************************
 * Gets a list of campaigns and QR Codes.
 * @param callback function(error, list)
 ******************************************************************************************/
Esponce.prototype.list = function(callback) {
  var self = this;
  
  if (typeof callback != "function") {
    callback = function(error, result) { };
  }
  
  try {
    var query = { auth: self.options.auth };
    
    if (typeof query.auth == "undefined") {
      throw new Error("API key is missing!");
    }
    
    if (typeof query.auth != "string") {
      throw new Error("API key should be a string!");
    }
    
    self.request({
      method: "GET",
      route: "api/v3/track/list" + query.toQueryString(),
      headers: {
        "Accept": "application/json"
      }
    }, callback);
  }
  catch (e) {
    callback(e);
  }
};

/******************************************************************************************
 * Gets a specific campaign info.
 * @param id         Campaign id
 * @param callback   function(error, data)
 ******************************************************************************************/
Esponce.prototype.getCampaign = function(id, callback) {
  var self = this;
  
  if (typeof callback != "function") {
    callback = function(error, result) { };
  }
  
  try {
    var query = { auth: self.options.auth };
    
    if (typeof query.auth == "undefined") {
      throw new Error("API key is missing!");
    }
    
    if (typeof query.auth != "string") {
      throw new Error("API key should be a string!");
    }
    
    if (typeof id != "string" || id.length == 0) {
      throw new Error("Campaign id is missing!")
    }
      
    self.request({
      method: "GET",
      route: "api/v3/track/campaign/" + id + query.toQueryString(),
      headers: {
        "Accept": "application/json"
      }
    }, callback);
  }
  catch (e) {
    callback(e);
  }
};

/******************************************************************************************
 * Creates a new campaign.
 * @param data       Campaign data
 * @param callback   function(error, data)
 ******************************************************************************************/
Esponce.prototype.createCampaign = function(data, callback) {
  var self = this;
  
  if (typeof callback != "function") {
    callback = function(error, result) { };
  }
  
  try {
    var query = { auth: self.options.auth };
    
    if (typeof query.auth == "undefined") {
      throw new Error("API key is missing!");
    }
    
    if (typeof query.auth != "string") {
      throw new Error("API key should be a string!");
    }
    
    if (typeof data == "undefined") {
      throw new Error("Campaign data is missing!")
    }
    
    self.request({
      method: "POST",
      route: "api/v3/track/campaign" + query.toQueryString(),
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: data
    }, callback);
  }
  catch (e) {
    callback(e);
  }
};

/******************************************************************************************
 * Updates a specific campaign.
 * @param id         Campaign id
 * @param data       Campaign data
 * @param callback   function(error, data)
 ******************************************************************************************/
Esponce.prototype.updateCampaign = function(id, data, callback) {
  var self = this;
  
  if (typeof callback != "function") {
    callback = function(error, result) { };
  }
  
  try {
    var query = { auth: self.options.auth };
    
    if (typeof query.auth == "undefined") {
      throw new Error("API key is missing!");
    }
    
    if (typeof query.auth != "string") {
      throw new Error("API key should be a string!");
    }
    
    if (typeof id != "string" || id.length == 0) {
      throw new Error("Campaign id is missing!")
    }
    
    if (typeof data == "undefined") {
      throw new Error("Campaign data is missing!")
    }
      
    self.request({
      method: "PUT",
      route: "api/v3/track/campaign/" + id + query.toQueryString(),
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: data
    }, callback);
  }
  catch (e) {
    callback(e);
  }
};

/******************************************************************************************
 * Deletes a specific campaign.
 * @param id         Campaign id
 * @param callback   function(error, data)
 ******************************************************************************************/
Esponce.prototype.deleteCampaign = function(id, callback) {
  var self = this;
  
  if (typeof callback != "function") {
    callback = function(error, result) { };
  }
  
  try {
    var query = { auth: self.options.auth };
    
    if (typeof query.auth == "undefined") {
      throw new Error("API key is missing!");
    }
    
    if (typeof query.auth != "string") {
      throw new Error("API key should be a string!");
    }
    
    if (typeof id != "string" || id.length == 0) {
      throw new Error("Campaign id is missing!")
    }
    
    self.request({
      method: "DELETE",
      route: "api/v3/track/campaign/" + id + query.toQueryString(),
    }, callback);
  }
  catch (e) {
    callback(e);
  }
};

/******************************************************************************************
 * Gets a specific QR Code info.
 * @param id         QR Code id
 * @param callback   function(error, data)
 ******************************************************************************************/
Esponce.prototype.getQRCode = function(id, callback) {
  var self = this;
  
  if (typeof callback != "function") {
    callback = function(error, result) { };
  }
  
  try {
    var query = { auth: self.options.auth };
    
    if (typeof query.auth == "undefined") {
      throw new Error("API key is missing!");
    }
    
    if (typeof query.auth != "string") {
      throw new Error("API key should be a string!");
    }
    
    if (typeof id != "string" || id.length == 0) {
      throw new Error("QRCode id is missing!")
    }
      
    self.request({
      method: "GET",
      route: "api/v3/track/qrcode/" + id + query.toQueryString(),
      headers: {
        "Accept": "application/json"
      }
    }, callback);
  }
  catch (e) {
    callback(e);
  }
};

/******************************************************************************************
 * Creates a new QR Code.
 * @param data       QR Code data
 * @param callback   function(error, data)
 ******************************************************************************************/
Esponce.prototype.createQRCode = function(data, callback) {
  var self = this;
  
  if (typeof callback != "function") {
    callback = function(error, result) { };
  }
  
  try {
    var query = { auth: self.options.auth };
    
    if (typeof query.auth == "undefined") {
      throw new Error("API key is missing!");
    }
    
    if (typeof query.auth != "string") {
      throw new Error("API key should be a string!");
    }
    
    if (typeof data == "undefined") {
      throw new Error("QR Code data is missing!")
    }
    
    self.request({
      method: "POST",
      route: "api/v3/track/qrcode" + query.toQueryString(),
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: data
    }, callback);
  }
  catch (e) {
    callback(e);
  }
};

/******************************************************************************************
 * Updates a specific QR Code.
 * @param id         QR Code id
 * @param data       QR Code data
 * @param callback   function(error, data)
 ******************************************************************************************/
Esponce.prototype.updateQRCode = function(id, data, callback) {
  var self = this;
  
  if (typeof callback != "function") {
    callback = function(error, result) { };
  }
  
  try {
    var query = { auth: self.options.auth };
    
    if (typeof query.auth == "undefined") {
      throw new Error("API key is missing!");
    }
    
    if (typeof query.auth != "string") {
      throw new Error("API key should be a string!");
    }
    
    if (typeof id != "string" || id.length == 0) {
      throw new Error("QR Code id is missing!")
    }
    
    if (typeof data == "undefined") {
      throw new Error("QR Code data is missing!")
    }
      
    self.request({
      method: "PUT",
      route: "api/v3/track/qrcode/" + id + query.toQueryString(),
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: data
    }, callback);
  }
  catch (e) {
    callback(e);
  }
};

/******************************************************************************************
 * Deletes a specific QR Code.
 * @param id         QR Code id
 * @param callback   function(error, data)
 ******************************************************************************************/
Esponce.prototype.deleteQRCode = function(id, callback) {
  var self = this;
  
  if (typeof callback != "function") {
    callback = function(error, result) { };
  }
  
  try {
    var query = { auth: self.options.auth };
    
    if (typeof query.auth == "undefined") {
      throw new Error("API key is missing!");
    }
    
    if (typeof query.auth != "string") {
      throw new Error("API key should be a string!");
    }
    
    if (typeof id != "string" || id.length == 0) {
      throw new Error("QR Code id is missing!")
    }
    
    self.request({
      method: "DELETE",
      route: "api/v3/track/qrcode/" + id + query.toQueryString(),
    }, callback);
  }
  catch (e) {
    callback(e);
  }
};

/******************************************************************************************
 * Gets the QR Code scanning statistics.
 * @param id         QR Code id
 * @param options    Object with arguments: format
 * @param callback   function(error, result)
 ******************************************************************************************/
Esponce.prototype.getStatistics = function(id, options, callback) {
  var self = this;
  
  if (typeof callback != "function") {
    callback = function(error, result) { };
  }
  
  try {
    var query = { auth: self.options.auth };
    
    if (typeof query.auth == "undefined") {
      throw new Error("API key is missing!");
    }
    
    if (typeof query.auth != "string") {
      throw new Error("API key should be a string!");
    }
    
    if (typeof id != "string" || id.length == 0) {
      throw new Error("QR Code id is missing!")
    }
    
    if (typeof options == "undefined") {
      throw new Error("Argument 'options' is missing!")
    }
    
    var ext = options && options.format ? options.format : "csv";
    
    self.request({
      method: "GET",
      route: "api/v3/track/statistics/" + id + "." + ext + query.toQueryString()
    }, callback);
  }
  catch (e) {
    if (typeof callback == "function") {
      callback(e);
    }
  }
};

/******************************************************************************************
 * Imports new campaigns and QR Codes.
 * @param data       CSV or XLS or XML content
 * @param options    Object with arguments: format
 * @param callback   function(error, result)
 ******************************************************************************************/
Esponce.prototype.import = function(data, options, callback) {
  var self = this;
  
  if (typeof callback != "function") {
    callback = function(error, result) { };
  }
  
  try {
    var query = { auth: self.options.auth };
    
    if (typeof query.auth == "undefined") {
      throw new Error("API key is missing!");
    }
    
    if (typeof query.auth != "string") {
      throw new Error("API key should be a string!");
    }
    
    if (typeof options == "undefined") {
      throw new Error("Argument 'options' is missing!")
    }
  
    var query = {
      format: options.format,
      auth: self.options.auth
    };
    
    self.request({
      method: "POST",
      route: "api/v3/track/import" + query.toQueryString(),
      headers: {
        "Accept": "application/json"
      },
      body: data
    }, callback);
  }
  catch (e) {
    callback(e);
  }
};

/******************************************************************************************
 * Exports all campaigns and QR Codes.
 * @param options    Object with arguments: format, ext
 * @param callback   function(error, result)
 ******************************************************************************************/
Esponce.prototype.export = function(options, callback) {
  var self = this;
  
  if (typeof callback != "function") {
    callback = function(error, result) { };
  }
  
  try {
    var query = { auth: self.options.auth };
    
    if (typeof query.auth == "undefined") {
      throw new Error("API key is missing!");
    }
    
    if (typeof query.auth != "string") {
      throw new Error("API key should be a string!");
    }
    
    if (typeof options == "undefined") {
      throw new Error("Argument 'options' is missing!")
    }
    
    var ext = options.ext || "csv";
    
    var query = {
      format: options.format,
      auth: self.options.auth
    };
    
    self.request({
      method: "GET",
      route: "api/v3/track/export." + ext + query.toQueryString()
    }, callback);
  }
  catch (e) {
    callback(e);
  }
};

/******************************************************************************************
 * Export
 ******************************************************************************************/
if (typeof exports === 'object') {
  //node.js
  module.exports = Esponce;
}
else if (typeof define === 'function' && define.amd) {
  //amd
  define(function () {
    return Esponce;
  });
}
else {
  //Web browser
  global.Esponce = Esponce;
}
}(this));