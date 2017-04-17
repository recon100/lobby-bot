const test = require('ava');
const td = require('testdouble');

const mockSlack = td.replace('../../../slack');
const models = require('../../../models');

td.replace(models.Application, 'findById');

td.when(models.Application.findById(td.matchers.anything())).thenResolve(new models.Application({slack: {token: 'token'}}));

test('sendIncomingMessage() should send message to Slack', async t => {
	const chat = new models.PrivateChat({
		phoneNumber: '+1234567890',
		application: '000000000000000000000000',
		channel: {id: 'channel'}
	});
	td.when(mockSlack('chat.postMessage', 'token', {channel: 'channel', text: 'Message', username: '+1234567890'})).thenResolve();
	const message = {text: 'Message'};
	await chat.sendIncomingMessage(message);
	t.pass();
});
