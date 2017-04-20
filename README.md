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

Run the app by

```bash
# Node-way (Mongo should be ran before this step, set DATABASE_URL to with valid url to your mongo db instance)
npm start

# Docker-way
PORT=3000 docker-compose up -d # web app will be available on port 3000
```

Configure port forwarding to open external access if need (like `ngrok http 3000`).

Open this web app in browser and follow instructions to configure Slack part.


### Add bot to your team

Open in browser next link (replace `SLACK_CLIENT_ID` by your Slack App client id)

```
https://slack.com/oauth/pick?scope=incoming-webhook%2Ccommands%2Cchat:write:bot%2Cgroups:read%2Cgroups:write%2Cgroups:history&client_id=SLACK_CLIENT_ID
```

Select team where you would like to use this application. On next page select channel (it should be private) for incoming messages from users.

After that you will be redirected to this app site to fill Catapult auth data. Press "Save" to complete authorization and see your new phone number for messages.

### Using bot

Send SMS to number for messages (you will see it after adding the bot to team). You will see new message in your channel for messages. Press `Answer` on this message. A new private channel for this phone number will be created (or reused existing channel). Go to this channel and send a message there. A SMS will be sent with this message. All incoming SMSes from this number will be shown in this channel too. To complete conversation run there `/complete` (or wait 2 hours without new messages in this channel). After that new incoming messages from this number will be shown in common channel for incoming messages again.
