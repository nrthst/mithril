const axios = require('axios');

const API_BASE = 'https://the-one-api.dev/v2';

// The cast. `apiName` is how The One API lists each character.
const CHARACTERS = {
  frodo: { name: 'Frodo', apiName: 'Frodo Baggins', icon: '💍' },
  gandalf: { name: 'Gandalf', apiName: 'Gandalf', icon: '🧙‍♂️' },
  legolas: { name: 'Legolas', apiName: 'Legolas', icon: '🏹' },
  gollum: { name: 'Gollum', apiName: 'Gollum', icon: '🐟' }
};

// Built-in quotes. Used when no API token is set or the API is unreachable.
const FALLBACK_QUOTES = {
  frodo: [
    "I will take the Ring, though I do not know the way.",
    "I wish the Ring had never come to me. I wish none of this had happened.",
    "I can't do this, Sam. Not anymore.",
    "There is no real going back. Though I may come to the Shire, it will not seem the same.",
    "It's a burden I must carry alone."
  ],
  gollum: [
    "My precious!",
    "We wants it, we needs it. Must have the precious!",
    "Tricksy little hobbitses!",
    "What has it got in its pocketses?",
    "Sneaky little hobbitses. Wicked, tricksy, false!",
    "Give it to us raw and wriggling!"
  ],
  legolas: [
    "That still only counts as one!",
    "A red sun rises. Blood has been spilled this night.",
    "They're taking the hobbits to Isengard!",
    "I see shapes of Men and of horses, and pale banners like shreds of cloud.",
    "Final count: forty-two."
  ],
  gandalf: [
    "You shall not pass!",
    "A wizard is never late, nor is he early. He arrives precisely when he means to.",
    "All we have to decide is what to do with the time that is given us.",
    "Even the very wise cannot see all ends.",
    "Fly, you fools!",
    "Many that live deserve death. And some that die deserve life. Can you give it to them?",
    "I will not say: do not weep; for not all tears are an evil."
  ]
};

// Hand-picked lines for specific situations. Keyword-searching the full API
// pool pulled in unrelated quotes (any Gandalf line containing "fool"), so the
// context-aware commands choose from these instead. The first rule whose
// keywords appear in the user's text wins.
const SITUATIONS = {
  frodo: [
    {
      keywords: ["can't", 'cant', 'continue', 'go on', 'keep going', 'anymore', 'give up', 'quit'],
      quotes: ["I can't do this, Sam. Not anymore."]
    },
    {
      keywords: ['overwhelm', 'burden', 'heavy', 'tired', 'exhaust', 'hard', 'stress', 'too much'],
      quotes: [
        "I wish the Ring had never come to me. I wish none of this had happened.",
        "It's a burden I must carry alone."
      ]
    },
    {
      keywords: ['start', 'begin', 'take', 'accept', 'do it', 'volunteer', 'kick off', 'new project'],
      quotes: ["I will take the Ring, though I do not know the way."]
    }
  ],
  gandalf: [
    {
      keywords: ['deploy', 'merge', 'push', 'release', 'without test', 'no test', 'skip', 'force', 'friday'],
      quotes: ["You shall not pass!", "Fly, you fools!"]
    },
    {
      keywords: ['late', 'deadline', 'behind', 'delay', 'overdue', 'out of time'],
      quotes: ["A wizard is never late, nor is he early. He arrives precisely when he means to."]
    },
    {
      keywords: ['decide', 'choice', 'choose', 'decision', 'what to do', 'option'],
      quotes: [
        "All we have to decide is what to do with the time that is given us.",
        "Even the very wise cannot see all ends."
      ]
    }
  ],
  legolas: [
    {
      keywords: ['fixed', 'closed', 'completed', 'deployed', 'finished', 'solved', 'shipped', 'merged', 'launched', 'done'],
      quotes: ["That still only counts as one!"]
    }
  ]
};

// Gollum doesn't quote, he covets. These are written in his voice around
// whatever the user asked for; `%s` is replaced with it.
const GOLLUM_WANTS = [
  {
    keywords: ['access', 'permission', 'password', 'login', 'admin', 'credential', 'key'],
    lines: ["What has it got in its pocketses? %s? Tricksy! We wants it!"]
  },
  {
    keywords: ['food', 'coffee', 'drink', 'lunch', 'dinner', 'breakfast', 'pizza', 'snack', 'cake', 'tea', 'beer', 'fish'],
    lines: ["We wants it, we needs it! Must have the %s… raw and wriggling!"]
  },
  {
    keywords: ['code', 'deploy', 'merge', 'review', 'approval', 'commit', 'branch', 'pull request'],
    lines: ["%s… it's ours, it is, and we wants it. My precious!"]
  }
];
const GOLLUM_DEFAULT = [
  "We wants it, we needs it. Must have the %s, precious!",
  "%s! Is it tasty? Is it scrumptious? We wants it, precious!"
];

