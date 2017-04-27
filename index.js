const path = require('path');
const Koa = require('koa');
const koaBody = require('koa-body');
const koaViews = require('koa-views');
const koaStatic = require('koa-static');
const mongoose = require('mongoose');
const router = require('./routes');
const models = require('./models');

async function main() {
	mongoose.Promise = global.Promise;
	await mongoose.connect(process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://localhost/catapult-lobby-bot');

	const app = new Koa();
	app.keys = ['9rvjNNd', 'eDToNlNE', 'U4Nit1QD']; // For sign cookies
	app
		.use(async (ctx, next) => {
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
		.use(router.allowedMethods())
		.use(koaStatic(path.join(__dirname, 'public')));

	return app;
}

if (!module.parent) {
	main().then(app => app.listen(process.env.PORT || 3000)).then(() => console.log('Ready'), console.trace);
	// setInterval(() => models.PrivateChat.closeInactiveChats().catch(err => console.error(err.message)), 600000);
}

module.exports = main;

// Link to Slack app https://slack.com/oauth/pick?scope=incoming-webhook%2Ccommands%2Cchat:write:bot%2Cgroups:read%2Cgroups:write%2Cgroups:history&client_id=<client-id>
