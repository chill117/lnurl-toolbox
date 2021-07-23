const crypto = require('crypto');
const path = require('path');

// Optionally define environment variables by placing a .env file in the root of the project directory.
// For details:
// https://github.com/motdotla/dotenv#usage
require('dotenv').config();

let config = {
	lnurl: {
		host: process.env.LNURL_TOOLBOX_HOST || '0.0.0.0',
		port: parseInt(process.env.LNURL_TOOLBOX_PORT || 3000),
		url: process.env.LNURL_TOOLBOX_URL || null,
		endpoint: process.env.LNURL_TOOLBOX_ENDPOINT || '/u',
		lightning: {
			backend: 'dummy',
			config: {},
		},
		store: {
			backend: 'memory',
			config: { noWarning: true },
		},
	},
	web: {
		host: process.env.LNURL_TOOLBOX_WEB_HOST || '0.0.0.0',
		port: parseInt(process.env.LNURL_TOOLBOX_WEB_PORT || 8080),
		url: process.env.LNURL_TOOLBOX_WEB_URL || null,
		session: JSON.parse(process.env.LNURL_TOOLBOX_WEB_SESSION || '{"secret":"","resave":true,"saveUninitialized":false,"proxy":false,"cookie":{"httpOnly":true,"expires":false,"path":"/","sameSite":true,"secure":false}}'),
	},
	uriSchemaPrefix: process.env.LNURL_TOOLBOX_URI_SCHEMA_PREFIX || 'LIGHTNING:',
	mock: {
		clightning: {
			host: process.env.LNURL_TOOLBOX_MOCK_CLIGHTNING_HOST || '0.0.0.0',
			port: parseInt(process.env.LNURL_TOOLBOX_MOCK_CLIGHTNING_PORT || 9735),
			hostname: process.env.LNURL_TOOLBOX_MOCK_CLIGHTNING_HOSTNAME || null,
		},
	},
};

if (!config.lnurl.url) {
	const { endpoint, host, port } = config.lnurl;
	config.lnurl.url = `http://${host}:${port}`;
}

if (!config.web.session) {
	config.web.session = {};
}

if (!config.web.session.secret) {
	config.web.session.secret = crypto.randomBytes(32).toString('hex');
}

module.exports = config;
