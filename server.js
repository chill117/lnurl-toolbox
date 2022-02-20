const _ = require('underscore');
const bodyParser = require('body-parser');
const debug = {
	error: require('debug')('lnurl-toolbox:error'),
	info: require('debug')('lnurl-toolbox:info'),
}
const express = require('express');
const Handlebars = require('express-handlebars');
const http = require('http');
const lnurl = require('lnurl');
const { createHash, HttpError } = require('lnurl/lib');
const Mock = {
	clightning: require('./lib/mocks/c-lightning'),
};
const path = require('path');
const pkg = require('./package.json');
const session = require('express-session');
const WebSocket = require('ws');

/*
	For a list of possible options, see:
	https://github.com/chill117/lnurl-node#options-for-createserver-method
*/
const config = require('./config');
const lnurlServer = lnurl.createServer(config.lnurl);

const webApp = express();

const viewsDir = path.join(__dirname, 'views');

const hbs = Handlebars.create({
	defaultLayout: 'main',
	extname: '.html',
	partialsDir: [
		path.join(viewsDir, 'partials'),
	],
});

webApp.engine('.html', hbs.engine);
webApp.set('view engine', '.html');
webApp.set('views', viewsDir);
webApp.enable('view cache');

// Define custom render method on response object:
webApp.use(function(req, res, next) {
	const render = res.render.bind(res);
	res.render = function(filePath, context) {
		const baseUrl = config.web.url;
		context = _.defaults(context || {}, {
			baseUrl,
			canonicalUrl: baseUrl + req.url,
			headExtraHtml: config.web.headExtraHtml || null,
			layout: 'main',
			template: filePath,
			uriSchemaPrefix: config.uriSchemaPrefix,
			version: pkg.version,
		});
		// Do NOT use a callback with render here.
		// For details, see:
		// https://expressjs.com/en/4x/api.html#res.render
		render(filePath, context);
	};
	next();
});

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
		lnurlServer.useUrl(hash).then(function() {
			next();
		}).catch(next);
	},
	function(req, res, next) {
		const { tag } = req.body;
		const params = _.pick(req.body, tagParams[tag]);
		lnurlServer.generateNewUrl(tag, params).then(result => {
			let { encoded, secret, url } = result;
			const hash = createHash(secret);
			encoded = encoded.toUpperCase();
			req.session.lnurls[tag] = { encoded, hash };
			map.session.set(hash, req.session);
			res.send(encoded);
		}).catch(next);
	}
);

webApp.get('/', function(req, res, next) {
	res.render('index');
});

webApp.use('*', function(req, res, next) {
	next(new HttpError('Not Found', 404));
});

webApp.use(function(error, req, res, next) {
	if (!error.status) {
		debug.error(error);
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
	debug.info(`Web server listening at http://${host}:${port}`);
});

_.each([
	'request:received',
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
			debug.error(error);
		}
	});
});

_.chain(tagParams).keys().each(tag => {
	_.each([
		`${tag}:action:failed`,
		`${tag}:action:processed`,
	], event => {
		lnurlServer.on(event, data => {
			const { secret } = data;
			const hash = createHash(secret);
			const session = map.session.get(hash);
			if (!session) return;
			const ws = map.ws.get(session.id);
			if (!ws) return;
			ws.send(JSON.stringify({ data, event, tag }));
		});
	});
});

const clightningMock = new Mock.clightning(config.mock.clightning);

clightningMock.interfaces.events.on('jsonRpc:message', message => {
	const data = { message };
	const event = 'mock:c-lightning:message';
	const tag = 'channelRequest';
	ws.send(JSON.stringify({ data, event, tag }));
});

process.on('uncaughtException', (error, origin) => {
	debug.error(error);
});

process.on('beforeExit', (code) => {
	try {
		webApp.server.close();
		lnurlServer.close();
		clightningMock && clightningMock.close();
	} catch (error) {
		debug.error(error);
	}
	process.exit(code);
});
