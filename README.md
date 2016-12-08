# LedNet

[![Dependency Status](https://david-dm.org/danielesteban/LedNet.svg)](https://david-dm.org/danielesteban/LedNet) [![devDependency Status](https://david-dm.org/danielesteban/LedNet/dev-status.svg)](https://david-dm.org/danielesteban/LedNet?type=dev)

> A centralized network of pixels

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

## App server:

* Edit server config in: [server/Config.js](server/Config.js)
* Install dependencies: `npm install`
* Run server: `npm start`

## Firmware:

* Edit server/hardware config in: [firmware/src/config.h](firmware/src/config.h)
* Flash the ESP-01: `cd firmware && platformio run`
* Upload the SPIFFS: `platformio run --target=uploadfs`

---

### License:

The MIT License (MIT)

Copyright (c) 2016 Daniel Esteban Nombela

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
