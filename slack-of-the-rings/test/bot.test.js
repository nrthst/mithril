const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const axios = require('axios');

const { createAppUrl, askForTokens, envFile } = require('../setup');
const QuotesManager = require('../quotes');
const { SITUATIONS, FALLBACK_QUOTES, matchesAny, cleanQuotes } = QuotesManager;
const messages = require('../messages');
const manifest = require('../manifest.json');

// A manager whose pools hold decoys that the old keyword search would have picked.
function managerWithDecoys() {
  const quotes = new QuotesManager('');
  quotes.quotes.gandalf = ['A fool, but an honest fool he remains.', 'What time is it now?'];
  quotes.quotes.frodo = ['I will not go that way.', 'Take it away from me.'];
  quotes.quotes.legolas = ['The stars are veiled tonight.'];
  return quotes;
}

const repeat = (fn, times = 60) => new Set(Array.from({ length: times }, fn));
const allText = payload => JSON.stringify(payload);

test('keywords match at the start of a word only', () => {
  assert.ok(matchesAny('running late again', ['late']));
  assert.ok(matchesAny('Feeling OVERWHELMED', ['overwhelm']));
  assert.ok(matchesAny('I can’t continue', ["can't"]));
  assert.ok(!matchesAny('translate the template', ['late']));
  assert.ok(!matchesAny('', ['late']));
});

test('situations return only their hand-picked quotes', () => {
  const quotes = managerWithDecoys();
  const cases = [
    ['gandalf', 'merge without tests', SITUATIONS.gandalf[0].quotes],
    ['gandalf', 'missed the deadline', SITUATIONS.gandalf[1].quotes],
    ['gandalf', 'tough decision', SITUATIONS.gandalf[2].quotes],
    ['frodo', "can't continue", SITUATIONS.frodo[0].quotes],
    ['frodo', 'feeling overwhelmed', SITUATIONS.frodo[1].quotes],
    ['frodo', 'starting a new project', SITUATIONS.frodo[2].quotes],
    ['legolas', 'closed 10 tickets', SITUATIONS.legolas[0].quotes]
  ];
  for (const [character, text, expected] of cases) {
    for (const quote of repeat(() => quotes.forSituation(character, text))) {
      assert.ok(expected.includes(quote), `${character} "${text}" gave "${quote}"`);
    }
  }
});

test('no matching keyword falls back to the full pool', () => {
  const quotes = managerWithDecoys();
  const seen = repeat(() => quotes.forSituation('gandalf', 'lunch'));
  assert.deepEqual([...seen].sort(), [...quotes.quotes.gandalf].sort());
});

test('API quotes are cleaned: whitespace, fragments, duplicates', () => {
  const cleaned = cleanQuotes([
    { dialog: '  You   shall not\n pass!  ' },
    { dialog: 'you shall not pass!' },
    { dialog: 'Sam!' },
    { dialog: '' },
    {},
    { dialog: 'x'.repeat(400) }
  ]);
  assert.deepEqual(cleaned, ['You shall not pass!']);
});

test('without an API token the bot uses its built-in quotes', async () => {
  const quotes = new QuotesManager('');
  await quotes.initialize();
  assert.deepEqual(quotes.quotes, FALLBACK_QUOTES);
  assert.equal(quotes.source, 'built-in quotes');
});

// Runs `run` with The One API replaced by `handler(url)`, and the console quiet.
async function withApi(handler, run) {
  const original = { get: axios.get, log: console.log, error: console.error };
  axios.get = async (url, options) => handler(url, options);
  console.log = console.error = () => {};
  try {
    return await run();
  } finally {
    axios.get = original.get;
    console.log = original.log;
    console.error = original.error;
  }
}

// A stand-in for The One API that knows the four characters.
function fakeApi(dialogFor) {
  return async url => {
    if (url.endsWith('/character')) {
      return { data: { docs: Object.values(QuotesManager.CHARACTERS).map(c => ({ _id: c.apiName, name: c.apiName })) } };
    }
    const who = decodeURIComponent(url.split('/character/')[1].split('/quote')[0]);
    return { data: { docs: dialogFor(who).map(dialog => ({ dialog })) } };
  };
}

