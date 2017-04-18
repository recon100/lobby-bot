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
				findOne: td.function()
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

test('POST /callback should do nothing fo other events', async t => {
	const {context} = t;
	context.method = 'POST';
	context.path = '/callback';
	context.request = {
		body: {
			eventType: 'answer',
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
