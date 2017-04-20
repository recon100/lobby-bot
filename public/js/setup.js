const store = {
	id: null,
	clientId: null,
	permissions: ['commands', 'chat:write:bot', 'groups:read', 'groups:write', 'groups:history', 'incoming-webhook'],
	currentView: 'home',
	go(view) {
		this.currentView = view;
	},
	url(path) {
		return `${window.location.protocol}//${window.location.host}/slack/${this.id}${path}`;
	}
};

function component(name, data) {
	data = data || {};
	data.go = store.go.bind(store);
	data.store = store;
	return {
		template: `#${name}`,
		data: () => data
	};
}

function components(names) {
	const results = {};
	names.forEach(name => {
		results[name] = component(name);
	});
	return results;
}

function postJson(path, data) {
	return window.fetch(path, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	})
	.then(r => r.json())
	.then(data => {
		if (data.error) {
			throw new Error(data.error);
		}
		return data;
	});
}

Vue.component('s-image', {
	props: ['name'],
	template: `<img :src='"/img/" + name + ".png"' :alt='name' class='pure-img'>`
});

new Vue({ // eslint-disable-line no-new
	el: '#app',
	data: store,
	components: Object.assign(
		components(['home', 'slackConsole', 'createApp', 'oauth2Data', 'interactiveMessages', 'slashCommands', 'oauth2RedirectUrl', 'permissions', 'events', 'finish']),	{
			oauth2Data: component('oauth2Data', {
				clientId: null,
				clientSecret: null,
				save() {
					return postJson('/slack', {clientId: this.clientId, clientSecret: this.clientSecret})
					.then(data => {
						store.id = data.id;
						store.clientId = this.clientId;
						this.go('interactiveMessages');
					});
				}
			}),
			verificationToken: component('verificationToken', {
				verificationToken: null,
				save() {
					return postJson(`/slack/${this.store.id}/verificationToken`, {verificationToken: this.verificationToken})
					.then(() => {
						this.go('events');
					});
				}
			})
		})
});
