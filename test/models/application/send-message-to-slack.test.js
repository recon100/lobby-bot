const test = require('ava');
const td = require('testdouble');

const mockSlack = td.replace('../../../slack');
const models = require('../../../models');

test('sendMessageToSlack() should send message to Slack', async t => {
	const app = new models.Application();
	app.slack = {token: 'token', channel: 'channel'};
	td.when(mockSlack('chat.postMessage', 'token', {channel: 'channel', text: 'Message'})).thenResolve();
	const message = {text: 'Message'};
	await app.sendMessageToSlack(message);
	t.pass();
});

