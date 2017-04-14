const superagent = require('superagent');

const prepareUrl = api => `https://slack.com/api/${api}`;
module.exports = async (api, token, data = {}) => {
	const dataToSend = Object.assign({token}, data);
	for (const key in dataToSend) {
		if (Array.isArray(dataToSend[key])) {
			dataToSend[key] = JSON.stringify(dataToSend[key]);
		}
	}
	const {body} = await superagent.post(prepareUrl(api)).query(dataToSend);
	if (!body.ok) {
		throw new Error(body.error);
	}
	return body;
};
