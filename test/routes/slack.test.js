const test = require('ava');
const td = require('testdouble');
const routes = require('../../routes').routes();

test.beforeEach(t => {
	t.context = {
		models: {
			SlackApplication: td.constructor(['save'])
		}
	};
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
	td.when(t.context.models.SlackApplication.prototype.save()).thenDo(function () {
		this.id = 'id';
		return Promise.resolve();
	});
	await routes(context, null);
	t.is(context.body.id, 'id');
});
