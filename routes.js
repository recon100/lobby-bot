const Router = require('koa-router');
const superagent = require('superagent');
const debug = require('debug')('routes');
const slack = require('./slack');

const router = new Router();

async function getSlackOAuthSessionData(ctx) {
	const sessionId = ctx.request.query.sid || ctx.request.body.sid;
	const session = await ctx.models.SlackOAuthSession.findById(sessionId);
	return session.data;
}

async function slackMiddleware(ctx, next) {
	const data = ctx.request.body;
	debug(data);
	ctx.body = '';
	if (data.token !== ctx.slackAuth.verificationToken) {
		debug(`Invalid token value ${data.token} (estimated ${ctx.slackAuth.verificationToken})`);
		return;
	}
	ctx.sendResponse = r => superagent.post(data.response_url).send(r).type('json');
	const app = await ctx.models.Application.findOne({'slack.teamId': data.team_id});
	if (!app) {
		debug(`Missing application data for team ${data.team_id}`);
		return;
	}
	ctx.application = app;
	ctx.runAsync = action => action().catch(err => ctx.sendResponse({
		response_type: 'ephemeral',
		replace_original: true,
		text: err.message
	}));
	await next();
}

router.post('/callback', async ctx => {
	const ev = ctx.request.body;
	debug(ev);
	ctx.body = '';
	try {
		switch (ev.eventType) {
			case 'sms': {
				if (ev.direction === 'in') {
					const app = await ctx.models.Application.findOne({'catapult.phoneNumber': ev.to});
					if (!app) {
						return;
					}
					debug(`${ev.from} ->: ${ev.text}`);
					// Redirect incoming message to Slack
					const chat = await ctx.models.PrivateChat.findOne({application: app.id, phoneNumber: ev.from, state: 'opened'});
					if (chat) {
						await chat.sendIncomingMessage({text: ev.text});
					} else {
						const message = {
							text: ev.text,
							username: ev.from,
							attachments: [
								{
									text: '',
									attachment_type: 'default',
									actions: [
										{
											name: 'chat',
											text: 'Chat',
											type: 'button',
											value: ev.from
										}
									]
								}
							]
						};
						await app.sendMessageToSlack(message);
					}
				}
				break;
			}
			default:
				debug('Unhandled event %s', ev.eventType);
				break;
		}
	}	catch (err) {
		debug(err);
	}
});

router.post('/slack/messageActions', slackMiddleware, async ctx => {
	const data = ctx.request.body;
	const app = ctx.application;
	ctx.runAsync(async () => {
		if (data.name === 'chat') {
			const phoneNumber = data.value;
			let chat = await ctx.models.PrivateChat.findOne({application: app.id, phoneNumber});
			if (chat) {
				// Hide previous chat
				const {group} = await slack('groups.createChild', app.slack.token, {name: chat.channel.id});
				chat.channel.id = group.id;
				chat.channel.name = group.name;
			} else 	{
				// Create new private chat with phone number
				const {group} = await slack('groups.create', app.slack.token, {channel: phoneNumber});
				const channel = {id: group.id, name: group.name};
				chat = new ctx.models.PrivateChat({
					application: app.id,
					phoneNumber,
					channel
				});
			}
			if (chat.state !== 'closed') {
				throw new Error('Somebody is already talking with this number');
			}
			chat.state = 'opened';
			await chat.save();
			await slack('groups.invite', app.slack.token, {channel: chat.channel.id, user: data.user});
			await chat.sendIncomingMessage({text: data.text}); // Copy this message to private channel
			await ctx.sendResponse({
				replace_original: true,
				text: `Go to private channel ${chat.channel.name} to continue conversation`
			});
		}
	});
});

router.post('/slack/commands', slackMiddleware, async ctx => {
	const data = ctx.request.body;
	const app = ctx.application;
	ctx.runAsync(async () => {
		if (data.command === '/close') {
			const chat = await ctx.models.PrivateChat.findOne({application: app.id, 'channel.id': data.channel_id, state: 'opened'});
			if (chat) {
				chat.state = 'closed';
				await chat.save();
				await ctx.sendResponse({
					replace_original: true,
					text: 'Conversation has been completed. Thank you.'
				});
			}
		}
	});
});

router.get('/slack/oauth2/callback', async ctx => {
	const host = ctx.request.host;
	const code = ctx.request.query.code;
	const data = {code};
	data.client_id = ctx.slackAuth.clientId;
	data.client_secret = ctx.slackAuth.clientSecret;
	data.redirect_uri = `https://${host}/slack/oauth2/callback`;
	const result = await superagent.get('https://slack.com/api/oauth.access').query(data);
	if (result.body.error) {
		return ctx.throw(400, result.body.error);
	}
	const sessionData = new ctx.models.SlackOAuthSession({data: result.body});
	await sessionData.save();
	ctx.status = 301;
	ctx.redirect(`/catapult/auth?sid=${sessionData.id}`);
});

router.get('/catapult/auth', async ctx => {
	await getSlackOAuthSessionData(ctx);
	await ctx.render('catapult-auth', {title: 'Authorization', formData: {sid: ctx.request.query.sid}});
});

router.post('/catapult/auth', async ctx => {
	const slack = await getSlackOAuthSessionData(ctx);
	const form = ctx.request.body;
	try {
		const app = await ctx.models.Application.createApplication(ctx.request.host, form.userId, form.apiToken, form.apiSecret, slack);
		ctx.cookies.set('teamId', app.slack.teamId, {signed: true});
		ctx.redirect('/');
	} catch (err) {
		await ctx.render('catapult-auth', {formData: form, error: err.message, title: 'Authorization'});
	}
});

router.get('/', async ctx => {
	const teamId = ctx.cookies.get('teamId', {signed: true});
	if (!teamId) {
		return ctx.throw(404);
	}
	const app = await ctx.models.Application.findOne({'slack.teamId': teamId});
	if (!app) {
		return ctx.throw(404);
	}
	await ctx.render('index', {
		title: 'Phone number',
		phoneNumber: app.catapult.phoneNumber,
		channel: app.slack.channel
	});
});

module.exports = router;
