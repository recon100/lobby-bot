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
				createApplication: td.function()
			}
		},
		render: td.function(),
		redirect: td.function(),
		cookies: {
			set: td.function()
		}
	};
});

test('GET /catapult/auth should show page with catapult auth data editor', async t => {
	const {context} = t;
	context.method = 'GET';
	context.path = '/catapult/auth';
	td.when(context.models.SlackOAuthSession.findById('sessionId11')).thenResolve({
		data: {}
	});
	context.request = {
		host: 'localhost',
		query: {sid: 'sessionId11'}
	};
	td.when(context.render('catapultAuth', {title: 'Authorization', formData: {sid: 'sessionId11'}})).thenResolve();
	await routes(context, null);
	t.pass();
});

test('POST /catapult/auth should save application data', async t => {
	const {context} = t;
	context.method = 'POST';
	context.path = '/catapult/auth';
	td.when(context.models.SlackOAuthSession.findById('sessionId')).thenResolve({
		data: {slackAuth: 'data'}
	});
	context.request = {
		host: 'localhost',
		query: {},
		body: {
			sid: 'sessionId',
			userId: 'userId',
			apiToken: 'apiToken',
			apiSecret: 'apiSecret'
		}
	};
	td.when(context.redirect('/')).thenReturn();
	td.when(context.cookies.set('teamId', 'teamId', {signed: true})).thenReturn();
	td.when(context.models.Application.createApplication('localhost', 'userId', 'apiToken', 'apiSecret', {slackAuth: 'data'})).thenResolve({
		slack: {teamId: 'teamId'}
	});
	await routes(context, null);
	t.pass();
});

test('POST /catapult/auth should show error data on fail', async t => {
	const {context} = t;
	context.method = 'POST';
	context.path = '/catapult/auth';
	td.when(context.models.SlackOAuthSession.findById('sessionId')).thenResolve({
		data: {slackAuth: 'data'}
	});
	context.request = {
		host: 'localhost',
		query: {},
		body: {
			sid: 'sessionId',
			userId: 'userId',
			apiToken: 'apiToken',
			apiSecret: 'apiSecret'
		}
	};
	td.when(context.models.Application.createApplication(td.matchers.anything())).thenReject(new Error('error'));
	td.when(context.render('catapultAuth', {
		error: 'error',
		formData: {apiSecret: 'apiSecret', apiToken: 'apiToken', sid: 'sessionId', userId: 'userId'},
		title: 'Authorization'
	}));
	await routes(context, null);
	t.pass();
});
