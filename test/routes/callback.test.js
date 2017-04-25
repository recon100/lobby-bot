const test = require('ava');
const td = require('testdouble');
const routes = require('../../routes').routes();

test.beforeEach(t => {
	t.context = {
		models: {
			SlackOAuthSession: {
				findById: td.function()
			},
			Application: {
				findOne: td.function(),
				findById: td.function()
			}
		},
		render: td.function(),
		redirect: td.function(),
		cookies: {
			set: td.function()
		}
	};
});

test('POST /callback should handle incoming SMS', async t => {
	const {context} = t;
	context.method = 'POST';
	context.path = '/callback';
	context.request = {
		body: {
			eventType: 'sms',
			direction: 'in',
			from: '+1234567890',
			to: '+1234567891',
			text: 'Hello'
		}
	};
	const mockApp = {
		sendMessageToSlack: td.function()
	};
	td.when(context.models.Application.findOne({'catapult.phoneNumber': '+1234567891'})).thenResolve(mockApp);
	td.when(mockApp.sendMessageToSlack({
		attachment_type: 'default',
		attachments: [{text: 'Hello'}],
		mrkdwn: true,
		text: '_+1234567890:_'
	})).thenResolve();
	await routes(context, null);
	t.pass();
});

test('POST /callback should do nothing if application is not found', async t => {
	const {context} = t;
	context.method = 'POST';
	context.path = '/callback';
	context.request = {
		body: {
			eventType: 'sms',
			direction: 'in',
			from: '+1234567891',
			to: '+1234567892',
			text: 'Hello'
		}
	};
	td.when(context.models.Application.findOne({'catapult.phoneNumber': '+1234567891'})).thenResolve(null);
	await routes(context, null);
	t.pass();
});

test.serial('POST /callback should handle incoming calls to service number', async t => {
	const {context} = t;
	context.method = 'POST';
	context.path = '/callback';
	context.request = {
		body: {
			eventType: 'answer',
			from: '+1234567890',
			to: '+1234567891',
			callId: 'callId'
		}
	};
	const mockApp = {
		id: 'applicationId',
		getCatapult: td.function()
	};
	const mockCall = {
		playAudioAdvanced: td.function()
	};
	td.when(context.models.Application.findOne({'catapult.phoneNumber': '+1234567891'})).thenResolve(mockApp);
	td.when(mockApp.getCatapult()).thenReturn({Call: mockCall});
	td.when(mockCall.playAudioAdvanced('callId', td.matchers.contains({tag: 'applicationId'}))).thenResolve();
	await routes(context, null);
	t.pass();
});

test.serial('POST /callback should transfer incoming calls if need', async t => {
	const {context} = t;
	context.method = 'POST';
	context.path = '/callback';
	context.request = {
		body: {
			eventType: 'answer',
			from: '+1234567890',
			to: '+1234567892',
			callId: 'callId'
		}
	};
	const mockApp = {
		id: 'applicationId',
		getCatapult: td.function()
	};
	const mockCall = {
		transfer: td.function()
	};
	td.when(context.models.Application.findOne({'catapult.phoneNumber': '+1234567892'})).thenResolve(mockApp);
	td.when(mockApp.getCatapult()).thenReturn({Call: mockCall});
	td.when(mockCall.transfer('callId', {transferTo: '+1234567800'})).thenResolve();
	try {
		process.env.NUMBER_TO_TRANSFER = '+1234567800';
		await routes(context, null);
	} finally {
		process.env.NUMBER_TO_TRANSFER = null;
	}
	t.pass();
});

test('POST /callback should hang up incoming calls to service number', async t => {
	const {context} = t;
	context.method = 'POST';
	context.path = '/callback';
	context.request = {
		body: {
			eventType: 'speak',
			status: 'done',
			tag: 'applicationId',
			callId: 'callId'
		}
	};
	const mockApp = {
		getCatapult: td.function()
	};
	const mockCall = {
		hangup: td.function()
	};
	td.when(context.models.Application.findById('applicationId')).thenResolve(mockApp);
	td.when(mockApp.getCatapult()).thenReturn({Call: mockCall});
	td.when(mockCall.hangup('callId')).thenResolve();
	await routes(context, null);
	t.pass();
});

test('POST /callback should do nothing for other events', async t => {
	const {context} = t;
	context.method = 'POST';
	context.path = '/callback';
	context.request = {
		body: {
			eventType: 'test',
			from: '+1234567890',
			to: '+1234567891'
		}
	};
	await routes(context, null);
	t.pass();
});

test('POST /callback should handle errors', async t => {
	const {context} = t;
	context.method = 'POST';
	context.path = '/callback';
	context.request = {
		body: {
			eventType: 'sms',
			direction: 'in',
			from: '+1234567890',
			to: '+1234567891',
			text: 'Hello'
		}
	};
	td.when(context.models.Application.findOne({'catapult.phoneNumber': '+1234567891'})).thenReject(new Error('error'));
	await routes(context, null);
	t.pass();
});
