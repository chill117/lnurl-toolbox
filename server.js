const _ = require('underscore');
const bodyParser = require('body-parser');
const express = require('express');
const http = require('http');
const lnurl = require('lnurl');
const { HttpError } = lnurl.Server;
const path = require('path');
const session = require('express-session');
const WebSocket = require('ws');

const config = require('./config.json');

const mockLightningBackend = (function() {
	const { backend } = config.lnurl.lightning;
	const options = config.lnurl.lightning.config;
	const MockLightningNode = require(path.join(__dirname, 'mocks', backend));
	return new MockLightningNode(options, function(error) {
		if (error) {
			console.error(error);
		} else {
			console.log(`Mock ${backend} is ready`);
		}
	});
})();

config.lnurl.lightning.config = mockLightningBackend.config;

/*
	For a list of possible options, see:
	https://github.com/chill117/lnurl-node#options-for-createserver-method
*/
const lnurlServer = lnurl.createServer(config.lnurl);

lnurlServer.once('listening', function() {
	const { host, port, protocol } = lnurlServer.options;
	console.log(`Lnurl server listening at ${protocol}://${host}:${port}`);
});

const webApp = express();

if (!config.web.session.secret) {
	config.web.session.secret = lnurlServer.generateRandomKey(32, 'base64');
}

// Sessions middleware - to separate requests by session and provide real-time updates.
const sessionParser = session(config.web.session);
webApp.use(sessionParser);

// Parse application/x-www-form-urlencoded:
webApp.use(bodyParser.urlencoded({ extended: false }));

// Expose the public/ directory via HTTP server:
webApp.use(express.static('public'));

const tagParams = {
	channelRequest: ['localAmt', 'pushAmt'],
	withdrawRequest: ['minWithdrawable', 'maxWithdrawable', 'defaultDescription'],
	payRequest: ['minSendable', 'maxSendable', 'metadata'],
	login: [],
};

webApp.use('*', function(req, res, next) {
	req.session.lnurls = req.session.lnurls || {};
	next();
});

let map = {
	session: new Map(),
	ws: new Map(),
};

webApp.get('/lnurls', function(req, res, next) {
	const lnurls = _.mapObject(req.session.lnurls, function(item) {
		return item.encoded;
	});
	res.json(lnurls);
});

webApp.post('/lnurl',
	function(req, res, next) {
		if (!req.body.tag) {
			return next(new HttpError('Missing required field: "tag"', 400));
		}
		const { tag } = req.body;
		if (!lnurlServer.hasSubProtocol(req.body.tag)) {
			return next(new HttpError(`Unsupported tag: "${tag}"`, 400));
		}
		next();
	},
	function(req, res, next) {
		const { tag } = req.body;
		const lastLnurl = req.session.lnurls[tag] || null;
		if (!lastLnurl) return next();
		const { hash } = lastLnurl;
		map.session.delete(hash);
		lnurlServer.markUsedUrl(hash).then(function() {
			next();
		}).catch(next);
	},
	function(req, res, next) {
		const { tag } = req.body;
		const params = _.pick(req.body, tagParams[tag]);
		lnurlServer.generateNewUrl(tag, params).then(result => {
			const { encoded, secret, url } = result;
			const hash = lnurlServer.hash(secret);
			req.session.lnurls[tag] = { encoded, hash };
			map.session.set(hash, req.session);
			res.send(encoded);
		}).catch(next);
	}
);

webApp.use('*', function(req, res, next) {
	next(new HttpError('Not Found', 404));
});

webApp.use(function(error, req, res, next) {
	if (!error.status) {
		console.error(error);
		error = new Error('Unexpected error');
		error.status = 500;
	}
	res.status(error.status).send(error.message);
});

webApp.server = http.createServer(webApp);
webApp.wss = new WebSocket.Server({ clientTracking: false, noServer: true });

webApp.server.on('upgrade', function(req, socket, head) {
	sessionParser(req, {}, function() {
		if (!req.session.id) {
			socket.destroy();
			return;
		}
		webApp.wss.handleUpgrade(req, socket, head, function(ws) {
			webApp.wss.emit('connection', ws, req);
		});
	});
});

webApp.wss.on('connection', function(ws, req) {
	map.ws.set(req.session.id, ws);
	ws.on('close', function() {
		map.ws.delete(req.session.id);
	});
});

webApp.server.listen(config.web.port, config.web.host, function() {
	const { host, port } = config.web;
	console.log(`Web server listening at http://${host}:${port}`);
});

_.each([
	'request:received',
	'request:processing',
	'request:processed',
	'request:failed',
	'login',
], function(event) {
	lnurlServer.on(event, function(data) {
		try {
			const { hash } = data;
			const session = map.session.get(hash);
			if (!session) return;
			const ws = map.ws.get(session.id);
			if (!ws) return;
			const tag = _.findKey(session.lnurls, function(item) {
				return item.hash === hash;
			});
			if (!tag) return;
			const req = data.req || null
			data = _.omit(data, 'hash', 'req');
			if (req) {
				data = _.extend({}, data, _.pick(req, 'headers', 'query', 'url'));
			}
			ws.send(JSON.stringify({ data, event, tag }));
		} catch (error) {
			console.error(error);
		}
	});
});

process.on('uncaughtException', (error, origin) => {
	console.error(error);
});

process.on('beforeExit', (code) => {
	try {
		webApp.server.close();
		lnurlServer.close();
		mockLightningBackend.close();
	} catch (error) {
		console.error(error);
	}
	process.exit(code);
});
