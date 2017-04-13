const superagent = require('superagent');

const prepareUrl = api => `https://slack.com/api/${api}`;
module.exports = async (api, token, data = {}) => {
	const {body} = await superagent.post(prepareUrl(api)).send({token}).send(data).type('json');
	if (!body.ok) {
		throw new Error(body.error);
	}
	return body;
};
