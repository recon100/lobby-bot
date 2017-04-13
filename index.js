const path = require('path');
const Koa = require('koa');
const koaBody = require('koa-body');
const koaViews = require('koa-views');
const mongoose = require('mongoose');
const router = require('./routes');
const models = require('./models');

async function main() {
	const slackAuth = {
		clientId: process.env.SLACK_CLIENT_ID,
		clientSecret: process.env.SLACK_CLIENT_SECRET,
		verificationToken: process.env.SLACK_VERIFICATION_TOKEN
	};
	if (!slackAuth.clientId || !slackAuth.clientSecret || !slackAuth.verificationToken) {
		throw new Error('Missing slack auth data');
	}

	mongoose.Promise = global.Promise;
	await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost/catapult-lobby-bot');

	const app = new Koa();
	app.keys = ['9rvjNNd', 'eDToNlNE', 'U4Nit1QD']; // For sign cookies
	app
		.use(async (ctx, next) => {
			ctx.slackAuth = slackAuth;
			ctx.models = models;
			await next();
		})
		.use(koaBody({}))
		.use(koaViews(path.join(__dirname, 'views'), {
			map: {
				pug: 'pug'
			},
			extension: 'pug'
		}))
		.use(router.routes())
		.use(router.allowedMethods());

	return app;
}

if (!module.parent) {
	main().then(app => app.listen(process.env.PORT || 3000)).then(() => console.log('Ready'), console.trace);
}

module.exports = main;

// Link to Slack app https://slack.com/oauth/pick?scope=incoming-webhook%2Ccommands%2Cchat:write:bot%2Cgroups:write%2Cgroups:read&client_id=<client-id>
