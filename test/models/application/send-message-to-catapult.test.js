const test = require('ava');
const td = require('testdouble');
const models = require('../../../models');

const mockCatapult = {
	Message: {
		send: td.function()
	}
};
td.replace(models.Application.prototype, 'getCatapult');
td.when(models.Application.prototype.getCatapult()).thenReturn(mockCatapult);

test('sendMessageToCatapult() should send message (sms) to Catapult', async t => {
	const app = new models.Application();
	const message = {text: 'Message'};
	td.when(mockCatapult.Message.send(message)).thenResolve();
	await app.sendMessageToCatapult(message);
	t.pass();
});
