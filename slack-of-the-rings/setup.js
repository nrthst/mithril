// First-run setup: helps you create the Slack app, asks for the tokens and
// writes them to .env.
// Run with `npm run setup` (the Start launcher runs it automatically).

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');

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

// Slack's "create from a manifest" link. It opens the new-app dialog with all
// ten commands and Socket Mode already filled in from manifest.json.
function createAppUrl(manifest = require('./manifest.json')) {
  const encoded = encodeURIComponent(JSON.stringify(manifest))
    // encodeURIComponent leaves these alone, but they break Markdown links and shells.
    .replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `https://api.slack.com/apps?new_app=1&manifest_json=${encoded}`;
}

// Opens a URL in the default browser. Resolves to false if that didn't work.
function openInBrowser(url) {
  const [command, args] =
    process.platform === 'darwin' ? ['open', [url]]
    : process.platform === 'win32' ? ['powershell', ['-NoProfile', '-Command', `Start-Process '${url}'`]]
    : ['xdg-open', [url]];

  return new Promise(resolve => {
    try {
      const child = spawn(command, args, { stdio: 'ignore' });
      child.on('error', () => resolve(false));
      child.on('exit', code => resolve(code === 0));
    } catch (error) {
      resolve(false);
    }
  });
}

async function createSlackApp(question) {
  console.log('Step 1: create the Slack app');
  console.log('  Slack can set up all ten commands for you from a link.');
  const answer = await question('  Press Return to open it in your browser, or type "s" to skip if the app already exists.\n> ');
  if (answer.toLowerCase().startsWith('s')) {
    console.log('');
    return;
  }

  const url = createAppUrl();
  if (!(await openInBrowser(url))) {
    console.log('\n  Could not open the browser. Paste this link into it instead:\n');
    console.log(`  ${url}`);
  }
  console.log('\n  In Slack:');
  console.log('    1. Pick your workspace, then click Next and Create.');
  console.log('    2. Install App → Install to Workspace. Copy the Bot User OAuth Token.');
  console.log('    3. Basic Information → App-Level Tokens → Generate Token and Scopes,');
  console.log('       add the connections:write scope, and copy that token too.\n');
}

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
    console.log('');
  }

  await createSlackApp(question);

  console.log('Step 2: paste your tokens');
  const values = await askForTokens(question);
  rl.close();

  fs.writeFileSync(ENV_PATH, envFile(values), { mode: 0o600 });
  console.log('✅ Saved to .env. Start the bot with the Start launcher or "npm start".\n');
}

// Asks each question until the answer has the right shape. Optional ones can
// be skipped with an empty answer.
async function askForTokens(question, log = console.log) {
  const values = {};
  for (const { key, prefix, optional, ask } of QUESTIONS) {
    for (;;) {
      const answer = await question(`${ask}\n> `);
      if (!answer && optional) break;
      if (answer && (!prefix || answer.startsWith(prefix))) {
        values[key] = answer;
        break;
      }
      log(`  That doesn't look right. It should start with "${prefix}".\n`);
    }
    log('');
  }
  return values;
}

// The contents of .env for the given answers.
function envFile(values) {
  return [
    '# Slack of the Rings configuration. Keep this file private.',
    `SLACK_BOT_TOKEN=${values.SLACK_BOT_TOKEN}`,
    `SLACK_APP_TOKEN=${values.SLACK_APP_TOKEN}`,
    `LOTR_API_TOKEN=${values.LOTR_API_TOKEN || ''}`,
    ''
  ].join('\n');
}

// Only prompt when run directly; the tests import the helpers from this file.
if (require.main === module) {
  main().catch(error => {
    console.error('Setup failed:', error.message);
    process.exit(1);
  });
}

module.exports = { createAppUrl, askForTokens, envFile };
