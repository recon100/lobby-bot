const test = require('ava');
const superagent = require('superagent');
const td = require('testdouble');
const slack = require('../slack');

td.replace(superagent, 'post');

test('slack() should make a request to Slack API', async t => {
	const mockQuery = {
		query: td.function()
	};
	td.when(superagent.post('https://slack.com/api/test')).thenReturn(mockQuery);
	td.when(mockQuery.query({field1: 'value1', token: 'token'})).thenResolve({body: {ok: true}});
	await slack('test', 'token', {field1: 'value1'});
	t.pass();
});

test('slack() should handle Slack API error', async t => {
	const mockQuery = {
		query: td.function()
	};
	td.when(superagent.post('https://slack.com/api/test1')).thenReturn(mockQuery);
	td.when(mockQuery.query({field1: 'value1', token: 'token'})).thenResolve({body: {ok: false, error: 'Error'}});
	try {
		await slack('test1', 'token', {field1: 'value1'});
	} catch (err) {
		t.is(err.message, 'Error');
		return;
	}
	t.fail();
});

