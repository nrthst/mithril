// Builds the Slack message for each command. Every builder takes the quotes
// manager plus whatever the user typed, and returns a payload for `respond()`:
// Block Kit blocks for the layout and plain `text` for notifications.

const { CHARACTERS } = require('./quotes');

const CAST = Object.keys(CHARACTERS);
const MAX_INPUT = 150;

const pick = list => list[Math.floor(Math.random() * list.length)];

// Slack reads <...> as mentions and links, so user text and quotes are escaped
// before they go into a message. Without this, `/quest <!channel>` would ping
// the whole channel.
const escapeText = text =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// What the user typed, made safe to show: one line, trimmed, capped, escaped.
function tidy(input) {
  const text = String(input || '').replace(/\s+/g, ' ').trim();
  const clipped = text.length > MAX_INPUT ? `${text.slice(0, MAX_INPUT - 1)}…` : text;
  return escapeText(clipped);
}

// --- Block helpers ---------------------------------------------------------

const header = text => ({ type: 'header', text: { type: 'plain_text', text, emoji: true } });
const section = text => ({ type: 'section', text: { type: 'mrkdwn', text } });
const context = text => ({ type: 'context', elements: [{ type: 'mrkdwn', text }] });
const divider = () => ({ type: 'divider' });

// A character's name with their line as a block quote underneath.
function speech(key, line, { verbatim = true } = {}) {
  const { icon, name } = CHARACTERS[key];
  const body = verbatim ? `“${escapeText(line)}”` : line;
  return section(`${icon}  *${name}*\n>${body}`);
}

const plain = (key, line) => `${CHARACTERS[key].icon} ${CHARACTERS[key].name}: “${line}”`;

const inChannel = (text, blocks) => ({ response_type: 'in_channel', text, blocks });
const onlyYou = text => ({ response_type: 'ephemeral', text });

// --- Commands --------------------------------------------------------------

// /frodo, /gandalf, /legolas, /gollum
function character(quotes, key, input) {
  const about = tidy(input);

  if (key === 'gollum' && about) {
    const thing = about.replace(/[*_~`]/g, '');
    const line = quotes.gollumWants(`*${thing}*`, input);
    return inChannel(`${CHARACTERS.gollum.icon} Gollum: ${line.replace(/\*/g, '')}`, [
      speech('gollum', line, { verbatim: false })
    ]);
  }

  const quote = quotes.forSituation(key, input);
  const blocks = [speech(key, quote)];
  if (about) blocks.push(context(`On: ${about}`));
  return inChannel(plain(key, quote), blocks);
}

// /fellowship
function fellowship(quotes) {
  const lines = {
    frodo: quotes.forSituation('frodo', 'start'),
    gandalf: quotes.forSituation('gandalf', 'decide'),
    legolas: quotes.random('legolas'),
    gollum: 'My precious!'
  };
  return inChannel('The Fellowship speaks. The fellowship stands with you!', [
    header('🗡️ The Fellowship speaks'),
    ...CAST.map(key => speech(key, lines[key])),
    divider(),
    context('⚔️ The fellowship stands with you.')
  ]);
}

// /council [topic]
function council(quotes, input) {
  const topic = tidy(input) || 'this matter';
  const members = ['frodo', 'gandalf', 'legolas'];
  return inChannel(`The Council of Elrond weighs in on ${topic}.`, [
    header('⚔️ The Council of Elrond'),
    context(`On: ${topic}`),
    ...members.map(key => speech(key, quotes.forSituation(key, input))),
    divider(),
    context('The council has spoken.')
  ]);
}

// /versus <character> <character>
function versus(quotes, input) {
  const names = String(input || '').toLowerCase().split(/\s+/).filter(Boolean);
  const [first, second] = names;
  if (names.length < 2 || !CHARACTERS[first] || !CHARACTERS[second]) {
    return onlyYou(`⚠️ Usage: /versus [character] [character]\nChoose from: ${CAST.join(', ')}`);
  }
  return inChannel(`Quote battle: ${CHARACTERS[first].name} vs ${CHARACTERS[second].name}`, [
    header('⚔️ Quote battle'),
    speech(first, quotes.random(first)),
    context('🆚'),
    speech(second, quotes.random(second)),
    divider(),
    context('Who wins? React to vote.')
  ]);
}

// /wisdom
function wisdom(quotes) {
  const { character: key, quote } = quotes.wisdom();
  return inChannel(plain(key, quote), [
    speech(key, quote),
    context('✨ Wisdom from Middle-earth')
  ]);
}

// /quest [task]
function quest(quotes, input) {
  const task = tidy(input) || 'a mysterious task';
  return inChannel(`A new quest begins: ${task}`, [
    header('🗡️ A new quest begins'),
    section(`📜 *Quest:* ${task}`),
    speech('frodo', quotes.forSituation('frodo', 'start')),
    divider(),
    context('⚔️ Your fellowship awaits. Will you accept this quest?')
  ]);
}

// /lotr [text] — one command to rule them all: runs one of the others at random.
function lotr(quotes, input) {
  const options = [
    ...CAST.map(key => () => character(quotes, key, input)),
    () => fellowship(quotes),
    () => wisdom(quotes)
  ];
  if (tidy(input)) {
    options.push(() => council(quotes, input), () => quest(quotes, input));
  }
  return pick(options)();
}

module.exports = { character, fellowship, council, versus, wisdom, quest, lotr, tidy, escapeText };
