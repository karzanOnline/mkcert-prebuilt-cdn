'use strict';

if (process.platform !== 'darwin' && process.platform !== 'linux' && process.platform !== 'win32') {
	const platformName = require('platform-name');

	console.error(`Prebuilt mkcert binaries are only provided for Linux, macOS and Windows, not for ${
		platformName()
	}.`);
	process.exit(1);
}

const arch = require('arch');

if (arch() !== 'x64') {
	console.error('mkcert doesn\'t support non 64 bit architectures.');
	process.exit(1);
}

const {basename} = require('path');
const {pipeline} = require('stream');
const {promisify} = require('util');
const loadFromCwdOrNpm = require('load-from-cwd-or-npm');
const rejectUnsatisfiedNpmVersion = require('reject-unsatisfied-npm-version');
const {bin: {mkcert: binName}, name, version: pkgVersion} = require('./package.json');

const version = basename(binName, '.bin');
// const url = `https://github.com/shinnn/${name}/releases/download/v${pkgVersion}/${
// 	version
// }-${process.platform}.tgz`;

const platFormTgzMap = {
	darwin: 'https://gw.alipayobjects.com/os/fliggy-play/0465d36f-6214-405a-8af0-753f7a07a85c/1.2.0-darwin.tgz',
	linux: 'https://gw.alipayobjects.com/os/fliggy-play/e7f9667a-c217-48d6-ab8e-8ee5ae9759b0/1.2.0-linux.tgz',
	win32: 'https://gw.alipayobjects.com/os/fliggy-play/c7fe9621-3210-4a40-bbfd-0cd258cac89a/1.2.0-win32.tgz'
}

const envKeys = Object.keys(process.env);

function caseInsensitivelyEqual(val) {
	return key => key.toUpperCase() === val;
}

for (const [config, npmConfig] of new Map([
	['HTTP_PROXY', 'NPM_CONFIG_HTTP_PROXY'],
	['HTTPS_PROXY', 'NPM_CONFIG_HTTPS_PROXY'],
	['NO_PROXY', 'NPM_CONFIG_NOPROXY']
])) {
	const foundNpmConfigKey = envKeys.find(caseInsensitivelyEqual(npmConfig));

	if (foundNpmConfigKey && !envKeys.some(caseInsensitivelyEqual(config))) {
		process.env[config] = process.env[foundNpmConfigKey];
	}
}

(async () => {
	try {
		const [request, {Unpack}] = await Promise.all([
			loadFromCwdOrNpm('request'),
			loadFromCwdOrNpm('tar'),
			rejectUnsatisfiedNpmVersion('6.5.0')
		]);

		const url = platFormTgzMap[`${process.platform}`]

		if (!url) {
			console.error('识别不到当前platForm，请联系@自羽排查!')
			return false
		}

		await promisify(pipeline)(request({
			url,
			// headers: {
			// 	'user-agent': `${name}/${pkgVersion}`
			// }
		}).on('response', function({statusCode, statusMessage}) {
			if (statusCode === 200) {
				return;
			}

			this.emit('error', new Error(`Failed to download an archive from ${url} (${statusCode} ${statusMessage})`));
		}), new Unpack({strict: true}));

	} catch ({stack}) {
		console.error(stack);
		process.exit(1);
	}
})();
