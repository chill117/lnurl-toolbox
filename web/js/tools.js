var app = app || {};

$(function() {

	$('.tool form').on('submit', function(event) {
		event.preventDefault();
		var tag = $(event.target).find(':input[name=tag]').val() || null;
		if (tag) {
			generateNewLnurl(tag);
		}
	});

	$('.tool .copy').on('click', function(event) {
		var $qrcode = $(event.target).parents('.tool').first().find('.qrcode');
		var encoded = $qrcode.attr('data-encoded');
		if (encoded) {
			app.utils.copyToClipboard(encoded, function onSuccess() {
				var $copied = $qrcode.siblings('.copied').first();
				if ($copied.length === 0) {
					$copied = $('<div/>').addClass('copied');
					$('<b/>').text('Copied!').appendTo($copied);
					$copied.insertBefore($qrcode);
				}
				$copied.addClass('visible');
				setTimeout(function() {
					$copied.removeClass('visible');
					setTimeout(function() {
						$copied.remove();
					}, 350);
				}, 1700);
			});
		}
	});

	try {
		var ws = app.ws = (function() {
			var protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
			var url = protocol + '//' + location.host;
			return new WebSocket(url);
		})();
		ws.onerror = function(error) {
			console.log('WebSocket ERROR', error);
		};
		ws.onopen = function() {
			console.log('WebSocket connection established');
		};
		ws.onclose = function() {
			console.log('WebSocket connection closed');
			ws = app.ws = null;
		};
		ws.onmessage = function(message) {
			try {
				console.log('WebSocket data received:', message.data);
				var messageData = JSON.parse(message.data);
				var eventName = messageData.event || null;
				if (!eventName) return;
				var tag = messageData.tag || null;
				if (!tag) return;
				var $tool = $('.tool.' + tag);
				var $qrcode = $tool.find('.qrcode');
				$qrcode.removeClass('loading').removeClass('loaded');
				var message = eventName;
				var data = messageData.data || {};
				var className;
				switch (eventName) {
					case 'request:failed':
						className = 'info error';
						break;
					case 'request:processed':
					case 'login':
						className = 'info success';
						break;
					default:
						className = 'info';
						break;
				}
				addTagEvent(tag, message, data, className);
			} catch (error) {
				console.log(error);
			}
		};
	} catch (error) {
		console.log(error);
	}

	$.get('/lnurls')
		.done(function(lnurls) {
			$('.tool').each(function() {
				var $tool = $(this);
				var tag = $tool.attr('data-tag');
				if (tag) {
					var encoded = lnurls[tag] || null;
					if (encoded) {
						var $qrcode = $tool.find('.qrcode');
						var data = 'lightning:' + encoded;
						$qrcode.attr('href', data);
						app.utils.renderQrCode($qrcode, data, function(error) {
							if (error) {
								showTagError(tag, error);
							} else {
								$qrcode.addClass('loaded');
								$qrcode.attr('data-encoded', encoded);
							}
						});
					} else {
						generateNewLnurl(tag);
					}
				}
			});
		})
		.fail(app.utils.showGeneralError);

	var generateNewLnurl = function(tag) {
		var $tool = $('.tool.' + tag);
		var $qrcode = $tool.find('.qrcode');
		var $form = $tool.find('form');
		var data;
		if ($form.length > 0) {
			data = $form.serializeJSON();
		} else {
			data = { tag: tag };
		}
		var done = function(error) {
			$qrcode.removeClass('loading').addClass('loaded');
			if (error) showTagError(tag, error);
		};
		$qrcode
			.removeClass('loaded')
			.addClass('loading')
			.attr('href', '#')
			.attr('data-encoded', '')
			.css({ 'background-image': 'none' });
		clearTagEvents(tag);
		$.post('/lnurl', data)
			.done(function(encoded) {
				var data = 'lightning:' + encoded;
				$qrcode.attr('href', data);
				app.utils.renderQrCode($qrcode, data, function(error) {
					if (error) return done(error);
					$qrcode.attr('data-encoded', encoded);
					done();
				});
			})
			.fail(function(error) {
				showTagError(tag, error);
			});
	};

	var clearTagEvents = function(tag) {
		var $tool = $('.tool.' + tag);
		var $events = $tool.find('.events');
		$events.empty();
	};

	var addTagEvent = function(tag, message, eventData, extraClassName) {
		var $tool = $('.tool.' + tag);
		var $events = $tool.find('.events');
		var $newEvent = $('<div/>').addClass('event').text(message);
		if (extraClassName) {
			$newEvent.addClass(extraClassName);
		}
		if (eventData) {
			$newEvent.attr('data-event', JSON.stringify(eventData));
		}
		$newEvent.appendTo($events);
		_.defer(function() {
			$newEvent.addClass('visible');
		});
		$newEvent.on('click', function(event) {
			var $target = $(event.target);
			var eventData = $target.attr('data-event');
			_.defer(showEventDetails, eventData);
		});
	};

	var showEventDetails = function(eventData) {
		eventData = eventData || {};
		var message = JSON.stringify(JSON.parse(eventData), null, 4/* indent */);
		var $message = $('<textarea/>', {
			rows: (message.match(/\n/g) || []).length + 2,
		});
		$message.text(message);
		app.utils.showMessage($message);
	};

	var showTagError = function(tag, error) {
		var message = app.utils.normalizeErrorMessage(error);
		addTagEvent(tag, message, null, 'error');
	};

	var resizeQrCodeElements = function() {
		var maxSizes = [];
		$qrcodes = $('#toolbox .qrcode');
		$qrcodes.each(function() {
			var $qrcode = $(this);
			var $tool = $qrcode.parents('.tool').first();
			var childrenHeight = 0;
			$tool.children(':not(.tool-status)').each(function() {
				childrenHeight += $(this).outerHeight();
			});
			var constraints = [
				$tool.innerWidth() * .8,
				$(window).height() * .8,
			];
			if ($(window).width() > 1024) {
				constraints.push($('#toolbox .wrap').innerHeight() - childrenHeight);
			}
			maxSizes.push(Math.min.apply(Math, constraints));
		});
		var maxSize = Math.min.apply(Math, maxSizes);
		$qrcodes.width(maxSize).height(maxSize);
	};

	resizeQrCodeElements();

	$(window).on('resize', _.debounce(function() {
		resizeQrCodeElements();
		$('#toolbox .qrcode').each(function() {
			var $qrcode = $(this);
			var data = $qrcode.attr('data-encoded');
			app.utils.renderQrCode($qrcode, data);
		})
	}, 150));

});
