require('dotenv').config();
const QuotesManager = require('./quotes');
const setupSlackApp = require('./slack');

// Each required token, the prefix Slack gives it, and where to find it.
const REQUIRED = {
  SLACK_BOT_TOKEN: ['xoxb-', 'OAuth & Permissions → Bot User OAuth Token'],
  SLACK_APP_TOKEN: ['xapp-', 'Basic Information → App-Level Tokens']
};

function checkEnvironment() {
  const problems = [];
  for (const [key, [prefix, where]] of Object.entries(REQUIRED)) {
    const value = (process.env[key] || '').trim();
    if (!value) {
      problems.push(`${key} is missing (${where})`);
    } else if (!value.startsWith(prefix)) {
      problems.push(`${key} should start with "${prefix}" (${where})`);
    }
  }
  return problems;
}

async function main() {
  console.log('🧙‍♂️ Starting Slack of the Rings...\n');

  const problems = checkEnvironment();
  if (problems.length > 0) {
    console.error('❌ The .env file needs attention:');
    problems.forEach(problem => console.error(`   - ${problem}`));
    console.error('\nRun "npm run setup" to enter your tokens again.');
    process.exit(1);
  }

  try {
    const quotesManager = new QuotesManager((process.env.LOTR_API_TOKEN || '').trim());
    await quotesManager.initialize();

    const app = setupSlackApp(quotesManager);
    await app.init();   // checks the bot token with Slack
    await app.start();  // opens the connection, which checks the app-level token

    console.log('\n✨ Slack of the Rings is running!');
    console.log(`   Quotes: ${quotesManager.source}`);
    console.log('   Try /lotr in any Slack channel.');
    console.log('   Keep this window open. Press Ctrl+C to stop.\n');
  } catch (error) {
    console.error('❌ Failed to start:', error.message || error);
    if (/invalid_auth|not_authed|token_revoked|account_inactive/.test(String(error.message))) {
      console.error('   Slack rejected a token. Run "npm run setup" to enter fresh ones.');
    }
    process.exit(1);
  }
}

function shutdown() {
  console.log('\n\n👋 Shutting down Slack of the Rings...');
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main();
