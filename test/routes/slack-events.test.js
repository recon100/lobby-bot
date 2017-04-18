const test = require('ava');
const td = require('testdouble');
const routes = require('../../routes').routes();

test.beforeEach(t => {
	t.context = {
		models: {
			Application: {
				findOne: td.function()
			},
			PrivateChat: {
				findOne: td.function()
			}
		},
		slackAuth: {
			verificationToken: 'token'
		},
		mockSendMessageToCatapult: td.function()
	};
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
		host: 'localhost',
		sendMessageToCatapult: t.context.mockSendMessageToCatapult
	});
});

test('POST /slack/events should pass url verification', async t => {
	const {context} = t;
	context.method = 'POST';
	context.path = '/slack/events';
	context.request = {
		is: () => false,
		body: {
			team_id: 'teamId',
			text: '',
			token: 'token',
			response_url: 'url1',
			channel_id: 'channelId1',
			type: 'url_verification',
			challenge: '1234'
		}
	};
	await routes(context, null);
	t.is(context.body.challenge, '1234');
});

test('POST /slack/events should send SMS back to user', async t => {
	const {context} = t;
	context.method = 'POST';
	context.path = '/slack/events';
	context.request = {
		is: () => false,
		body: {
			team_id: 'teamId',
			text: '',
			token: 'token',
			response_url: 'url2',
			channel_id: 'channelId1',
			type: 'event_callback',
			event: {
				type: 'message',
				channel: 'channelId',
				text: 'Hello'
			}
		}
	};
	const mockChat = {
		save: td.function(),
		phoneNumber: '+1234567890'
	};
	td.when(context.models.PrivateChat.findOne({application: 'applicationId', 'channel.id': 'channelId', state: 'opened'})).thenResolve(mockChat);
	td.when(mockChat.save()).thenDo(function () {
		t.truthy(this.lastMessageTime);
	});
	td.when(context.mockSendMessageToCatapult({
		from: '+1134567891',
		to: '+1234567890',
		text: 'Hello'
	})).thenResolve();
	await routes(context, null);
});

