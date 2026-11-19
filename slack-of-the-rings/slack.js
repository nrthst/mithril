const { App } = require('@slack/bolt');
const messages = require('./messages');

// Every slash command: how to build its reply, and what to say if that fails.
const COMMANDS = {
  '/frodo': {
    reply: (quotes, text) => messages.character(quotes, 'frodo', text),
    oops: '⚠️ Something went wrong fetching a Frodo quote. Try again!'
  },
  '/gandalf': {
    reply: (quotes, text) => messages.character(quotes, 'gandalf', text),
    oops: '⚠️ Even wizards make mistakes. Try again!'
  },
  '/legolas': {
    reply: (quotes, text) => messages.character(quotes, 'legolas', text),
    oops: '⚠️ Even Legolas misses sometimes. Try again!'
  },
  '/gollum': {
    reply: (quotes, text) => messages.character(quotes, 'gollum', text),
    oops: '⚠️ Gollum is confused! Try again, precious...'
  },
  '/fellowship': {
    reply: quotes => messages.fellowship(quotes),
    oops: '⚠️ The fellowship has scattered! Try again!'
  },
  '/council': {
    reply: (quotes, text) => messages.council(quotes, text),
    oops: '⚠️ The council is in recess. Try again!'
  },
  '/versus': {
    reply: (quotes, text) => messages.versus(quotes, text),
    oops: '⚠️ The battle could not commence! Try again!'
  },
  '/wisdom': {
    reply: quotes => messages.wisdom(quotes),
    oops: '⚠️ The wisdom has eluded us! Try again!'
  },
  '/quest': {
    reply: (quotes, text) => messages.quest(quotes, text),
    oops: '⚠️ The quest could not be created! Try again!'
  },
  '/lotr': {
    reply: (quotes, text) => messages.lotr(quotes, text),
    oops: '⚠️ The Ring has betrayed us! Try again!'
  }
};

function setupSlackApp(quotesManager) {
  // Socket Mode: the bot connects out to Slack, so it needs no public URL,
  // tunnel or signing secret.
  const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true
  });

  for (const [name, { reply, oops }] of Object.entries(COMMANDS)) {
    app.command(name, async ({ command, ack, respond }) => {
      // Slack expects an acknowledgement within 3 seconds.
      await ack();
      try {
        await respond(reply(quotesManager, command.text || ''));
      } catch (error) {
        console.error(`Error handling ${name}:`, error);
        await respond({ response_type: 'ephemeral', text: oops });
      }
    });
  }

  app.error(async error => {
    console.error('⚠️ Slack app error:', error);
  });

  return app;
}

module.exports = setupSlackApp;
module.exports.COMMANDS = COMMANDS;
