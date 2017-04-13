const Router = require('koa-router');
const superagent = require('superagent');
const debug = require('debug')('routes');

const router = new Router();

async function getUserPhoneNumber(app, user) {
	if (user.startsWith('<@')) {
		// User name is given
		// Try to get phone number
		try {
			const list = user.substr(2).split('|');
			const id = list[0];
			const data = (await superagent.get('https://slack.com/api/users.info')
				.query({token: app.slack.token, user: id})).body;
			const phone = data.user.profile.phone;
			if (phone) {
				return phone;
			}
			throw new Error(`Missing phone number in profile of ${data.user.name}`);
		} catch (err) {
			debug(err.message);
			throw new Error(`Couldn't get phone number for ${user}. Please try to use phone number directly.`);
		}
	}
	return user;
}

async function getSlackOAuthSessionData(ctx) {
	const sessionId = ctx.request.query.sid || ctx.request.body.sid;
	const session = await ctx.models.SlackOAuthSession.findById(sessionId);
	return session.data;
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
					await app.sendMessageToSlack({
						text: `_${ev.from}:_`,
						mrkdwn: true,
						attachment_type: 'default',
						attachments: [{
							text: ev.text
						}]
					});
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

router.post('/slack/commands', async ctx => {
	const ev = ctx.request.body;
	debug(ev);
	ctx.body = '';
	if (ev.token !== ctx.slackAuth.verificationToken) {
		return;
	}
	const sendResponse = text => superagent.post(ev.response_url).send({text, mrkdwn: true}).type('json');
	const app = await ctx.models.Application.findOne({'slack.teamId': ev.team_id});
	if (!app) {
		return;
	}
	try {
		switch (ev.command) {
			case '/sms': {
				const index = ev.text.indexOf(' ');
				if (index >= 0) {
					const to = await getUserPhoneNumber(app, ev.text.substr(0, index).trim());
					const message = {
						from: app.catapult.phoneNumber,
						to,
						text: ev.text.substr(index + 1).trim()
					};
					debug('Sending a SMS to %s: %j', to, message);
					await app.sendMessageToCatapult(message);
					await sendResponse(`Sent _${message.text}_ to _${message.to}_`);
				}
				break;
			}
			default:
				debug('Unknown command %s', ev.command);
				break;
		}
	} catch (err) {
		debug(err);
		await sendResponse(`_Error: ${err.message}_`);
	}
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
