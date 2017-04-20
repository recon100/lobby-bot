const test = require('ava');
const td = require('testdouble');
const superagent = require('superagent');
const routes = require('../../routes').routes();

td.replace(superagent, 'get');

test.beforeEach(t => {
	t.context = {
		models: {
			SlackOAuthSession: td.constructor(['save']),
			SlackApplication: {
				findById: td.function()
			}
		},
		redirect: td.function(),
		throw: td.function()
	};
});

test('GET /slack/oauth2/callback should complete oauth2 flow', async t => {
	const {context} = t;
	context.method = 'GET';
	context.path = '/slack/id/oauth2/callback';
	context.request = {
		host: 'localhost',
		query: {code: '123'}
	};
	const query = {
		query: td.function()
	};
	td.when(superagent.get('https://slack.com/api/oauth.access')).thenReturn(query);
	td.when(query.query({
		client_id: 'clientId',
		client_secret: 'clientSecret',
		code: '123',
		redirect_uri: 'https://localhost/slack/id/oauth2/callback'
	})).thenResolve({body: {auth: 'test'}});
	td.when(context.redirect('/catapult/auth?sid=sessionId')).thenReturn();
	td.when(context.models.SlackOAuthSession.prototype.save()).thenDo(function () {
		this.id = 'sessionId';
		return Promise.resolve();
	});
	td.when(t.context.models.SlackApplication.findById('id')).thenResolve({
		clientId: 'clientId',
		clientSecret: 'clientSecret',
		verificationToken: 'token'
	});
	await routes(context, null);
	t.pass();
});

test('GET /slack/oauth2/callback should fail if request to Slack failed', async t => {
	const {context} = t;
	context.method = 'GET';
	context.path = '/slack/id1/oauth2/callback';
	context.request = {
		host: 'localhost',
		query: {code: '123'}
	};
	const query = {
		query: td.function()
	};
	td.when(superagent.get('https://slack.com/api/oauth.access')).thenReturn(query);
	td.when(query.query(td.matchers.anything())).thenResolve({body: {error: 'error'}});
	td.when(context.throw(400, 'error')).thenReturn();
	td.when(t.context.models.SlackApplication.findById('id1')).thenResolve({
		clientId: 'clientId',
		clientSecret: 'clientSecret',
		verificationToken: 'token'
	});
	await routes(context, null);
	t.pass();
});
