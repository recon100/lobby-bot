const test = require('ava');
const td = require('testdouble');
const superagent = require('superagent');
const delay = require('../delay');
const routes = require('../../routes').routes();

td.replace(superagent, 'post');

test.beforeEach(t => {
	t.context = {
		models: {
			Application: {
				findOne: td.function()
			},
			SlackApplication: {
				findById: td.function()
			},
			PrivateChat: td.constructor(['save'])
		}
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

test('POST /slack/:id/commands should handle command /complete', async t => {
	const {context} = t;
	context.method = 'POST';
	context.path = '/slack/id/commands';
	context.request = {
		is: () => false,
		body: {
			command: '/complete',
			team_id: 'teamId',
			text: '',
			token: 'token',
			response_url: 'url1',
			channel_id: 'channelId1'
		}
	};
	const mockPost = {
		send: td.function()
	};
	td.when(superagent.post('url1')).thenReturn(mockPost);
	td.when(mockPost.send({
		replace_original: true,
		text: 'Conversation has been completed. Thank you.'
	})).thenReturn({type: () => {
		t.pass();
		return Promise.resolve();
	}});
	const mockChat = {
		save: td.function()
	};
	td.when(context.models.PrivateChat.findOne({application: 'applicationId', 'channel.id': 'channelId1', state: 'opened'})).thenResolve(mockChat);
	td.when(mockChat.save()).thenDo(function () {
		t.is(this.state, 'closed');
		return Promise.resolve();
	});
	await routes(context, null);
	await delay(30);
});

