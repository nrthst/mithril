const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const axios = require('axios');

const { createAppUrl, askForTokens, envFile } = require('../setup');
const QuotesManager = require('../quotes');
const {
  CHARACTERS, GUESTS, SITUATIONS, GOLLUM_WANTS, GOLLUM_DEFAULT, FALLBACK_QUOTES, RALLY, WISDOM,
  matchesAny, cleanQuotes, tokenize, wanted
} = QuotesManager;
const messages = require('../messages');
const manifest = require('../manifest.json');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const repeat = (fn, times = 60) => new Set(Array.from({ length: times }, fn));
const allText = payload => JSON.stringify(payload);
const lineOf = entry => (typeof entry === 'string' ? entry : entry.line);
const rulesFor = character => (character === 'gollum' ? GOLLUM_WANTS : SITUATIONS[character]);
const rule = (character, id) => rulesFor(character).find(r => r.id === id);
const matched = (character, text) => (new QuotesManager('').match(character, text) || { rule: null }).rule;

// A manager whose pools hold decoys that a keyword search of the pool would pick.
function managerWithDecoys() {
  const quotes = new QuotesManager('');
  quotes.quotes.gandalf = ['A fool, but an honest fool he remains.', 'What time is it now?'];
  quotes.quotes.frodo = ['I will not go that way.', 'Take it away from me.'];
  quotes.quotes.legolas = ['The stars are veiled tonight.'];
  return quotes;
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

test('keywords match whole words and their ordinary endings', () => {
  for (const [text, keyword] of [
    ['running late again', 'late'],
    ['Feeling OVERWHELMED', 'overwhelm'],
    ['I can’t continue', "can't"],
    ['deploying now', 'deploy'],
    ['the deployment', 'deploy'],
    ['merging it', 'merge'],
    ['we shipped', 'ship'],
    ['quitting', 'quit'],
    ['so worried', 'worry'],
    ['two api keys', 'api key'],
    ['without any tests', 'without ~ test'],
    ['without tests', 'without ~ test']
  ]) {
    assert.ok(matchesAny(text, [keyword]), `"${keyword}" should match "${text}"`);
  }

  for (const [text, keyword] of [
    ['translate the template', 'late'],
    ['the latest build', 'late'],
    ['team offsite', 'tea'],
    ['new keyboard', 'key'],
    ['hardware refresh', 'hard'],
    ['hardly', 'hard'],
    ['the product', 'prod'],
    ['restore it', 'rest'],
    ['deployed', '=deploy'],
    ['without all of the many tests', 'without ~ test'],
    ['', 'late']
  ]) {
    assert.ok(!matchesAny(text, [keyword]), `"${keyword}" should not match "${text}"`);
  }
});

test('mentions, channels, links and emoji cannot trigger a keyword', () => {
  for (const text of [
    'see <https://example.com/deploy-on-friday>',
    'see https://example.com/merge/without/tests',
    'ask @deploy-bot in #release-friday',
    'ask <@U024DEPLOY> in <#C024FRIDAY|deploy-friday>',
    'mail deploy@friday.example',
    ':deploy: :friday:'
  ]) {
    assert.equal(matched('gandalf', text), null, text);
  }
  // The visible label of a link is ordinary text.
  assert.equal(matched('gandalf', '<https://example.com/x|merge without tests>'), 'reckless');
  assert.deepEqual(tokenize('Sméagol, DON’T!'), ['smeagol', '|', 'dont', '|']);
});

// Realistic phrases and the situation each should be read as (null: none, so
// the character falls back to a random quote).
const PHRASES = [
  // Gandalf: risky intent gets a warning, reported success does not.
  ['gandalf', 'merge without tests', 'reckless'],
  ['gandalf', 'merge without any tests', 'reckless'],
  ['gandalf', 'about to deploy on friday', 'reckless'],
  ['gandalf', 'deploy to production', 'reckless'],
  ['gandalf', 'skip review', 'reckless'],
  ['gandalf', 'force push to main', 'reckless'],
  ['gandalf', 'pushed to main without review', 'reckless'],
  ['gandalf', 'deployed on friday', 'reckless'],
  ['gandalf', 'deployed successfully', 'success'],
  ['gandalf', 'merge with tests passing', 'success'],
  ['gandalf', 'shipped it, tests green', 'success'],
  ['gandalf', "don't skip the tests", null],
  ['gandalf', 'never deploy on friday', null],
  ['gandalf', 'the push notification', null],
  ['gandalf', 'latest release notes', null],
  ['gandalf', 'translate the template', null],
  ['gandalf', 'hardware budget', null],
  ['gandalf', 'prod is down', 'incident'],
  ['gandalf', 'tests are not passing', 'incident'],
  ['gandalf', 'I broke the build', 'mistake'],
  ['gandalf', 'missed the deadline', 'timing'],
  ['gandalf', 'running late', 'timing'],
  ['gandalf', 'pushed back the release', 'timing'],
  ['gandalf', 'need this asap', 'haste'],
  ['gandalf', 'tough decision', 'decision'],
  ['gandalf', 'should we deploy?', 'decision'],
  ['gandalf', 'can I share the api key', 'secrets'],
  ['gandalf', 'locked out of my account', 'access'],
  ['gandalf', 'nervous about the demo', 'courage'],
  ['gandalf', 'who wrote this', 'lost'],
  ['gandalf', 'I need help', 'help'],
  ['gandalf', 'still waiting on review', 'waiting'],
  ['gandalf', 'sprint planning', 'kickoff'],
  ['gandalf', "it's my last day", 'farewell'],
  ['gandalf', "I'm back", 'return'],
  ['gandalf', 'too many meetings', 'quiet'],
  ['gandalf', 'a cup of tea', 'drink'],
  ['gandalf', 'team offsite', null],

  // Legolas: only a finished achievement is downplayed.
  ['legolas', 'closed 10 tickets', 'achievement'],
  ['legolas', 'deployed to production', 'achievement'],
  ['legolas', 'fixed critical bug', 'achievement'],
  ['legolas', 'not done yet', 'unfinished'],
  ['legolas', "haven't finished the report", 'unfinished'],
  ['legolas', 'almost done', 'unfinished'],
  ['legolas', 'going to fix the bug', null],
  ['legolas', 'how many tickets', 'count'],
  ['legolas', 'the build is red', 'incident'],
  ['legolas', 'something feels off', 'omen'],
  ['legolas', 'legacy codebase', 'legacy'],
  ['legolas', 'they are taking my team', 'taken'],
  ['legolas', "he won't listen", 'stubborn'],
  ['legolas', 'team effort', 'together'],
  ['legolas', 'happy hour', 'drinks'],
  ['legolas', "didn't sleep", 'rough'],
  ['legolas', 'access denied', 'blocked'],
  ['legolas', 'what happened', 'explain'],
  ['legolas', 'falling behind', 'hurry'],
  ['legolas', 'of course it broke again', 'unsurprised'],
  ['legolas', 'we lost the backup', 'hope'],

  // Frodo
  ['frodo', "can't continue", 'giving-up'],
  ['frodo', 'I can’t do this anymore', 'giving-up'],
  ['frodo', 'feeling overwhelmed', 'burden'],
  ['frodo', 'this is hard', 'burden'],
  ['frodo', 'on call this weekend', 'burden'],
  ['frodo', 'hardly working', null],
  ['frodo', 'hardware upgrade', null],
  ['frodo', 'starting a new project', 'start'],
  ['frodo', "it's finally done", 'done'],
  ['frodo', 'not done', null],
  ['frodo', 'thanks for the help', 'thanks'],
  ['frodo', 'what is he hiding', 'secrets'],
  ['frodo', 'can we trust this vendor', 'trust'],
  ['frodo', 'same bug again', 'circles'],
  ['frodo', 'what could go wrong', 'tempting-fate'],
  ['frodo', 'running late', 'late'],
  ['frodo', 'prod is down', 'danger'],
  ['frodo', 'heading home', 'home'],
  ['frodo', "it's my last day", 'farewell'],
  ['frodo', 'lunch?', 'food'],

  // Gollum: which kind of thing is wanted.
  ['gollum', 'coffee', 'food'],
  ['gollum', 'I really need some coffee', 'food'],
  ['gollum', 'tea', 'food'],
  ['gollum', 'team offsite', null],
  ['gollum', 'production access', 'access'],
  ['gollum', 'the admin password', 'access'],
  ['gollum', 'a new keyboard', 'stuff'],
  ['gollum', 'my stapler', 'stuff'],
  ['gollum', 'code review approval', 'code'],
  ['gollum', 'a raise', 'money'],
  ['gollum', 'the weekend', 'rest']
];

test(`${PHRASES.length} realistic phrases are read as the right situation`, () => {
  assert.ok(PHRASES.length >= 60);
  for (const [character, text, expected] of PHRASES) {
    assert.equal(matched(character, text), expected, `/${character} ${text}`);
  }
});

test('every situation is exercised by at least one phrase', () => {
  for (const character of Object.keys(CHARACTERS)) {
    for (const { id } of rulesFor(character)) {
      assert.ok(PHRASES.some(([who, , expected]) => who === character && expected === id), `${character}/${id}`);
    }
  }
});

test('situations return only their hand-picked quotes', () => {
  const quotes = managerWithDecoys();
  for (const [character, text, expected] of PHRASES) {
    if (character === 'gollum' || !expected) continue;
    const allowed = rule(character, expected).quotes.map(lineOf);
    for (const line of repeat(() => quotes.reply(character, text).line, 30)) {
      assert.ok(allowed.includes(line), `/${character} ${text} gave "${line}"`);
    }
  }
});

test('no matching keyword falls back to the full pool', () => {
  const quotes = managerWithDecoys();
  const seen = repeat(() => quotes.reply('gandalf', 'lunch').line);
  assert.deepEqual([...seen].sort(), [...quotes.quotes.gandalf].sort());
  assert.equal(quotes.reply('gandalf', 'lunch').rule, null);
});

test('the same line is never given twice in a row when there is another', () => {
  const quotes = new QuotesManager('');
  for (const [character, text] of [['gandalf', 'merge without tests'], ['frodo', 'feeling overwhelmed'], ['legolas', 'closed 10 tickets'], ['gollum', '']]) {
    let previous = null;
    for (let i = 0; i < 40; i++) {
      const { line } = quotes.reply(character, text);
      assert.notEqual(line, previous, `/${character} ${text} repeated "${line}"`);
      previous = line;
    }
  }
  let previous = null;
  for (let i = 0; i < 40; i++) {
    const line = quotes.gollumWants('*cake*', 'cake');
    assert.notEqual(line, previous);
    previous = line;
  }
});

// ---------------------------------------------------------------------------
// The lines themselves
// ---------------------------------------------------------------------------

test('"That still only counts as one!" is Gimli\'s line, and Gimli says it', () => {
  const quotes = new QuotesManager('');
  const seen = new Map();
  for (let i = 0; i < 40; i++) {
    const reply = quotes.reply('legolas', 'closed 10 tickets');
    seen.set(reply.line, reply.speaker);
  }
  assert.deepEqual(Object.fromEntries(seen), {
    'That still only counts as one!': 'gimli',
    'Final count: 42.': 'legolas'
  });

  for (let i = 0; i < 40; i++) {
    const payload = messages.character(quotes, 'legolas', 'closed 10 tickets');
    const body = payload.blocks[0].text.text;
    if (body.includes('counts as one')) {
      assert.match(body, /\*Gimli\*  _cutting in on Legolas_/);
      assert.match(payload.text, /Gimli: “That still only counts as one!”/);
      assert.doesNotMatch(allText(payload), /\*Legolas\*/);
    } else {
      assert.match(body, /\*Legolas\*\n>“Final count: 42\.”/);
    }
  }

  // Nowhere else is the line attributed to Legolas.
  assert.ok(!FALLBACK_QUOTES.legolas.some(line => line.includes('counts as one')));
  assert.ok(!RALLY.legolas.some(line => line.includes('counts as one')));
});

test('the rules and lines are well formed', () => {
  const speakers = { ...CHARACTERS, ...GUESTS };
  for (const character of Object.keys(CHARACTERS)) {
    const rules = rulesFor(character);
    assert.equal(new Set(rules.map(r => r.id)).size, rules.length, `${character}: duplicate rule id`);
    for (const r of rules) {
      assert.ok(r.about && r.keywords.length > 0, `${character}/${r.id}`);
      assert.equal(new Set(r.keywords).size, r.keywords.length, `${character}/${r.id}: duplicate keyword`);
      if (r.negationOf) assert.ok(rule(character, r.negationOf), `${character}/${r.id}: unknown negationOf`);
      const lines = r.quotes || r.lines;
      assert.ok(lines.length > 0, `${character}/${r.id} has nothing to say`);
      for (const entry of lines) {
        if (typeof entry !== 'string') assert.ok(speakers[entry.by], `${character}/${r.id}: unknown speaker`);
        assert.ok(lineOf(entry).length <= 280);
        if (r.lines) assert.ok(entry.includes('%s'), `${character}/${r.id}: Gollum line without %s`);
      }
    }
  }
  for (const line of GOLLUM_DEFAULT) assert.ok(line.includes('%s'));
  for (const [character, line] of WISDOM) assert.ok(CHARACTERS[character] && line.length > 20);
  for (const key of Object.keys(CHARACTERS)) {
    assert.ok(FALLBACK_QUOTES[key].length >= 15, `${key} needs a decent built-in pool`);
    assert.ok(RALLY[key].length >= 2);
    assert.equal(new Set(FALLBACK_QUOTES[key]).size, FALLBACK_QUOTES[key].length, `${key}: duplicate built-in`);
  }
});

// ---------------------------------------------------------------------------
// The One API
// ---------------------------------------------------------------------------

test('API quotes are tidied, and fragments, glitches and duplicates dropped', () => {
  const cleaned = cleanQuotes([
    { dialog: '  You   shall not\n pass, Balrog!  ' },
    { dialog: 'you shall not pass, balrog' },
    { dialog: 'A red sun rises.Blood has been spilled this night.' },
    { dialog: 'I have not passed through fire and death......to bandy crooked words.' },
    { dialog: 'Wait. This creature is bound to me. Please......Iet me go down to him.' },
    { dialog: "I'm glad to be with you Samwise Gamgee here at the end of all things. They hug." },
    { dialog: 'Sam!' },
    { dialog: 'Yes. Yes. Yes.' },
    { dialog: 'What did you say?' },
    { dialog: 'Nooooo! NOOOOOOOOOOoooooooo! It cannot be so!' },
    { dialog: "He is the lord of the Nazg'l. The greatest of the nine." },
    { dialog: "Smeagol wants to see them'. Dead!" },
    { dialog: 'Kill them, kill them, kill them both!' },
    { dialog: '' },
    {},
    { dialog: 'x '.repeat(200) }
  ]);
  assert.deepEqual(cleaned, [
    'You shall not pass, Balrog!',
    'A red sun rises. Blood has been spilled this night.',
    'I have not passed through fire and death... to bandy crooked words.',
    'Wait. This creature is bound to me. Please... let me go down to him.',
    "I'm glad to be with you Samwise Gamgee here at the end of all things."
  ]);
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
      return { data: { docs: Object.values(CHARACTERS).map(c => ({ _id: c.apiName, name: c.apiName })) } };
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

test('API quotes join the built-in ones without duplicating them', async () => {
  const fromApi = [
    'A wizard is never late! Frodo Baggins. Nor is he early, he arrives precisely when he means to.',
    'You shall not pass!',
    ...Array.from({ length: 6 }, (_, i) => `This is film line number ${i} for the test.`)
  ];
  const quotes = new QuotesManager('some-token');
  await withApi(fakeApi(who => (who === 'Gandalf' ? fromApi : [])), () => quotes.initialize());
  assert.equal(quotes.quotes.gandalf.length, FALLBACK_QUOTES.gandalf.length + 6);
  assert.ok(FALLBACK_QUOTES.gandalf.every(line => quotes.quotes.gandalf.includes(line)));
  assert.ok(!quotes.quotes.gandalf.includes(fromApi[0]), 'the untidy API wording should give way to the built-in one');
});

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

test('the README setup link carries the current manifest', () => {
  const match = read('README.md').match(/^\[create-app\]: (\S+)$/m);
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

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

test('gollum picks out the thing being asked for', () => {
  for (const [input, thing] of [
    ['coffee', 'coffee'],
    ['I really need some coffee', 'coffee'],
    ['I really need some coffee, please!', 'coffee'],
    ['we want the admin password', 'admin password'],
    ['can I have the last donut?', 'last donut'],
    ['gimme a raise right now', 'raise'],
    ["I'd love a nap", 'nap'],
    ['i would kill for some pizza', 'pizza'],
    ['production access', 'production access'],
    ['my precious', 'precious'],
    ['the', 'the'],
    ['please', 'please']
  ]) {
    assert.equal(wanted(input), thing, input);
  }
});

test('gollum covets what the user asked for', () => {
  const quotes = new QuotesManager('');
  const coffee = repeat(() => allText(messages.character(quotes, 'gollum', 'I really need some coffee')), 20);
  for (const payload of coffee) {
    assert.match(payload, /\*coffee\*/);
    assert.doesNotMatch(payload, /really need/);
    assert.match(payload, /raw and wriggling|juicy sweet/);
  }
  assert.match(allText(messages.character(quotes, 'gollum', 'production access')), /pocketses/);
  assert.match(allText(messages.character(quotes, 'gollum', 'team offsite')), /\*team offsite\*/);
  assert.doesNotMatch(allText(messages.character(quotes, 'gollum', 'team offsite')), /raw and wriggling|juicy/);

  // With nothing to covet he just quotes.
  for (const input of ['', '   ', '***']) {
    const bare = messages.character(quotes, 'gollum', input);
    assert.ok(FALLBACK_QUOTES.gollum.some(q => allText(bare).includes(q.slice(0, 10))), `"${input}"`);
  }
});

test('user text cannot trigger mentions or break formatting', () => {
  const quotes = new QuotesManager('');
  for (const build of [
    () => messages.quest(quotes, '<!channel> fix it & ship'),
    () => messages.council(quotes, '<!channel> fix it & ship'),
    () => messages.fellowship(quotes, '<!channel> fix it & ship'),
    () => messages.character(quotes, 'gollum', '<!channel> fix it & ship'),
    () => messages.character(quotes, 'frodo', '<!channel> fix it & ship')
  ]) {
    const payload = build();
    assert.ok(!JSON.stringify(payload.blocks).includes('<!channel>'));
    assert.ok(JSON.stringify(payload.blocks).includes('&lt;!channel&gt; fix it &amp; ship'));
  }
  assert.ok(messages.tidy('a'.repeat(500)).length <= 150);
});

test('/versus understands names, aliases and "vs", and corrects mistakes privately', () => {
  const quotes = new QuotesManager('');
  for (const input of ['', 'frodo', 'frodo sauron', 'frodo frodo', 'frodo gandalf legolas', 'gimli legolas']) {
    const payload = messages.versus(quotes, input);
    assert.equal(payload.response_type, 'ephemeral', input);
    assert.match(payload.text, /Usage/);
  }
  for (const [input, title] of [
    ['Frodo GOLLUM', 'Frodo vs Gollum'],
    ['frodo vs gollum', 'Frodo vs Gollum'],
    ['gandalf vs. legolas', 'Gandalf vs Legolas'],
    ['Sméagol, Mithrandir', 'Gollum vs Gandalf'],
    ['legolas versus baggins', 'Legolas vs Frodo'],
    ['gandalf and frodo', 'Gandalf vs Frodo']
  ]) {
    const payload = messages.versus(quotes, input);
    assert.equal(payload.response_type, 'in_channel', input);
    assert.equal(payload.text, `Quote battle: ${title}`);
  }
});

test('/fellowship speaks to the topic when it has one', () => {
  const quotes = new QuotesManager('');
  const bare = messages.fellowship(quotes, '');
  assert.equal(bare.blocks.filter(b => b.type === 'section').length, 4);
  assert.ok(!allText(bare).includes('On:'));

  const topical = messages.fellowship(quotes, 'merge without tests');
  assert.ok(allText(topical).includes('On: merge without tests'));
  const gandalf = topical.blocks.find(b => b.type === 'section' && b.text.text.includes('*Gandalf*'));
  assert.ok(rule('gandalf', 'reckless').quotes.some(line => gandalf.text.text.includes(line.slice(0, 12))));

  // Gollum covets the topic only when it is a thing to covet.
  assert.match(allText(messages.fellowship(quotes, 'coffee')), /\*coffee\*/);
  assert.doesNotMatch(allText(messages.fellowship(quotes, 'merge without tests')), /\*merge without tests\*/);
});

test('every command builds a valid Slack message', () => {
  const quotes = new QuotesManager('');
  const builders = {
    frodo: t => messages.character(quotes, 'frodo', t),
    gandalf: t => messages.character(quotes, 'gandalf', t),
    legolas: t => messages.character(quotes, 'legolas', t),
    gollum: t => messages.character(quotes, 'gollum', t),
    fellowship: t => messages.fellowship(quotes, t),
    council: t => messages.council(quotes, t),
    versus: () => messages.versus(quotes, 'gandalf legolas'),
    wisdom: () => messages.wisdom(quotes),
    quest: t => messages.quest(quotes, t),
    lotr: t => messages.lotr(quotes, t)
  };
  const allowed = new Set(['header', 'section', 'context', 'divider']);

  for (const [name, build] of Object.entries(builders)) {
    for (const input of ['', 'deploy on friday', 'closed 10 tickets', 'fix the login page', 'x'.repeat(4000)]) {
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
        assert.ok(!allText(payload).includes('undefined'), `${name} has "undefined"`);
      }
    }
  }
});

test('/lotr sends the text to whoever it suits', () => {
  const quotes = new QuotesManager('');
  const firstBlocks = input => repeat(() => {
    const first = messages.lotr(quotes, input).blocks[0];
    return first.type === 'header' ? first.text.text : first.text.text.split('*')[1];
  }, 300);

  // A situation one character knows goes to that character, every time.
  assert.deepEqual([...firstBlocks('merge without tests')], ['Gandalf']);
  assert.deepEqual([...firstBlocks('feeling overwhelmed')], ['Frodo']);
  assert.deepEqual([...firstBlocks('coffee')], ['Gollum']);
  assert.deepEqual([...firstBlocks('closed 10 tickets')].sort(), ['Gimli', 'Legolas']);

  // Something to do becomes a quest.
  assert.deepEqual([...firstBlocks('write the docs')], ['🗡️ A new quest begins']);
  assert.deepEqual([...firstBlocks('Fix the auth bug')], ['🗡️ A new quest begins']);

  // Anything else is a surprise, but never Gollum coveting a whole sentence.
  const surprise = firstBlocks('purple monkey dishwasher');
  for (const expected of ['Frodo', 'Gandalf', 'Legolas', '⚔️ The Council of Elrond', '🗡️ The Fellowship speaks']) {
    assert.ok(surprise.has(expected), `never saw ${expected}`);
  }
  assert.ok(!surprise.has('Gollum'));

  // No text at all: any character, the fellowship or wisdom.
  const bare = firstBlocks('');
  for (const expected of ['Frodo', 'Gandalf', 'Legolas', 'Gollum', '🗡️ The Fellowship speaks']) {
    assert.ok(bare.has(expected), `never saw ${expected}`);
  }
});

test('/lotr help lists every command, privately', () => {
  const { COMMANDS } = require('../slack');
  const quotes = new QuotesManager('');
  for (const input of ['help', ' HELP ', '?', 'commands']) {
    const payload = messages.lotr(quotes, input);
    assert.equal(payload.response_type, 'ephemeral');
    for (const command of Object.keys(COMMANDS)) {
      assert.ok(payload.text.includes(`\`${command} `) || payload.text.includes(`\`${command}\``), command);
    }
  }
  assert.equal(messages.lotr(quotes, 'help me please').response_type, 'in_channel');
});

// ---------------------------------------------------------------------------
// Documentation
// ---------------------------------------------------------------------------

test('COMMANDS.md documents every situation with an example that triggers it', () => {
  const doc = read('COMMANDS.md');
  const rows = [...doc.matchAll(/^\| (.+?) \| `\/(frodo|gandalf|legolas|gollum) (.+?)` \|$/gm)];
  assert.ok(rows.length > 0, 'no example rows found');

  const documented = new Set();
  for (const [, about, character, text] of rows) {
    const id = matched(character, text);
    assert.ok(id, `"/${character} ${text}" matches nothing`);
    assert.equal(rule(character, id).about, about, `"/${character} ${text}"`);
    documented.add(`${character}/${id}`);
  }
  for (const character of Object.keys(CHARACTERS)) {
    for (const { id } of rulesFor(character)) {
      assert.ok(documented.has(`${character}/${id}`), `COMMANDS.md has no example for ${character}/${id}`);
    }
  }
});

test('the docs mention every command', () => {
  const { COMMANDS } = require('../slack');
  for (const file of ['README.md', 'COMMANDS.md']) {
    for (const command of Object.keys(COMMANDS)) {
      assert.ok(read(file).includes(`\`${command}`), `${file} does not mention ${command}`);
    }
  }
});
