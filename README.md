## Introduction

Generate QR Codes with [Esponce REST API](https://www.esponce.com/developers). Create campaign and track scans.

## Getting Started

First, create an account and get the API key from [Esponce](https://www.esponce.com/).

Install the package
```bash
npm install esponce
```

Basic usage
```javascript
var esponce = new Esponce({ ... });
esponce.generate("hello world", function(error, result) {
  ...
});
```

## Usage in Node.js

Initialize
```javascript
var Esponce = require('esponce').Esponce;
var esponce = new Esponce({ auth: "YOUR_API_KEY_GOES_HERE" });
```

Generate a QR Code image
```javascript
esponce.generate({ content: "hello world", format: "svg" }, function(error, result) {
  if (error) {
    return console.error(error.message);
  }
  
  var fs = require('fs');
  fs.writeFileSync("qrcode.svg", result.data);
});
```

Note that the QR Code created using `generate` method is not trackable. To create a trackable QR Code use the `createQRCode` method. Trackable means to capture scans and offer usage statistics to the QR Code owner.

Create a trackable QR Code
```javascript
esponce.createQRCode({ name: "QR Code 1", content: "https://esp.to/" }, function(error, result) {
  ...
  console.log(result.data.id);
});
```

Get QR Code scan statistics
```javascript
esponce.getStatistics(id, { format: "csv" }, function(error, result) {
  ...
  console.log(result.data);
});
```

Decode QR Code image to get the content
```javascript
var fs = require('fs');
var image = fs.readFileSync('hello-world.png');
esponce.decode(image, function(error, result) {
  ...
  console.log(result);
});
```

Output:
```javascript
{
  meta:
  {
    apiVersion: '3.0',
    contentType: 'application/json; charset=utf-8',
    contentLength: 87,
    rateLimit:
    {
      total: 3000,
      remaining: 2988,
      reset: 36638652
    }
  },
  data:
  {
    content: 'hello world',
    version: 1,
    ec: 'M',
    dimension: 21,
    capacity: 14,
    length: 11
  }
}
```

<!--
## Usage in a web browser

Reference the library
```html
<script src="dist/esponce.min.js"></script>
```

Initialize in JavaScript
```javascript
var esponce = new Esponce({ auth: "YOUR_API_KEY_GOES_HERE" });
esponce.generate({ content: "hello world", format: "svg" }, function(error, result) {
  if (error) {
    return console.error(error.message);
  }
  
  document.getElementById("container").innerHTML = result;
});
```
-->