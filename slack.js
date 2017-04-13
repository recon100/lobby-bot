const superagent = require('superagent');

const prepareUrl = api => `https://slack.com/api/${api}`;
module.exports = (api, token) => superagent.post(prepareUrl(api)).send({token}).type('json');
