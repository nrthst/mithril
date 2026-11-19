const test = require('node:test');
const assert = require('node:assert/strict');

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
