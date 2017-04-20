const test = require('ava');
const td = require('testdouble');
const routes = require('../../routes').routes();

test.beforeEach(t => {
	t.context = {
		models: {
			SlackApplication: td.constructor(['save'])
		}
	};
	t.context.models.SlackApplication.findById = td.function();
});

test('POST /slack should save slack auth data', async t => {
	const {context} = t;
	context.method = 'POST';
	context.path = '/slack/id/verificationToken';
	context.request = {
		body: {
			verificationToken: 'token'
		}
	};
	const app = {};
	td.when(t.context.models.SlackApplication.findById('id')).thenResolve(app);
	td.when(t.context.models.SlackApplication.prototype.save()).thenResolve();
	await routes(context, null);
	t.is(app.verificationToken, 'token');
});
