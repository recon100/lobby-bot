const Catapult = require('node-bandwidth');
const mongoose = require('mongoose');
const debug = require('debug')('models');
const slack = require('./slack');

const CATAPULT_APPLICATION_NAME = 'Lobby Slack Bot';

mongoose.Promise = global.Promise;

const ApplicationSchema = new mongoose.Schema({
	catapult: {
		type: {
			userId: {type: String, required: true},
			apiToken: {type: String, required: true},
			apiSecret: {type: String, required: true},
			phoneNumber: {type: String, required: true, index: true},
			applicationId: {type: String, required: true, index: true}
		}, required: true
	},
	slack: {
		type: {
			token: {type: String, required: true, index: true},
			teamName: {type: String, required: true},
			teamId: {type: String, required: true, index: true},
			channel: {type: String, required: true},
			userId: {type: String, required: true}
		}, required: true
	},
	host: {type: String, required: true}
});

let Application = null;

ApplicationSchema.statics.createApplication = async function (host, {userId, apiToken, apiSecret, state, city}, slack) {
	const app = new Application();
	app.host = host;
	app.catapult = {userId, apiToken, apiSecret};
	const api = app.getCatapult();
	const baseUrl = `https://${app.host}`;
	const catapultApplicationName = `${CATAPULT_APPLICATION_NAME} on  ${baseUrl}`;
	let applicationId = ((await api.Application.list({size: 1000})).applications
		.filter(app => app.name === catapultApplicationName)[0] || {}).id;
	if (!applicationId) {
		debug('Creating new application on Catapult');
		applicationId = (await api.Application.create({
			name: catapultApplicationName,
			incomingMessageUrl: `${baseUrl}/callback`,
			callbackHttpMethod: 'POST'
		})).id;
	}
	app.catapult.applicationId = applicationId;
	let phoneNumber = ((await api.PhoneNumber.list({size: 1000, applicationId})).phoneNumbers)[0];
	if (!phoneNumber) {
		debug('Reserving service phone number');
		phoneNumber = (await api.AvailableNumber.searchAndOrder('local', {state, city, quantity: 1}))[0];
		await api.PhoneNumber.update(phoneNumber.id, {applicationId});
	}
	app.catapult.phoneNumber = phoneNumber.number;
	app.slack = {
		token: slack.access_token,
		teamName: slack.team_name,
		teamId: slack.team_id,
		channel: slack.incoming_webhook.channel,
		userId: slack.user_id
	};
	await Application.collection.remove({'catapult.applicationId': applicationId});
	await app.save();
	return app;
};

ApplicationSchema.methods.sendMessageToSlack = function (message) {
	return slack('chat.postMessage', this.slack.token,
		Object.assign({channel: this.slack.channel}, message));
};

ApplicationSchema.methods.sendMessageToCatapult = function (message) {
	const api = this.getCatapult();
	return api.Message.send(message);
};

ApplicationSchema.methods.getCatapult = function () {
	return new Catapult(this.catapult);
};

const SlackOAuthSessionSchema = new mongoose.Schema({
	createdAt: {type: Date, expires: 1800, default: Date.now}, // TTL of session record is 30min
	data: {}
});

Application = mongoose.model('Application', ApplicationSchema);

const PrivateChatSchema = new mongoose.Schema({
	phoneNumber: {type: String, required: true, index: true},
	application: {type: mongoose.Schema.Types.ObjectId, ref: 'Application', index: true},
	channel: {
		type: {
			name: {type: String, required: true},
			id: {type: String, required: true, index: true}
		}, required: true
	},
	state: {type: String, required: true, default: 'closed', index: true},
	lastMessageTime: {type: Date, index: true}
});

let PrivateChat = null;

PrivateChatSchema.methods.sendIncomingMessage = async function (message) {
	if (!this.application.slack) {
		this.application = await Application.findById(this.application);
	}
	return slack('chat.postMessage', this.application.slack.token,
		Object.assign({channel: this.channel.id, username: this.phoneNumber}, message));
};

PrivateChatSchema.statics.closeInactiveChats = function () {
	// Close private chat if it doesn't have new messages more than 2 hours
	return PrivateChat.collection.update({
		state: 'opened',
		lastMessageTime: {$gt: new Date(Date.now() - (2 * 3600000))}
	}, {
		$set: {
			state: 'closed'
		}
	});
};

PrivateChat = mongoose.model('PrivateChat', PrivateChatSchema);

module.exports = {
	Application,
	SlackOAuthSession: mongoose.model('SlackOAuthSession', SlackOAuthSessionSchema),
	PrivateChat
};
