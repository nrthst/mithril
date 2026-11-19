// First-run setup: asks for the tokens and writes them to .env.
// Run with `npm run setup` (the Start launcher runs it automatically).

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ENV_PATH = path.join(__dirname, '.env');

const QUESTIONS = [
  {
    key: 'SLACK_BOT_TOKEN',
    prefix: 'xoxb-',
    ask: 'Bot token (Slack app → OAuth & Permissions → Bot User OAuth Token, starts with xoxb-)'
  },
  {
    key: 'SLACK_APP_TOKEN',
    prefix: 'xapp-',
    ask: 'App-level token (Slack app → Basic Information → App-Level Tokens, starts with xapp-)'
  },
  {
    key: 'LOTR_API_TOKEN',
    optional: true,
    ask: 'The One API token for hundreds of extra quotes (optional, press Return to skip)'
  }
];

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = text => new Promise(resolve => rl.question(text, answer => resolve(answer.trim())));

  console.log('\n🧙‍♂️ Slack of the Rings setup\n');

  if (fs.existsSync(ENV_PATH)) {
    const answer = await question('A .env file already exists. Replace it? (y/N) ');
    if (answer.toLowerCase() !== 'y') {
      console.log('Keeping the existing .env.');
      rl.close();
      return;
    }
  }

  const values = {};
  for (const { key, prefix, optional, ask } of QUESTIONS) {
    for (;;) {
      const answer = await question(`${ask}\n> `);
      if (!answer && optional) break;
      if (answer && (!prefix || answer.startsWith(prefix))) {
        values[key] = answer;
        break;
      }
      console.log(`  That doesn't look right. It should start with "${prefix}".\n`);
    }
    console.log('');
  }
  rl.close();

  const lines = [
    '# Slack of the Rings configuration. Keep this file private.',
    `SLACK_BOT_TOKEN=${values.SLACK_BOT_TOKEN}`,
    `SLACK_APP_TOKEN=${values.SLACK_APP_TOKEN}`,
    `LOTR_API_TOKEN=${values.LOTR_API_TOKEN || ''}`,
    ''
  ];
  fs.writeFileSync(ENV_PATH, lines.join('\n'), { mode: 0o600 });
  console.log('✅ Saved to .env. Start the bot with the Start launcher or "npm start".\n');
}

main().catch(error => {
  console.error('Setup failed:', error.message);
  process.exit(1);
});
