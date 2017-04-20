const test = require('ava');
const td = require('testdouble');
const superagent = require('superagent');
const delay = require('../delay');

const mockSlack = td.replace('../../slack');
const routes = require('../../routes').routes();

td.replace(superagent, 'post');

test.beforeEach(t => {
	const mockChatSave = td.function();
	const mockChatSendIncomingMessage = td.function();
	t.context = {
		models: {
			Application: {
				findOne: td.function()
			},
			PrivateChat: td.constructor(function (data) {
				this.state = 'closed';
				this.save = mockChatSave;
				this.sendIncomingMessage = mockChatSendIncomingMessage;
				this.application = data.application;
				this.phoneNumber = data.phoneNumber;
				this.channel = data.channel;
			}),
			SlackApplication: {
				findById: td.function()
			}
		},
		mockChatSave,
		mockChatSendIncomingMessage
	};
	t.context.models.PrivateChat.findOne = td.function();
	td.when(t.context.models.Application.findOne({'slack.teamId': 'teamId'})).thenResolve({
		id: 'applicationId',
		slack: {
			token: 'accessToken',
			teamName: 'teamName',
			teamId: 'teamId',
			incomingWebhookUrl: 'url',
			channel: 'channel'
		},
		catapult:	{
			userId: 'userId',
			apiToken: 'token',
			apiSecret: 'secret',
			applicationId: 'appId1',
			phoneNumber: '+1134567891'
		},
		host: 'localhost'
	});
	td.when(t.context.models.SlackApplication.findById('id')).thenResolve({
		verificationToken: 'token'
	});
});

test('POST /slack/messageActions should handle "Answer" to incoming message', async t => {
	const {context} = t;
	context.method = 'POST';
	context.path = '/slack/id/messageActions';
	context.request = {
		is: () => false,
		body: {
			callback_id: 'chat',
			actions: [
				{value: `+1234567890:${Buffer.from('Hello').toString('base64')}`}
			],
			token: 'token',
			response_url: 'url1',
			team: {id: 'teamId'}
		}
	};
	td.when(context.models.PrivateChat.findOne({application: 'applicationId', phoneNumber: '+1234567890'})).thenResolve(null);
	td.when(mockSlack('groups.list', 'accessToken')).thenResolve({groups: []});
	td.when(mockSlack('groups.create', 'accessToken', {name: '1234567890'})).thenResolve({group: {id: 'groupId', name: '1234567890'}});
	td.when(context.mockChatSave()).thenDo(function () {
		t.is(this.application, 'applicationId');
		t.is(this.phoneNumber, '+1234567890');
		t.deepEqual(this.channel, {id: 'groupId', name: '1234567890'});
		t.is(this.state, 'opened');
		return Promise.resolve();
	});
	td.when(context.mockChatSendIncomingMessage({text: 'Hello'})).thenResolve();
	const mockPost = {
		send: td.function()
	};
	td.when(superagent.post('url1')).thenReturn(mockPost);
	td.when(mockPost.send({
		replace_original: true,
		text: 'Go to private channel 1234567890 to continue conversation'
	})).thenReturn({type: () => {
		t.pass();
		return Promise.resolve();
	}});
	await routes(context, null);
	await delay(30);
});

