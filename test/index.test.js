const test = require('ava');
const mongoose = require('mongoose');
const supertest = require('supertest');
const td = require('testdouble');
const main = require('../index');

test.beforeEach(() => {
	td.replace(mongoose, 'connect');
	td.when(mongoose.connect(td.matchers.anything())).thenResolve();
	process.env.SLACK_CLIENT_ID = 'clientId';
	process.env.SLACK_CLIENT_SECRET = 'clientSecret';
	process.env.SLACK_VERIFICATION_TOKEN = 'token';
});

test.afterEach(() => {
	process.env.SLACK_CLIENT_ID = null;
	process.env.SLACK_CLIENT_SECRET = null;
	process.env.SLACK_VERIFICATION_TOKEN = null;
	td.reset();
});

test('should contains function main', t => {
	t.true(typeof (main) === 'function');
});

test.serial('should run web app', async t => {
	const app = await main();
	await supertest(app.callback()).post('/callback')
		.send({eventType: 'unknown'})
		.expect(200);
	t.pass();
});

test.serial('should fail if Slack auth data are missing', async t => {
	process.env.SLACK_CLIENT_ID = '';
	try {
		await main();
	} catch (err) {
		return t.pass();
	}
	t.fail('Failed');
});
