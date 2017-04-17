const test = require('ava');
const Catapult = require('node-bandwidth');
const models = require('../../../models');

test('getCatapult() should return Catapult object', t => {
	const app = new models.Application();
	app.catapult = {userId: 'userId', apiToken: 'token', apiSecret: 'secret'};
	const api = app.getCatapult();
	t.true(api instanceof Catapult);
});
