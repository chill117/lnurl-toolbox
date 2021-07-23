var app = app || {};

app.utils = (function() {

	var renderQrCode = function($target, data, done) {
		// https://github.com/soldair/node-qrcode#usage
		var options = {
			width: $target.width(),
			margin: 1,
			errorCorrectionLevel: 'L',
			type: 'image/png',
		};
		data = data.trim();
		QRCode.toDataURL(data, options, function(error, dataUri) {
			if (error) return done(error);
			window.requestAnimationFrame(function() {
				$target.css({
					'background-image': 'url(' + dataUri + ')',
					'background-size': options.width + 'px',
				});
				done();
			});
		});
	};

	var copyToClipboard = function(text, onSuccess, onError) {
		if (navigator.clipboard) {
			onSuccess = onSuccess || _.noop;
			onError = onError || _.noop;
			navigator.clipboard.writeText(text).then(onSuccess, onError);
		}
	};

	var showMessage = function(text) {
		var $content = $('#message-content').empty();
		if (text instanceof jQuery) {
			text.appendTo($content);
		} else {
			$content.text(text);
		}
		$('#message').addClass('visible');
	};

	$(document).on('click', function(event) {
		var $target = $(event.target);
		var isMessageContentEl = $target[0] === $('#message-content')[0] || $target.parents('#message-content').length !== 0;
		if (!isMessageContentEl) {
			$('#message').removeClass('visible');
		}
	});

	var showGeneralError = function(error) {
		var message = normalizeErrorMessage(error);
		showMessage(message);
	};

	var normalizeErrorMessage = function(error) {
		var message;
		if (_.isString(error)) {
			message = error;
		} else if (error.message) {
			message = error.message;
		} else {
			if (error.status === 0) {
				message = 'Service unreachable. Is your internet connection working?';
			} else {
				message = error.responseText || '';
			}
		}
		return message;
	};

	return {
		copyToClipboard: copyToClipboard,
		showMessage: showMessage,
		showGeneralError: showGeneralError,
		normalizeErrorMessage: normalizeErrorMessage,
		renderQrCode: renderQrCode,
	};

})();

// Polyfills
if (!String.prototype.trim) {
	String.prototype.trim = function () {
		return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
	};
}

(function() {

	jQuery.fn.serializeJSON = function() {
		var json = {};
		var nameRegex = /^([a-zA-Z0-9]+)\[([a-zA-Z0-9]*)\]$/;
		jQuery.map(jQuery(this).serializeArray(), function(field) {
			var name = field['name'];
			var value = field['value'];
			var match = name.match(nameRegex);
			if (match) {
				name = match[1];
				if (typeof json[name] === 'undefined') {
					json[name] = match[2] ? {} : [];
				}
			}
			if (match) {
				if (match[2] && !isArray(json[name])) {
					json[name][match[2]] = value;
				} else if (isArray(json[name])) {
					json[name].push(value);
				}
			} else {
				json[name] = value;
			}
		});
		return json;
	};

	var isArray = function(object) {
		return Object.prototype.toString.call(object);
	};

})();