test('an API that fails or hangs leaves the built-in quotes in place', async () => {
  for (const failure of [
    Object.assign(new Error('timeout of 8000ms exceeded'), { code: 'ECONNABORTED' }),
    Object.assign(new Error('Request failed'), { response: { status: 401 } }),
    new Error('getaddrinfo ENOTFOUND the-one-api.dev')
  ]) {
    const quotes = new QuotesManager('some-token');
    await withApi(async () => { throw failure; }, () => quotes.initialize());
    assert.deepEqual(quotes.quotes, FALLBACK_QUOTES);
    assert.equal(quotes.source, 'built-in quotes');
  }
});

test('API requests carry a timeout', async () => {
  const timeouts = [];
  const api = fakeApi(() => []);
  const quotes = new QuotesManager('some-token');
  await withApi((url, options) => { timeouts.push(options.timeout); return api(url); }, () => quotes.initialize());
  assert.equal(timeouts.length, 5);
  assert.ok(timeouts.every(ms => ms > 0 && ms <= 15000));
});

test('the quote source is only called The One API when quotes actually loaded', async () => {
  const empty = new QuotesManager('some-token');
  await withApi(fakeApi(() => []), () => empty.initialize());
  assert.equal(empty.source, 'built-in quotes');
  assert.deepEqual(empty.quotes, FALLBACK_QUOTES);

  const lines = Array.from({ length: 8 }, (_, i) => `This is film line number ${i} for the test.`);
  const loaded = new QuotesManager('some-token');
  await withApi(fakeApi(who => (who === 'Gandalf' ? lines : [])), () => loaded.initialize());
  assert.equal(loaded.source, 'The One API');
  assert.ok(lines.every(line => loaded.quotes.gandalf.includes(line)));
  assert.deepEqual(loaded.quotes.frodo, FALLBACK_QUOTES.frodo);
});

