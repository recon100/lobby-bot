const test = require('ava');
const td = require('testdouble');
const models = require('../../../models');

const mockCatapult = {
	Application: {
		list: td.function(),
		create: td.function(),
		collection: {
			remove: td.function()
		}
	},
	PhoneNumber: {
		list: td.function(),
		update: td.function()
	},
	AvailableNumber: {
		searchAndOrder: td.function()
	}
};
td.replace(models.Application.prototype, 'getCatapult');
td.when(models.Application.prototype.getCatapult()).thenReturn(mockCatapult);
td.replace(models.Application.prototype, 'save');

function contains(t, obj, values) {
	for (const k of Object.keys(values)) {
		t.deepEqual(obj[k], values[k]);
	}
}

let dataToCompare = {};

test.before(t => {
	td.when(models.Application.prototype.save()).thenDo(function () {
		contains(t, this, dataToCompare);
	});
});

test.serial('createApplication() should use existing Catapult application if it exists', async t => {
	td.when(mockCatapult.Application.list({size: 1000})).thenResolve({
		applications: [{id: 'appId', name: 'Lobby Slack Bot on  https://localhost'}]
	});
	td.when(mockCatapult.Application.collection.remove({'catapult.applicationId': 'appId'})).thenResolve();
	td.when(mockCatapult.PhoneNumber.list({size: 1000, applicationId: 'appId'})).thenResolve({
		phoneNumbers: [{number: '+1134567890'}]
	});
	dataToCompare = {
		slack: {
			token: 'accessToken',
			teamName: 'teamName',
			teamId: 'teamId',
			channel: 'channel',
			userId: 'userId'
		},
		catapult:	{
			userId: 'userId',
			apiToken: 'token',
			apiSecret: 'secret',
			applicationId: 'appId',
			phoneNumber: '+1134567890'
		},
		host: 'localhost'
	};
	await models.Application.createApplication('localhost', {userId: 'userId', token: 'token', secret: 'secret'}, {
		access_token: 'accessToken',
		team_name: 'teamName',
		team_id: 'teamId',
		incoming_webhook: {
			url: 'url',
			channel: 'channel'
		},
		user_id: 'userId'
	});
	t.pass();
});

test.serial('createApplication() should create a Catapult application if need', async t => {
	td.when(mockCatapult.Application.list({size: 1000})).thenResolve({
		applications: []
	});
	td.when(mockCatapult.Application.create({
		name: 'Lobby Slack Bot on  https://localhost',
		incomingMessageUrl: 'https://localhost/callback',
		callbackHttpMethod: 'POST'
	})).thenResolve({
		id: 'appId1'
	});
	td.when(mockCatapult.PhoneNumber.list({size: 1000, applicationId: 'appId1'})).thenResolve({
		phoneNumbers: [{number: '+1134567890'}]
	});
	dataToCompare = {
		slack: {
			token: 'accessToken',
			teamName: 'teamName',
			teamId: 'teamId',
			userId: 'userId',
			channel: 'channel'
		},
		catapult:	{
			userId: 'userId',
			apiToken: 'token',
			apiSecret: 'secret',
			applicationId: 'appId1',
			phoneNumber: '+1134567890'
		},
		host: 'localhost'
	};
	await models.Application.createApplication('localhost', {userId: 'userId', token: 'token', secret: 'secret'}, {
		access_token: 'accessToken',
		team_name: 'teamName',
		team_id: 'teamId',
		incoming_webhook: {
			url: 'url',
			channel: 'channel'
		},
		user_id: 'userId'
	});
	t.pass();
});

test.serial('createApplication() should reserve a new phone number if need', async t => {
	td.when(mockCatapult.Application.list({size: 1000})).thenResolve({
		applications: []
	});
	td.when(mockCatapult.Application.create({
		name: 'Lobby Slack Bot on  https://localhost',
		incomingMessageUrl: 'https://localhost/callback',
		callbackHttpMethod: 'POST'
	})).thenResolve({
		id: 'appId2'
	});
	td.when(mockCatapult.PhoneNumber.list({size: 1000, applicationId: 'appId2'})).thenResolve({
		phoneNumbers: []
	});
	td.when(mockCatapult.AvailableNumber.searchAndOrder('local', {state: 'state', city: 'city', quantity: 1})).thenResolve([{
		id: 'numberId',
		number: '+1134567893'
	}]);
	td.when(mockCatapult.PhoneNumber.update('numberId', {applicationId: 'appId2'})).thenResolve();
	dataToCompare = {
		slack: {
			token: 'accessToken',
			teamName: 'teamName',
			teamId: 'teamId',
			channel: 'channel',
			userId: 'userId'
		},
		catapult:	{
			userId: 'userId',
			apiToken: 'token',
			apiSecret: 'secret',
			applicationId: 'appId2',
			phoneNumber: '+1134567893'
		},
		host: 'localhost'
	};
	await models.Application.createApplication('localhost', {
		userId: 'userId',
		token: 'token',
		secret: 'secret',
		state: 'state',
		city: 'city'
	}, {
		access_token: 'accessToken',
		team_name: 'teamName',
		team_id: 'teamId',
		incoming_webhook: {
			url: 'url',
			channel: 'channel'
		},
		user_id: 'userId'
	});
	t.pass();
});
