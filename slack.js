const superagent = require('superagent');

const prepareUrl = api => `https://slack.com/api/${api}`;
module.exports = async (api, token, data = {}) => {
	const dataToSend = Object.assign({token}, data);
	const {body} = await superagent.get(prepareUrl(api)).query(dataToSend);
	if (!body.ok) {
		throw new Error(body.error);
	}
	return body;
};