// /wisdom draws from lines that actually read as wisdom.
const WISDOM = [
  ['gandalf', "All we have to decide is what to do with the time that is given us."],
  ['gandalf', "Even the very wise cannot see all ends."],
  ['gandalf', "I will not say: do not weep; for not all tears are an evil."],
  ['gandalf', "Many that live deserve death. And some that die deserve life. Can you give it to them?"],
  ['frodo', "There is no real going back. Though I may come to the Shire, it will not seem the same."]
];

const MIN_LENGTH = 12;   // drops fragments like "Sam!"
const MAX_LENGTH = 280;  // keeps replies readable in a channel
const MIN_POOL = 5;      // fewer usable quotes than this: keep the built-in set

const pick = list => list[Math.floor(Math.random() * list.length)];

// True when any keyword starts a word in `text` ("late" matches "late" and
// "later", but not "translate").
function matchesAny(text, keywords) {
  const haystack = String(text || '').toLowerCase().replace(/[‘’]/g, "'");
  return keywords.some(keyword => {
    const pattern = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${pattern}`).test(haystack);
  });
}

// Normalise raw API dialog: collapse whitespace, drop fragments and duplicates.
function cleanQuotes(docs) {
  const seen = new Set();
  const out = [];
  for (const doc of docs || []) {
    const quote = String((doc && doc.dialog) || '').replace(/\s+/g, ' ').trim();
    if (quote.length < MIN_LENGTH || quote.length > MAX_LENGTH) continue;
    const key = quote.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(quote);
  }
  return out;
}

class QuotesManager {
  constructor(apiToken) {
    this.apiToken = apiToken;
    this.quotes = {};
    this.source = 'built-in quotes';
    this.useFallbackQuotes();
  }

  useFallbackQuotes() {
    for (const key of Object.keys(CHARACTERS)) {
      this.quotes[key] = [...FALLBACK_QUOTES[key]];
    }
    this.initialized = true;
  }

  // Load the full quote pool from The One API. Never throws: any failure
  // leaves the built-in quotes in place so the bot still answers.
  async initialize() {
    if (!this.apiToken) {
      console.log('📜 No LOTR_API_TOKEN set, using built-in quotes.');
      return;
    }

    console.log('🔮 Fetching quotes from The One API...');
    try {
      const ids = await this.fetchCharacterIds();
      for (const key of Object.keys(CHARACTERS)) {
        if (!ids[key]) continue;
        const quotes = await this.fetchQuotes(ids[key]);
        if (quotes.length >= MIN_POOL) this.quotes[key] = quotes;
      }
      this.source = 'The One API';
    } catch (error) {
      console.error('⚠️  Could not reach The One API, using built-in quotes:', error.message);
      this.useFallbackQuotes();
    }

    for (const [key, character] of Object.entries(CHARACTERS)) {
      console.log(`   ${character.name}: ${this.quotes[key].length} quotes`);
    }
  }

  get headers() {
    return { Authorization: `Bearer ${this.apiToken}` };
  }

  async fetchCharacterIds() {
    const response = await axios.get(`${API_BASE}/character`, {
      headers: this.headers,
      params: { limit: 1000 }
    });
    const ids = {};
    for (const [key, character] of Object.entries(CHARACTERS)) {
      const match = response.data.docs.find(doc => doc.name === character.apiName);
      if (match) ids[key] = match._id;
    }
    return ids;
  }

  async fetchQuotes(characterId) {
    const response = await axios.get(`${API_BASE}/character/${characterId}/quote`, {
      headers: this.headers,
      params: { limit: 1000 }
    });
    return cleanQuotes(response.data.docs);
  }

  // Any quote from this character's pool.
  random(character) {
    const pool = this.quotes[character];
    return pool && pool.length ? pick(pool) : pick(FALLBACK_QUOTES[character]);
  }

  // A quote that fits what the user typed, or a random one if nothing fits.
  forSituation(character, text) {
    const rule = (SITUATIONS[character] || []).find(r => matchesAny(text, r.keywords));
    return rule ? pick(rule.quotes) : this.random(character);
  }

  // Gollum coveting `thing`. `thing` is inserted as given, so format it first.
  gollumWants(thing, matchText = thing) {
    const rule = GOLLUM_WANTS.find(r => matchesAny(matchText, r.keywords));
    return pick(rule ? rule.lines : GOLLUM_DEFAULT).replace('%s', () => thing);
  }

  wisdom() {
    const [character, quote] = pick(WISDOM);
    return { character, quote };
  }
}

module.exports = QuotesManager;
module.exports.CHARACTERS = CHARACTERS;
module.exports.FALLBACK_QUOTES = FALLBACK_QUOTES;
module.exports.SITUATIONS = SITUATIONS;
module.exports.matchesAny = matchesAny;
module.exports.cleanQuotes = cleanQuotes;
