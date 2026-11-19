// Builds the Slack message for each command. Every builder takes the quotes
// manager plus whatever the user typed, and returns a payload for `respond()`:
// Block Kit blocks for the layout and plain `text` for notifications.

const { CHARACTERS, GUESTS, tokenize, wanted } = require('./quotes');

const CAST = Object.keys(CHARACTERS);
const MAX_INPUT = 150;

const pick = list => list[Math.floor(Math.random() * list.length)];

// A cast member or a guest, by key.
const who = key => CHARACTERS[key] || GUESTS[key];

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

// A speaker's name with their line as a block quote underneath. `aside` is a
// short stage direction shown after the name.
function speech(key, line, { verbatim = true, aside } = {}) {
  const { icon, name } = who(key);
  const body = verbatim ? `“${escapeText(line)}”` : line;
  const label = aside ? `${icon}  *${name}*  _${aside}_` : `${icon}  *${name}*`;
  return section(`${label}\n>${body}`);
}

const plain = (key, line) => `${who(key).icon} ${who(key).name}: “${line}”`;

const inChannel = (text, blocks) => ({ response_type: 'in_channel', text, blocks });
const onlyYou = text => ({ response_type: 'ephemeral', text });

// One reply from the quotes manager as a block plus its plain-text version.
// When the line belongs to a guest (Gimli's "That still only counts as one!"),
// the guest is shown cutting in on the character who was asked.
function spoken(asked, { speaker, line }) {
  const aside = speaker === asked ? undefined : `cutting in on ${who(asked).name}`;
  return { block: speech(speaker, line, { aside }), text: plain(speaker, line) };
}

// Gollum coveting whatever `input` asks for, or null when it names nothing.
function coveting(quotes, input) {
  const thing = tidy(wanted(input)).replace(/[*_~`]/g, '').trim();
  if (!thing) return null;
  const line = quotes.gollumWants(`*${thing}*`, input);
  return {
    block: speech('gollum', line, { verbatim: false }),
    text: `${CHARACTERS.gollum.icon} Gollum: ${line.replace(/\*/g, '')}`
  };
}

// --- Commands --------------------------------------------------------------

// /frodo, /gandalf, /legolas, /gollum
function character(quotes, key, input) {
  const about = tidy(input);
  const said = (key === 'gollum' && about && coveting(quotes, input)) || spoken(key, quotes.reply(key, input));
  const blocks = [said.block];
  if (about && key !== 'gollum') blocks.push(context(`On: ${about}`));
  return inChannel(said.text, blocks);
}

// /fellowship [topic]
function fellowship(quotes, input) {
  const topic = tidy(input);
  // Gollum joins in by coveting the topic, but only when coveting is what it
  // calls for: "coffee" yes, "merge without tests" no.
  const covetable = topic && quotes.bestFor(input).includes('gollum');
  const lines = CAST.map(key =>
    (key === 'gollum' && covetable && coveting(quotes, input)) || spoken(key, quotes.rally(key, input))
  );
  return inChannel('The Fellowship speaks. The fellowship stands with you!', [
    header('🗡️ The Fellowship speaks'),
    ...(topic ? [context(`On: ${topic}`)] : []),
    ...lines.map(said => said.block),
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
    ...members.map(key => spoken(key, quotes.reply(key, input)).block),
    divider(),
    context('The council has spoken.')
  ]);
}

// Every name /versus understands: "frodo", "Frodo", "smeagol", "mithrandir"...
const NAMES = {};
for (const [key, { name, aliases }] of Object.entries(CHARACTERS)) {
  for (const alias of [key, name.toLowerCase(), ...aliases]) NAMES[alias] = key;
}
const VERSUS_FILLER = new Set(['vs', 'v', 'versus', 'and', 'against', 'x', 'or']);

// /versus <character> [vs] <character>
function versus(quotes, input) {
  // tokenize() also strips accents and punctuation: "Sméagol, Gandalf" works.
  const names = tokenize(input).filter(word => word !== '|' && !VERSUS_FILLER.has(word));
  const [first, second] = names.map(name => NAMES[name]);
  if (names.length !== 2 || !first || !second || first === second) {
    return onlyYou(
      `⚠️ Usage: /versus frodo vs gollum\nChoose two different characters from: ${CAST.join(', ')}`
    );
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
    speech('frodo', quotes.volunteer()),
    divider(),
    context('⚔️ Your fellowship awaits. Will you accept this quest?')
  ]);
}

// Text that starts with one of these reads as a job to be done.
const TASK_VERBS = new Set([
  'add', 'audit', 'automate', 'build', 'clean', 'configure', 'create', 'debug', 'design', 'document', 'draft',
  'finish', 'fix', 'implement', 'investigate', 'migrate', 'organise', 'organize', 'prepare', 'refactor',
  'remove', 'rename', 'replace', 'research', 'rewrite', 'schedule', 'set', 'setup', 'test', 'triage',
  'update', 'upgrade', 'write'
]);
const looksLikeTask = input => TASK_VERBS.has(tokenize(input)[0]);

const HELP = [
  ['/lotr [anything]', 'whoever fits your text best answers. With no text, a surprise'],
  ['/frodo [situation]', 'burdens, beginnings and not being able to go on'],
  ['/gandalf [situation]', 'a warning for risky moves, or wisdom'],
  ['/legolas [achievement]', 'your achievement, downplayed'],
  ['/gollum [thing]', 'Gollum covets whatever you name'],
  ['/fellowship [topic]', 'a pep talk from all four'],
  ['/council [topic]', 'Frodo, Gandalf and Legolas weigh in'],
  ['/versus frodo vs gollum', 'a quote battle between two characters'],
  ['/wisdom', 'a line worth pausing on'],
  ['/quest [task]', 'your task, announced as a quest']
];

// /lotr help
function help() {
  return onlyYou(
    ['🧙‍♂️ *Slack of the Rings*', ...HELP.map(([usage, what]) => `• \`${usage}\`  ${what}`)].join('\n')
  );
}

// /lotr [text] — one command to rule them all. It sends the text to whoever
// it suits best: a character whose situation it describes, /quest when it
// reads as a task, and otherwise a surprise.
function lotr(quotes, input) {
  if (/^(help|commands?|\?)$/i.test(String(input || '').trim())) return help();

  if (!tidy(input)) {
    return pick([
      ...CAST.map(key => () => character(quotes, key, '')),
      () => fellowship(quotes, ''),
      () => wisdom(quotes)
    ])();
  }

  const fitting = quotes.bestFor(input);
  if (fitting.length > 0) return character(quotes, pick(fitting), input);
  if (looksLikeTask(input)) return quest(quotes, input);

  return pick([
    ...['frodo', 'gandalf', 'legolas'].map(key => () => character(quotes, key, input)),
    () => council(quotes, input),
    () => fellowship(quotes, input)
  ])();
}

module.exports = { character, fellowship, council, versus, wisdom, quest, lotr, help, tidy, escapeText, HELP };
