const test = require('ava');
const td = require('testdouble');
const routes = require('../../routes').routes();

test.beforeEach(t => {
	t.context = {
		models: {
			Application: {
				findOne: td.function()
			}
		},
		render: td.function(),
		cookies: {
			get: td.function()
		},
		throw: td.function()
	};
});

test('GET / should show page with phone number data', async t => {
	const {context} = t;
	context.method = 'GET';
	context.path = '/';
	td.when(context.cookies.get('teamId', {signed: true})).thenReturn('teamId1');
	td.when(context.models.Application.findOne({'slack.teamId': 'teamId1'})).thenResolve({
		slack: {
			token: 'accessToken',
			teamName: 'teamName',
			teamId: 'teamId1',
			incomingWebhookUrl: 'url',
			channel: 'channel'
		},
		catapult:	{
			userId: 'userId',
			apiToken: 'token',
			apiSecret: 'secret',
			applicationId: 'appId1',
			phoneNumber: '+1134567891'
		},
		host: 'localhost'
	});
	td.when(context.render('index', {
		title: 'Phone number',
		phoneNumber: '+1134567891',
		channel: 'channel'
	})).thenResolve();
	await routes(t.context, null);
	t.pass();
});

test('should return 404 if application is not exist', async t => {
	const {context} = t;
	context.method = 'GET';
	context.path = '/';
	td.when(context.cookies.get('teamId', {signed: true})).thenReturn('teamId2');
	td.when(context.models.Application.findOne({'slack.teamId': 'teamId2'})).thenResolve(null);
	td.when(context.throw(404)).thenReturn();
	await routes(context, null);
	t.pass();
});

test('should return 404 if cookie is not exist', async t => {
	const {context} = t;
	context.method = 'GET';
	context.path = '/';
	td.when(context.cookies.get('teamId', {signed: true})).thenReturn(null);
	td.when(context.throw(404)).thenReturn();
	await routes(context, null);
	t.pass();
});
