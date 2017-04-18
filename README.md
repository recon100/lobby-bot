lobby-bot
===========

[![Build](https://travis-ci.org/BandwidthExamples/lobby-bot.png)](https://travis-ci.org/BandwidthExamples/lobby-bot)

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

A demo bot which allows to use Bandwidth services inside Slack chat

Requirements:
* Node 7.5+ and MongoDb 3.0+ OR Docker 1.10+ and Docker Compose
* External https access (via port forwarding like `ngrok`, VPS, etc)

### Install

If you use Node directly install dependencies by

```bash
# Install dependencies (Node-way only)
npm install

# or via yarn
yarn install

```

Go to [Slack Apps console](https://api.slack.com/apps) and create new Slack application. Switch to `Basic information` and select `Interactive messages` on section `Add features and functionality`.

![features](/images/1.png)

Fill there `Request Url` by value https://<your-host>/slack/messageActions. Press `Save changes`.

![message actions](/images/2.png)

Go to tab `Slash commands` and new command `/complete` as shown on picture (`Request Url` should be https://<your-host>/slack/commands). Press `Save` after that.

![command](/images/3.png)

Go to tab `OAuth & Permissions` and add https://<your-host>/slack/oauth2/callback to Redirect URLs. Press `Save Urls`.

![oauth2](/images/5.png)

Add permission scopes `commands`, `chat:write:bot`, `groups:read`, `groups:write`, `groups:history` and `incoming-webhook`.  Press `Save changes`.

![scopes](/images/6.png)

Switch to `Basic information` and copy from from App Credentials: Client ID, CLient Secret and Verification Token. Fill environment variables `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` and `SLACK_VERIFICATION_TOKEN` by these values.


![credentials](/images/7.png)

```bash
export SLACK_CLIENT_ID = <your-slack-app-client-id>
export SLACK_CLIENT_SECRET = <your-slack-app-client-secret>
export SLACK_VERIFICATION_TOKEN = <your-slack-app-verification-token> 
```

Run the app by

```bash
# Node-way (Mongo should be ran before this step, set DATABASE_URL to with valid url to your mongo db instance)
npm start

# Docker-way
PORT=3000 docker-compose up -d # web app will be available on port 3000
```

Configure port forwarding to open external access if need (like `ngrok http 3000`). Switch back to the browser. Go to tab `Event Subscriptions` tune on events. Fill `Request URL` by https://<your-host>/slack/events (to pass url validation this app is required to be started) and subscribe to event `message.groups`. Press `Save changes`

![event](/images/4.png)


Now this bot is ready to work.

### Add bot to your team

Open in browser next link (replace `SLACK_CLIENT_ID` by your Slack App client id)

```
https://slack.com/oauth/pick?scope=incoming-webhook%2Ccommands%2Cchat:write:bot%2Cgroups:read%2Cgroups:write%2Cgroups:history&client_id=SLACK_CLIENT_ID
```

Select team where you would like to use this application. On next page select channel (it should be private) for incoming messages from users.

After that you will be redirected to this app site to fill Catapult auth data. Press "Save" to complete authorization and see your new phone number for messages.

### Using bot

Send SMS to number for messages (you will see it after adding the bot to team). You will see new message in your channel for messages. Press `Answer` on this message. A new private channel for this phone number will be created (or reused existing channel). Go to this channel and send a message there. A SMS will be sent with this message. All incoming SMSes from this number will be shown in this channel too. To complete conversation run there `/complete` (or wait 2 hours without new messages in this channel). After that new incoming messages from this number will be shown in common channel for incoming messages again.