test('the README setup link carries the current manifest', () => {
  const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  const match = readme.match(/^\[create-app\]: (\S+)$/m);
  assert.ok(match, 'README.md has no [create-app] link');
  assert.equal(
    match[1],
    createAppUrl(manifest),
    'README link is out of date. Replace the [create-app] line with the output of: node -p "require(\'./setup\').createAppUrl()"'
  );
  const url = new URL(match[1]);
  assert.equal(url.origin + url.pathname, 'https://api.slack.com/apps');
  assert.equal(url.searchParams.get('new_app'), '1');
  assert.deepEqual(JSON.parse(url.searchParams.get('manifest_json')), manifest);
  // Characters that would end a Markdown link early must be escaped.
  assert.doesNotMatch(match[1], /[()\s'<>]/);
});

test('setup re-asks for a malformed token and lets the optional one be skipped', async () => {
  const answers = ['nope', 'xapp-wrong', 'xoxb-bot', '', 'xapp-app', ''];
  const asked = [];
  const values = await askForTokens(async prompt => { asked.push(prompt); return answers.shift(); }, () => {});
  assert.deepEqual(values, { SLACK_BOT_TOKEN: 'xoxb-bot', SLACK_APP_TOKEN: 'xapp-app' });
  assert.equal(asked.length, 6);

  const written = require('dotenv').parse(envFile(values));
  assert.deepEqual(written, { SLACK_BOT_TOKEN: 'xoxb-bot', SLACK_APP_TOKEN: 'xapp-app', LOTR_API_TOKEN: '' });
});

test('gollum covets what the user asked for', () => {
  const quotes = new QuotesManager('');
  const coffee = allText(messages.character(quotes, 'gollum', 'coffee'));
  assert.match(coffee, /\*coffee\*/);
  assert.match(coffee, /raw and wriggling/);
  assert.match(allText(messages.character(quotes, 'gollum', 'production access')), /pocketses/);
  // With nothing to covet he just quotes.
  const bare = messages.character(quotes, 'gollum', '');
  assert.ok(FALLBACK_QUOTES.gollum.some(q => allText(bare).includes(q.slice(0, 10))));
});

test('user text cannot trigger mentions or break formatting', () => {
  const quotes = new QuotesManager('');
  for (const build of [
    () => messages.quest(quotes, '<!channel> fix it & ship'),
    () => messages.council(quotes, '<!channel> fix it & ship'),
    () => messages.character(quotes, 'gollum', '<!channel> fix it & ship'),
    () => messages.character(quotes, 'frodo', '<!channel> fix it & ship')
  ]) {
    const payload = build();
    assert.ok(!JSON.stringify(payload.blocks).includes('<!channel>'));
    assert.ok(JSON.stringify(payload.blocks).includes('&lt;!channel&gt; fix it &amp; ship'));
  }
  assert.ok(messages.tidy('a'.repeat(500)).length <= 150);
});

test('/versus validates its two characters privately', () => {
  const quotes = new QuotesManager('');
  for (const input of ['', 'frodo', 'frodo sauron']) {
    const payload = messages.versus(quotes, input);
    assert.equal(payload.response_type, 'ephemeral');
    assert.match(payload.text, /Usage/);
  }
  assert.equal(messages.versus(quotes, 'Frodo GOLLUM').response_type, 'in_channel');
});

test('every command builds a valid Slack message', () => {
  const quotes = new QuotesManager('');
  const builders = {
    frodo: t => messages.character(quotes, 'frodo', t),
    gandalf: t => messages.character(quotes, 'gandalf', t),
    legolas: t => messages.character(quotes, 'legolas', t),
    gollum: t => messages.character(quotes, 'gollum', t),
    fellowship: () => messages.fellowship(quotes),
    council: t => messages.council(quotes, t),
    versus: () => messages.versus(quotes, 'gandalf legolas'),
    wisdom: () => messages.wisdom(quotes),
    quest: t => messages.quest(quotes, t),
    lotr: t => messages.lotr(quotes, t)
  };
  const allowed = new Set(['header', 'section', 'context', 'divider']);

  for (const [name, build] of Object.entries(builders)) {
    for (const input of ['', 'deploy on friday', 'x'.repeat(4000)]) {
      for (let i = 0; i < 25; i++) {
        const payload = build(input);
        assert.equal(payload.response_type, 'in_channel', name);
        assert.ok(payload.text && payload.text.length < 3000, `${name} text`);
        assert.ok(payload.blocks.length >= 1 && payload.blocks.length <= 50, `${name} blocks`);
        for (const block of payload.blocks) {
          assert.ok(allowed.has(block.type), `${name} block type ${block.type}`);
          if (block.type === 'header') {
            assert.equal(block.text.type, 'plain_text');
            assert.ok(block.text.text.length <= 150);
          }
          if (block.type === 'section') {
            assert.equal(block.text.type, 'mrkdwn');
            assert.ok(block.text.text.length <= 3000);
          }
          if (block.type === 'context') {
            assert.ok(block.elements.length >= 1 && block.elements.length <= 10);
          }
        }
        // Slack bold is *single* asterisks; doubled ones show up literally.
        assert.ok(!allText(payload).includes('**'), `${name} has literal **`);
      }
    }
  }
});

test('/lotr reaches every kind of reply', () => {
  const quotes = new QuotesManager('');
  const headers = repeat(() => {
    const first = messages.lotr(quotes, 'ship it').blocks[0];
    return first.type === 'header' ? first.text.text : 'single quote';
  }, 400);
  for (const expected of ['single quote', 'Fellowship', 'Council', 'quest']) {
    assert.ok([...headers].some(h => h.includes(expected)), `never saw ${expected}`);
  }
});

test('the manifest registers exactly the commands the bot handles', () => {
  const { COMMANDS } = require('../slack');
  const declared = manifest.features.slash_commands.map(c => c.command).sort();
  assert.deepEqual(declared, Object.keys(COMMANDS).sort());
  assert.equal(manifest.settings.socket_mode_enabled, true);
  assert.ok(manifest.display_information.name.length <= 35);
  assert.ok(manifest.display_information.description.length <= 140);
  for (const command of manifest.features.slash_commands) {
    assert.ok(command.command.length <= 32);
  }
});
