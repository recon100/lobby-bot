const test = require('ava');
const td = require('testdouble');
const routes = require('../../routes').routes();

test.beforeEach(t => {
	t.context = {
		models: {
			SlackApplication: td.constructor(['save'])
		}
	};
	t.context.models.SlackApplication.findOne = td.function();
});

test('POST /slack should save slack auth data', async t => {
	const {context} = t;
	context.method = 'POST';
	context.path = '/slack';
	context.request = {
		body: {
			clientId: 'clientId',
			clientSecret: 'clientSecret'
		}
	};
	td.when(t.context.models.SlackApplication.findOne({clientId: 'clientId'})).thenResolve(null);
	td.when(t.context.models.SlackApplication.prototype.save()).thenDo(function () {
		this.id = 'id';
		return Promise.resolve();
	});
	await routes(context, null);
	t.is(context.body.id, 'id');
});

test('POST /slack should update existing slack auth data', async t => {
	const {context} = t;
	context.method = 'POST';
	context.path = '/slack';
	context.request = {
		body: {
			clientId: 'clientId',
			clientSecret: 'clientSecret'
		}
	};
	const mockApp = {
		id: 'id',
		clientId: 'clientId',
		save: td.function()
	};
	td.when(t.context.models.SlackApplication.findOne({clientId: 'clientId'})).thenResolve(mockApp);
	td.when(mockApp.save()).thenResolve();
	await routes(context, null);
	t.is(mockApp.clientSecret, 'clientSecret');
	t.is(context.body.id, 'id');
});
