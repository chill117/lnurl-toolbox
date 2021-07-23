# lnurl-toolbox

A web interface with tools for testing and integrating LNURL.

* [Features](#features)
* [Live Demo](#live-demo)
* [Running Your Own Instance](#running-your-own-instance)
	* [Requirements](#requirements)
	* [Setup](#setup)
	* [Configuration Options](#configuration-options)
* [Changelog](#changelog)
* [License](#license)
* [Funding](#funding)


## Features

* Supports all LNURL subprotocols (channelRequest, login, payRequest, withdrawRequest)
* Tweak parameters used for each subprotocol
* Requests and relevant events are displayed as they happen
* Inspect request/event details (HTTP headers, query string, URL, etc)
* Doesn't require a Lightning Network node (everything is mocked)


## Live Demo

An instance of this project is currently running [here](https://lnurl-toolbox.degreesofzero.com/). So if you just want to quickly test your own app's LNURL integration, please feel free to use it. If you would like run your own instance, you can follow the instructions in the rest of this document.


## Running Your Own Instance

### Requirements

* [nodejs](https://nodejs.org/) - For Linux and Mac install node via [nvm](https://github.com/creationix/nvm).
* [make](https://www.gnu.org/software/make/)


### Setup

Clone this repository:
```bash
git clone git@github.com:chill117/lnurl-toolbox.git \
	&& cd lnurl-toolbox
```

Install dependencies:
```bash
npm install
```

Run the toolbox services:
```bash
npm start
```

To run the server while printing debug info:
```bash
DEBUG=lnurl* npm start
```

The server runs with default configurations when none have been provided. To customize your server configuration, create a `.env` file in the root of the project directory. You can start by copying the `example.env` file:
```bash
cp example.env .env
```
Please refer to [Configuration Options](#configuration-options) for details about how to configure your server.


### Configuration Options

Below is a list of configuration options:
* `LNURL_TOOLBOX_HOST` - The host on which the LNURL HTTP server listener will be bound.
* `LNURL_TOOLBOX_PORT` - The port on which the LNURL HTTP server will listen.
* `LNURL_TOOLBOX_URL` - The publicly accessible URL of the LNURL server. This should __not__ include the endpoint. Example - `https://your-domain.com`
* `LNURL_TOOLBOX_ENDPOINT` - The path of the LNURL route. The default is `/u`.
* `LNURL_TOOLBOX_WEB_HOST` - The host on which the web HTTP server listener will be bound.
* `LNURL_TOOLBOX_WEB_PORT` - The port on which the web HTTP server will listen.
* `LNURL_TOOLBOX_WEB_URL` - The publicly accessible URL of the web server. This should __not__ include the endpoint. Example - `https://your-domain.com`
* `LNURL_TOOLBOX_WEB_SESSION` - Options that are passed when creating an instance of [express-session](https://github.com/expressjs/session#options) middleware.
* `LNURL_TOOLBOX_URI_SCHEMA_PREFIX` - The URI schema prefix that is pre-prended to encoded LNURLs. E.g. "lightning:", "LIGHTNING:", or "" (empty-string).


## Changelog

See [CHANGELOG.md](https://github.com/chill117/lnurl-toolbox/blob/master/CHANGELOG.md)


## License

This software is [MIT licensed](https://tldrlegal.com/license/mit-license):
> A short, permissive software license. Basically, you can do whatever you want as long as you include the original copyright and license notice in any copy of the software/source.  There are many variations of this license in use.


## Funding

This project is free and open-source. If you would like to show your appreciation by helping to fund the project's continued development and maintenance, you can find available options [here](https://degreesofzero.com/donate.html?project=lnurl-toolbox).
