const test = require('ava');
const td = require('testdouble');

const models = require('../../../models');

td.replace(models.PrivateChat.collection, 'update');
td.replace(Date, 'now');

test('closeInactiveChats() should close inactive chats', async t => {
	const date = new Date('2017-04-17T00:00:00Z');
	td.when(models.PrivateChat.collection.update({
		state: 'opened',
		lastMessageTime: {$gt: new Date('2017-04-16T22:00:00.000Z')}
	}, {$set: {state: 'closed'}})).thenResolve();
	td.when(Date.now()).thenReturn(date);
	await models.PrivateChat.closeInactiveChats();
	t.pass();
});
