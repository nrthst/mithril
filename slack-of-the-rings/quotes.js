const axios = require('axios');

const API_BASE = 'https://the-one-api.dev/v2';

// A slow or hung API must not hold up startup: after this long the bot gives
// up on the request and carries on with its built-in quotes.
const API_TIMEOUT_MS = 8000;

// Why a request to The One API failed, in words a non-developer can act on.
function describeApiError(error) {
  const status = error && error.response && error.response.status;
  if (status === 401) return 'The One API rejected the token. Check LOTR_API_TOKEN in .env.';
  if (status === 429) return 'The One API rate limit was reached. Try again in ten minutes.';
  if (error && error.code === 'ECONNABORTED') return 'The One API took too long to answer.';
  return `Could not reach The One API (${(error && error.message) || 'unknown error'}).`;
}

// ---------------------------------------------------------------------------
// The cast
// ---------------------------------------------------------------------------

// The four characters with their own commands. `apiName` is how The One API
// lists them; `aliases` are other names /versus accepts.
const CHARACTERS = {
  frodo: { name: 'Frodo', apiName: 'Frodo Baggins', icon: '💍', aliases: ['baggins'] },
  gandalf: { name: 'Gandalf', apiName: 'Gandalf', icon: '🧙‍♂️', aliases: ['mithrandir'] },
  legolas: { name: 'Legolas', apiName: 'Legolas', icon: '🏹', aliases: [] },
  gollum: { name: 'Gollum', apiName: 'Gollum', icon: '🐟', aliases: ['smeagol'] }
};

// Guests have no command. They appear only when the fitting line is theirs:
// "That still only counts as one!" is Gimli's, so he cuts in on Legolas to say it.
const GUESTS = {
  gimli: { name: 'Gimli', apiName: 'Gimli', icon: '🪓' }
};

// ---------------------------------------------------------------------------
// The lines
//
// Every line in this file was checked against The One API (film dialogue):
// same speaker, same words. Punctuation is tidied, and some are a sentence or
// two taken from a longer speech. Lines the API could not confirm were left out.
// ---------------------------------------------------------------------------

// Built-in quotes: each character's pool when no API token is set, and part of
// it when one is.
const FALLBACK_QUOTES = {
  frodo: [
    "I wish the Ring had never come to me. I wish none of this had happened.",
    "I can't do this, Sam.",
    "How do you go on, when in your heart you begin to understand there is no going back?",
    "I'm glad to be with you, Samwise Gamgee, here at the end of all things.",
    "The Ring is my burden.",
    "We set out to save the Shire, Sam, and it has been saved. But not for me.",
    "I know what I have to do, Sam. The Ring was entrusted to me. It's my task.",
    "He's up to something. All right then, keep your secrets!",
    "Frodo wouldn't have got far without Sam.",
    "Sam! We're still in the Shire. What could possibly happen?",
    "It's gone. It's done.",
    "Nothing ever dampens your spirits, does it, Sam?",
    "We've lingered here too long. Come on, Sam.",
    "I think we should get off the road.",
    "There are some things that time cannot mend.",
    "I think a servant of the enemy would look fairer, but feel fouler."
  ],
  gandalf: [
    "You shall not pass!",
    "Fly, you fools!",
    "A wizard is never late, Frodo Baggins. Nor is he early. He arrives precisely when he means to.",
    "All we have to decide is what to do with the time that is given to us.",
    "Even the very wise cannot see all ends.",
    "I will not say do not weep, for not all tears are an evil.",
    "Fool of a Took!",
    "Is it secret? Is it safe?",
    "Run, Shadowfax, show us the meaning of haste.",
    "The board is set, the pieces are moving.",
    "It's the deep breath before the plunge.",
    "Courage is the best defence that you have now.",
    "If in doubt, Meriadoc, always follow your nose.",
    "You must trust to yourself. Trust your own strength.",
    "Understand this: things are now in motion that cannot be undone.",
    "I've no memory of this place.",
    "One stage of your journey is over. Another begins.",
    "Look to my coming at first light on the fifth day. At dawn, look to the east.",
    "Be on your guard. There are older and fouler things than orcs in the deep places of the world.",
    "Do not be too eager to deal out death and judgement.",
    "There never was much hope. Just a fool's hope.",
    "Hope is kindled!",
    "I am Gandalf the White. And I come back to you now at the turn of the tide.",
    "Oh, it's quite simple. If you are a friend, you speak the password and the doors will open.",
    "Until at last I threw down my enemy and smote his ruin upon the mountainside.",
    "Keep your forked tongue behind your teeth.",
    "The battle for Helm's Deep is over. The battle for Middle-earth is about to begin.",
    "In fact, it's better if you don't speak at all, Peregrin Took.",
    "Just tea, thank you.",
    "Breathe the free air again, my friend.",
    "Three hundred lives of Men I've walked this earth, and now I have no time.",
    "My work is now finished."
  ],
  legolas: [
    "Final count: 42.",
    "A red sun rises. Blood has been spilled this night.",
    "They are taking the Hobbits to Isengard.",
    "I see shapes of men and of horses.",
    "What about side by side with a friend?",
    "The stars are veiled. Something stirs in the East, a sleepless malice. The eye of the enemy is moving.",
    "This forest is old. Very old. Full of memory... and anger.",
    "Have you learnt nothing of the stubbornness of dwarves?",
    "Shall I describe it to you? Or would you like me to find you a box?",
    "A diversion.",
    "Game over!",
    "I feel something. A slight tingle in my fingers. I think it's affecting me.",
    "We must move on, we cannot linger.",
    "Your friends are with you, Aragorn.",
    "They may yet be alive.",
    "Why doesn't that surprise me!",
    "The horses are restless and the men are quiet.",
    "The way is shut. It was made by those who are dead, and the dead keep it.",
    "So it's a drinking game?",
    "You look terrible.",
    "Come, Gimli! We're gaining on them!"
  ],
  gollum: [
    "My precious!",
    "We wants it. We needs it. Must have the precious.",
    "Sneaky little Hobbitses. Wicked. Tricksy. False.",
    "Give it to us raw and wriggling. You keep nasty chips.",
    "What's taters, precious? What's taters? Eh?",
    "Leave now and never come back!",
    "It's ours, it is, and we wants it!",
    "The thieves! The thieves! The filthy little thieves. Where is it? Where is it?",
    "Stupid, fat Hobbit. It ruins it!",
    "It burns! It burns us! It freezes! Nasty Elves twisted it.",
    "No time to lose, silly!",
    "Yes. No! No! It's too risky. It's too risky.",
    "Smeagol is free!",
    "Not listening. I'm not listening.",
    "Because it's my birthday and I wants it.",
    "Good Smeagol always helps.",
    "Master broke his promise.",
    "Patience! Patience, my love!",
    "Up, up, up the stairs we go. And then it's into the tunnel.",
    "Don't follow the lights.",
    "Wake up! Wake up! Wake up, sleepies! We must go, yes, we must go at once.",
    "We are famished! Yes! Famished we are, precious!",
    "Smeagol hates nasty elf bread.",
    "Lost! My Precious is lost.",
    "We swears to serve the master of the precious.",
    "Very lucky we find you. Nice Hobbit."
  ]
};

// Hand-picked lines for specific situations. Keyword-searching the full API
// pool pulled in unrelated quotes (any Gandalf line containing "fool"), so the
// context-aware commands choose from these instead.
//
// Each rule has:
//   id          a stable name, used by the tests
//   about       what the character ends up talking about (shown in COMMANDS.md)
//   keywords    see "Matching" below for the syntax
//   quotes      a string, or { by, line } when the line belongs to a guest
//   negatable   true when "not <keyword>" should NOT count ("not done yet")
//   negationOf  another rule's id: this rule also fires when that rule's
//               keywords appear only in the negative
//
// The rule with the highest score wins; on a tie, the one listed first.
const SITUATIONS = {
  frodo: [
    {
      id: 'giving-up',
      about: 'Not being able to go on',
      keywords: [
        "can't", 'cannot', 'give up', 'gave up', 'quit', 'no more', 'anymore', 'any more', 'had enough',
        'done with', 'continue', 'go on', 'keep going', 'pointless', "what's the point"
      ],
      quotes: [
        "I can't do this, Sam.",
        "What are we holding on to, Sam?",
        "How do you go on, when in your heart you begin to understand there is no going back?"
      ]
    },
    {
      id: 'burden',
      about: 'The weight of it all',
      keywords: [
        'overwhelm', 'burden', 'heavy', 'tired', 'exhaust', 'exhaustion', 'hard', 'stress', 'stressful',
        'too much', 'too many', 'so many', 'swamped', 'workload', 'on call', 'oncall', 'overtime', 'busy',
        'backlog', 'drowning', 'burnout', 'burned out', 'burnt out', 'weight', 'pressure'
      ],
      quotes: [
        "I wish the Ring had never come to me. I wish none of this had happened.",
        "The Ring is my burden.",
        "It's such a weight to carry.",
        "It's getting heavier."
      ]
    },
    {
      id: 'start',
      about: 'Taking it on',
      keywords: [
        'start', 'begin', 'take', 'accept', 'do it', 'volunteer', 'kick off', 'kickoff', 'new project',
        'on it', 'assigned', 'my turn', 'pick up', 'own', 'ownership', 'responsible', 'my job', 'my task'
      ],
      quotes: [
        "I know what I have to do, Sam. The Ring was entrusted to me. It's my task.",
        "We've lingered here too long. Come on, Sam.",
        "I must."
      ]
    },
    {
      id: 'done',
      about: 'It being over',
      negatable: true,
      keywords: [
        'done', 'finish', 'complete', '=shipped', '=released', '=launched', '=deployed', '=merged',
        '=fixed', '=solved', '=resolved', 'finally', "it's over", 'all over', 'wrapped up', 'at last'
      ],
      quotes: [
        "It's gone. It's done.",
        "I'm glad to be with you, Samwise Gamgee, here at the end of all things."
      ]
    },
    {
      id: 'thanks',
      about: 'The people who got you there',
      keywords: [
        'thank', 'thanks', 'kudos', 'shout out', 'shoutout', 'great job', 'well done', 'good job',
        'nice work', 'helped', "couldn't have", 'teammate', 'grateful', 'appreciate', 'props'
      ],
      quotes: [
        "Frodo wouldn't have got far without Sam.",
        "Nothing ever dampens your spirits, does it, Sam?",
        "I'm glad to be with you, Samwise Gamgee, here at the end of all things."
      ]
    },
    {
      id: 'secrets',
      about: 'Someone keeping secrets',
      keywords: [
        'secret', 'hiding', "won't tell", 'not telling', 'mystery', 'surprise', 'suspicious', 'sketchy',
        'up to something', 'confidential', 'stealth'
      ],
      quotes: ["He's up to something. All right then, keep your secrets!"]
    },
    {
      id: 'trust',
      about: 'Who to trust',
      keywords: ['trust', 'promise', 'vendor', 'contractor', 'guarantee', 'sla', 'reliable', 'rely'],
      quotes: [
        "Who then do I trust?",
        "There's no promise you can make that I can trust.",
        "We have no choice but to trust him."
      ]
    },
    {
      id: 'circles',
      about: 'Going round in circles',
      keywords: [
        'circles', 'again', 'same bug', 'deja vu', 'loop', 'stuck', 'lost', 'which way', 'no idea',
        'confused', 'regression'
      ],
      quotes: [
        "It's because we've been here before. We're going in circles.",
        "Mordor, Gandalf, is it left or right?"
      ]
    },
    {
      id: 'tempting-fate',
      about: 'Tempting fate',
      keywords: [
        'what could go wrong', 'what could possibly', 'should be fine', 'easy', 'trivial', 'no big deal',
        'quick fix', 'simple', 'piece of cake', "can't fail", 'low risk', 'no problem'
      ],
      quotes: ["Sam! We're still in the Shire. What could possibly happen?"]
    },
    {
      id: 'late',
      about: 'Lateness and waiting',
      keywords: ['late', 'overdue', 'delay', 'behind', 'deadline', 'wait', 'eta', 'when will'],
      quotes: ["You're late!", "Sam. He'll be here. He'll come."]
    },
    {
      id: 'danger',
      about: 'Trouble arriving',
      keywords: [
        'incident', 'outage', 'is down', 'went down', 'alert', 'pager', 'paged', 'emergency', 'on fire',
        'urgent', 'attack', 'breach', 'crash', 'panic'
      ],
      quotes: ["Get off the road! Quick!", "I think we should get off the road.", "They're here."]
    },
    {
      id: 'home',
      about: 'Heading home',
      keywords: [
        'home', 'vacation', 'holiday', 'weekend', 'pto', 'log off', 'sign off', 'day off', 'time off',
        'on leave', 'eod'
      ],
      quotes: [
        "I can see the Shire. The Brandywine River. Bag End. Gandalf's fireworks. The lights on the party tree.",
        "We were home."
      ]
    },
    {
      id: 'farewell',
      about: 'Leaving for good',
      keywords: [
        'leave', 'last day', 'goodbye', 'farewell', 'resign', 'retire', 'moving on', 'new job', 'laid off',
        'layoff'
      ],
      quotes: [
        "We set out to save the Shire, Sam, and it has been saved. But not for me.",
        "It's just a feeling. I don't think I'll be coming back.",
        "How do you pick up the threads of an old life?"
      ]
    },
    {
      id: 'food',
      about: 'Food',
      keywords: ['food', 'lunch', 'dinner', 'breakfast', 'snack', 'hungry', 'eat', 'pizza', 'chicken'],
      quotes: ["What food have we got left?", "Roast chicken?!"]
    }
  ],

  gandalf: [
    {
      id: 'reckless',
      about: 'A warning',
      negatable: true,
      keywords: [
        'without ~ test', 'no test', 'untested', 'skip', 'bypass', 'force push', '=force', 'without review',
        'no review', 'unreviewed', 'friday', 'yolo', 'hotfix', '=deploy', '=deploying', '=merge', '=merging',
        '=pushing', 'push to', '=releasing', 'release to', 'release on', '=ship', '=shipping', '=rollout',
        'straight to', 'directly to', 'to prod', 'in prod', 'on prod', 'to production', 'in production',
        'to main', 'to master', 'anyway', 'just this once', 'hack', 'disable'
      ],
      quotes: [
        "You shall not pass!",
        "Fly, you fools!",
        "Understand this: things are now in motion that cannot be undone."
      ]
    },
    {
      id: 'success',
      about: 'Good news',
      negatable: true,
      keywords: [
        '=deployed', '=merged', '=shipped', '=released', '=launched', '=pushed', 'successfully', 'success',
        '=passed', '=passing', 'test pass', 'with test', 'green', 'went well', 'worked', 'works', '=fixed',
        '=solved', '=resolved', '=approved', '=done', '=finished', '=completed', 'we did it', 'is live',
        'now live', 'went live'
      ],
      quotes: [
        "Hope is kindled!",
        "Breathe the free air again, my friend.",
        "Now come the days of the King. May they be blessed."
      ]
    },
    {
      id: 'incident',
      about: 'Things on fire',
      keywords: [
        'outage', 'incident', 'is down', 'are down', 'went down', 'goes down', 'down again', 'on fire',
        'crash', 'failing', 'failed', 'failure', 'fails', 'p0', 'p1', 'sev', 'sev1', 'alert', 'pager', 'paged',
        'emergency', 'rollback', 'roll back', 'rolled back', 'revert', 'not working', 'not passing',
        "doesn't work", "isn't working", "won't start", 'broken', 'data loss', 'breach', 'attack', 'hacked'
      ],
      quotes: [
        "Fly, you fools!",
        "Be on your guard. There are older and fouler things than orcs in the deep places of the world.",
        "Hold them back, do not give in to fear. Stand to your posts.",
        "They are coming."
      ]
    },
    {
      id: 'mistake',
      about: "Someone's blunder",
      keywords: [
        'oops', 'whoops', 'mistake', 'my bad', 'my fault', 'messed up', 'screwed up', 'typo', 'accidentally',
        'by accident', 'broke', 'wrong', 'fat finger', 'forgot to', '=deleted', '=dropped', 'blunder',
        'stupid', 'dumb', 'embarrassing'
      ],
      quotes: [
        "Fool of a Took!",
        "Fool of a Took! Throw yourself in next time, and rid us of your stupidity!"
      ]
    },
    {
      id: 'timing',
      about: 'Lateness and deadlines',
      keywords: [
        'late', 'deadline', 'behind', 'delay', 'overdue', 'out of time', 'no time', 'running out', 'missed',
        'slip', 'postpone', 'push back', 'pushed back', 'on time', 'early', 'schedule', 'punctual'
      ],
      quotes: [
        "A wizard is never late, Frodo Baggins. Nor is he early. He arrives precisely when he means to.",
        "Three hundred lives of Men I've walked this earth, and now I have no time.",
        "It's only a matter of time."
      ]
    },
    {
      id: 'haste',
      about: 'Hurrying',
      keywords: ['hurry', 'rush', 'asap', 'urgent', 'quick', 'fast', 'speed', 'immediately', 'crunch'],
      quotes: ["Run, Shadowfax, show us the meaning of haste.", "Up! Quickly!"]
    },
    {
      id: 'decision',
      about: 'Hard choices',
      keywords: [
        'decide', 'decision', 'choice', 'choose', 'chose', 'option', 'what to do', 'should i', 'should we',
        'dilemma', 'torn', 'unsure', 'not sure', 'tradeoff', 'trade off', 'which one', 'pros and cons'
      ],
      quotes: [
        "All we have to decide is what to do with the time that is given to us.",
        "Even the very wise cannot see all ends.",
        "We now have but one choice.",
        "Let the Ringbearer decide."
      ]
    },
    {
      id: 'secrets',
      about: 'Secrets and leaks',
      keywords: [
        'secret', 'leak', 'exposed', 'confidential', 'nda', 'private', 'sensitive', "don't tell",
        'between us', 'embargo', 'api key', 'credential', 'token'
      ],
      quotes: [
        "Is it secret? Is it safe?",
        "In fact, it's better if you don't speak at all, Peregrin Took.",
        "Keep your forked tongue behind your teeth."
      ]
    },
    {
      id: 'access',
      about: 'Passwords and locked doors',
      keywords: [
        'password', 'login', 'log in', 'locked out', 'access', 'permission', 'sso', '2fa', 'mfa', 'vpn',
        "can't get in", 'denied', 'forbidden'
      ],
      quotes: [
        "Oh, it's quite simple. If you are a friend, you speak the password and the doors will open.",
        "I once knew every spell in all the tongues of elves, men and orcs."
      ]
    },
    {
      id: 'courage',
      about: 'Nerves and doubt',
      keywords: [
        'nervous', 'scared', 'afraid', 'worry', 'anxious', 'anxiety', 'doubt', 'fear', 'dread', 'interview',
        'presentation', 'demo', 'big day', 'wish me luck', 'imposter', 'impostor', 'intimidate', 'hopeless',
        'no hope', 'pitch'
      ],
      quotes: [
        "Courage is the best defence that you have now.",
        "You must trust to yourself. Trust your own strength.",
        "It's the deep breath before the plunge.",
        "There never was much hope. Just a fool's hope."
      ]
    },
    {
      id: 'lost',
      about: 'Being lost',
      keywords: [
        'lost', 'confused', 'no idea', "don't know", 'stuck', 'legacy', 'undocumented', 'no docs',
        "can't find", "can't remember", 'forgot', 'who wrote', 'what is this', 'where is', 'unfamiliar',
        'never seen'
      ],
      quotes: [
        "I've no memory of this place.",
        "If in doubt, Meriadoc, always follow your nose.",
        "Oh, it's useless!"
      ]
    },
    {
      id: 'help',
      about: 'Needing help',
      keywords: [
        'help', 'assist', 'support', 'need a hand', 'anyone', 'alone', 'by myself', 'on my own', 'backup',
        'reinforcement', 'understaffed', 'short staffed', 'hiring'
      ],
      quotes: [
        "You still have friends. You are not alone in this fight.",
        "Send word to all our allies and to every corner of Middle Earth that still stands free.",
        "Help must come to us."
      ]
    },
    {
      id: 'waiting',
      about: 'Waiting on something',
      keywords: [
        'wait', 'blocked', 'pending', 'eta', 'when will', 'how long', 'still no', 'no reply', 'no response',
        'any update', 'patience', 'soon'
      ],
      quotes: [
        "Look to my coming at first light on the fifth day. At dawn, look to the east.",
        "It's only a matter of time."
      ]
    },
    {
      id: 'kickoff',
      about: 'Plans being set in motion',
      keywords: [
        'plan', 'kickoff', 'kick off', 'roadmap', 'strategy', 'sprint', 'standup', 'launch day', 'go live',
        'ready', 'begin', 'start', 'quarter', 'okr'
      ],
      quotes: [
        "The board is set, the pieces are moving.",
        "We come to it at last. The great battle of our time.",
        "It's the deep breath before the plunge."
      ]
    },
    {
      id: 'farewell',
      about: 'Goodbyes',
      keywords: [
        'leave', 'last day', 'goodbye', 'farewell', 'resign', 'retire', 'moving on', 'new job', 'bye',
        'sign off', 'log off', 'laid off'
      ],
      quotes: [
        "I will not say do not weep, for not all tears are an evil.",
        "My work is now finished.",
        "Farewell, my brave Hobbits."
      ]
    },
    {
      id: 'return',
      about: 'Arrivals and returns',
      keywords: [
        "i'm back", 'is back', 'are back', 'back from', 'back online', 'welcome', 'returned', 'returning',
        'first day', 'new hire', 'joined', 'joining', 'onboard', 'hello', 'good morning'
      ],
      quotes: [
        "I am Gandalf the White. And I come back to you now at the turn of the tide.",
        "One stage of your journey is over. Another begins."
      ]
    },
    {
      id: 'quiet',
      about: 'Too much talking',
      keywords: [
        'meeting', 'quiet', 'shut up', 'loud', 'noisy', 'noise', 'talking', 'interrupt', 'bikeshed', 'argue',
        'arguing', 'bicker', 'debate'
      ],
      quotes: [
        "Silence!",
        "Do you not understand that while we bicker amongst ourselves, Sauron's power grows?",
        "In fact, it's better if you don't speak at all, Peregrin Took."
      ]
    },
    {
      id: 'drink',
      about: 'Being offered a drink',
      keywords: ['tea', 'drink', 'beer', 'pub', 'cuppa', 'refreshment'],
      quotes: ["Just tea, thank you."]
    }
  ],

  legolas: [
    {
      id: 'unfinished',
      about: 'Work still in progress',
      negationOf: 'achievement',
      keywords: [
        'still working', 'in progress', 'wip', 'almost', 'nearly', 'halfway', 'not yet', 'unfinished',
        'incomplete', 'half done'
      ],
      quotes: ["We must move on, we cannot linger.", "Come on, Gimli!"]
    },
    {
      id: 'achievement',
      about: 'Your achievement, downplayed',
      negatable: true,
      keywords: [
        '=fixed', '=closed', '=completed', '=deployed', '=finished', '=solved', '=shipped', '=merged',
        '=launched', '=done', '=resolved', '=released', '=won', '=delivered', 'wrapped up', '=landed',
        '=crushed', '=nailed', '=passed', '=hit', '=reached', '=cleared', '=killed', '=squashed',
        '=reviewed', '=answered', '=wrote', '=built'
      ],
      // The famous line is Gimli's, so Gimli says it.
      quotes: [{ by: 'gimli', line: "That still only counts as one!" }, "Final count: 42."]
    },
    {
      id: 'count',
      about: 'Keeping score',
      keywords: [
        'count', 'score', 'how many', 'tally', 'leaderboard', 'standings', 'ranking', 'points', 'metrics',
        'kpi', 'numbers'
      ],
      quotes: ["Final count: 42.", "I'm on 17!", "Nineteen!"]
    },
    {
      id: 'incident',
      about: 'Blood in the water',
      keywords: [
        'outage', 'incident', 'is down', 'went down', 'breach', 'attack', 'on fire', 'failed', 'failing',
        'crash', 'red', 'broken', 'blood', 'p0', 'sev'
      ],
      quotes: ["A red sun rises. Blood has been spilled this night.", "There is a fell voice on the air."]
    },
    {
      id: 'omen',
      about: 'Something feeling off',
      keywords: [
        'weird', 'strange', 'odd', 'suspicious', 'quiet', 'feels off', 'is off', 'ominous', 'uneasy',
        'bad feeling', 'spike', 'anomaly', 'monitor', 'dashboard', 'logs', 'watching', 'restless',
        'what do you see', 'see anything'
      ],
      quotes: [
        "The stars are veiled. Something stirs in the East, a sleepless malice. The eye of the enemy is moving.",
        "The horses are restless and the men are quiet.",
        "I see shapes of men and of horses."
      ]
    },
    {
      id: 'legacy',
      about: 'Old code',
      keywords: [
        'legacy', 'old', 'ancient', 'tech debt', 'technical debt', 'deprecated', 'monolith', 'cobol',
        'jquery', 'spaghetti', 'codebase'
      ],
      quotes: ["This forest is old. Very old. Full of memory... and anger."]
    },
    {
      id: 'taken',
      about: 'Things being taken away',
      keywords: [
        'taking', 'took', 'taken', 'stolen', 'stole', 'poach', 'reorg', 'reassign', 'transfer', 'moved to',
        'moving to', 'migrate', 'migration', 'isengard', 'hobbit'
      ],
      quotes: ["They are taking the Hobbits to Isengard."]
    },
    {
      id: 'stubborn',
      about: 'Stubbornness',
      keywords: [
        'stubborn', "won't listen", 'refuse', "won't budge", 'insist', 'pushback', 'push back', 'argue',
        'arguing', 'disagree'
      ],
      quotes: ["Have you learnt nothing of the stubbornness of dwarves?"]
    },
    {
      id: 'together',
      about: 'Standing together',
      keywords: [
        'team', 'together', 'pair', 'friend', 'help', 'support', 'with you', 'colleague', 'buddy', 'alone',
        'got your back'
      ],
      quotes: ["What about side by side with a friend?", "Your friends are with you, Aragorn."]
    },
    {
      id: 'drinks',
      about: 'Drinks',
      keywords: [
        'beer', 'drink', 'pub', 'happy hour', 'party', 'wine', 'cocktail', 'bar', 'shots', 'whisky',
        'whiskey', 'offsite'
      ],
      quotes: [
        "So it's a drinking game?",
        "I feel something. A slight tingle in my fingers. I think it's affecting me.",
        "Game over!"
      ]
    },
    {
      id: 'rough',
      about: 'Looking rough',
      keywords: [
        'tired', 'exhaust', 'sleep', 'slept', 'all nighter', 'hungover', 'sick', 'rough', 'jet lag', 'jetlag',
        'up all night', 'burnout'
      ],
      quotes: ["You look terrible."]
    },
    {
      id: 'blocked',
      about: 'A shut door',
      keywords: [
        'blocked', 'access denied', 'permission denied', 'forbidden', '403', '404', 'locked', 'no access',
        'paywall', 'firewall', 'shut', 'not allowed'
      ],
      quotes: ["The way is shut. It was made by those who are dead, and the dead keep it. The way is shut."]
    },
    {
      id: 'explain',
      about: 'Wanting it spelled out',
      keywords: [
        'explain', 'eli5', 'describe', 'summary', 'summarize', 'summarise', 'tldr', "can't see",
        'what happened', "what's happening", "what's going on", 'catch me up', 'recap', 'i missed'
      ],
      quotes: ["Shall I describe it to you? Or would you like me to find you a box?"]
    },
    {
      id: 'hurry',
      about: 'Falling behind',
      keywords: ['hurry', 'behind', 'catch up', 'late', 'slow', 'deadline', 'keep up', 'faster', 'chase'],
      quotes: ["Come, Gimli! We're gaining on them!", "We must move on, we cannot linger."]
    },
    {
      id: 'unsurprised',
      about: 'No surprise at all',
      keywords: [
        'of course', 'again', 'typical', 'surprise', 'who knew', 'as usual', 'always', 'shocker',
        'predictable', 'called it', 'told you'
      ],
      quotes: ["Why doesn't that surprise me!"]
    },
    {
      id: 'hope',
      about: 'Things that might be saved',
      keywords: ['missing', 'lost', 'gone', 'recover', 'restore', 'backup', 'data loss', 'dead', 'hope'],
      quotes: ["They may yet be alive."]
    }
  ]
};

// Gollum doesn't quote, he covets. These are written in his voice, borrowing
// his phrases, around whatever the user asked for; `%s` is replaced with it.
const GOLLUM_WANTS = [
  {
    id: 'access',
    about: 'Pocketses',
    keywords: [
      'access', 'permission', 'password', 'login', 'admin', 'credential', 'key', 'token', 'secret', 'root',
      'sudo', 'license', 'licence', 'invite', 'vpn'
    ],
    lines: ["What has it got in its pocketses? %s? Tricksy! We wants it!"]
  },
  {
    id: 'food',
    about: 'Raw and wriggling',
    keywords: [
      'food', 'coffee', 'drink', 'lunch', 'dinner', 'breakfast', 'pizza', 'snack', 'cake', 'tea', 'beer',
      'fish', 'donut', 'doughnut', 'cookie', 'sandwich', 'burger', 'taco', 'sushi', 'chocolate', 'wine',
      'bagel', 'pie', 'fries', 'chips', 'burrito', 'ice cream', 'cheese', 'bread', 'espresso', 'latte',
      'ramen', 'noodle', 'curry', 'salad'
    ],
    lines: [
      "We wants it, we needs it! Must have the %s… raw and wriggling!",
      "%s! So juicy sweet! Give it to us, precious!"
    ]
  },
  {
    id: 'code',
    about: 'My precious',
    keywords: [
      'code', 'deploy', 'merge', 'review', 'approval', 'commit', 'branch', 'pull request', 'pr', 'repo',
      'lgtm', 'release', 'build'
    ],
    lines: ["%s… it's ours, it is, and we wants it. My precious!"]
  },
  {
    id: 'money',
    about: 'Birthday presents',
    keywords: [
      '=raise', 'salary', 'bonus', 'budget', 'money', 'promotion', 'equity', 'stock', 'funding', 'payday',
      'paycheck', 'headcount'
    ],
    lines: ["%s! Because it's our birthday, and we wants it, precious!"]
  },
  {
    id: 'rest',
    about: 'Being free',
    keywords: [
      'vacation', 'holiday', 'weekend', 'sleep', 'nap', '=break', 'rest', 'pto', 'day off', 'time off',
      'sabbatical'
    ],
    lines: ["%s… so nice, so cool. Smeagol is free! We wants it, precious!"]
  },
  {
    id: 'stuff',
    about: 'Thieves',
    keywords: [
      'laptop', 'monitor', 'desk', 'chair', 'seat', 'parking', 'office', 'keyboard', 'mouse', 'headphone',
      'macbook', 'phone', 'charger', 'swag', 'hoodie', 'stapler'
    ],
    lines: ["%s! They stole it from us! The thieves! We wants it back, precious!"]
  }
];
const GOLLUM_DEFAULT = [
  "We wants it, we needs it. Must have the %s, precious!",
  "%s! Is it tasty? Is it scrumptious? We wants it, precious!",
  "%s… it's ours, it is, and we wants it!"
];

// What each character says in a pep talk when the topic gives no better cue.
const RALLY = {
  frodo: [
    "I'm glad to be with you, Samwise Gamgee, here at the end of all things.",
    "I know what I have to do, Sam. The Ring was entrusted to me. It's my task.",
    "Frodo wouldn't have got far without Sam."
  ],
  gandalf: [
    "All we have to decide is what to do with the time that is given to us.",
    "Courage is the best defence that you have now.",
    "You must trust to yourself. Trust your own strength.",
    "You still have friends. You are not alone in this fight."
  ],
  legolas: ["Your friends are with you, Aragorn.", "What about side by side with a friend?"],
  gollum: ["My precious!", "Good Smeagol always helps.", "Very lucky we find you. Nice Hobbit."]
};

// /wisdom draws from lines that actually read as wisdom.
const WISDOM = [
  ['gandalf', "All we have to decide is what to do with the time that is given to us."],
  ['gandalf', "Even the very wise cannot see all ends."],
  ['gandalf', "I will not say do not weep, for not all tears are an evil."],
  ['gandalf', "Do not be too eager to deal out death and judgement."],
  ['gandalf', "Courage is the best defence that you have now."],
  ['gandalf', "There are other forces at work in this world, Frodo, besides the will of evil."],
  ['gandalf', "You must trust to yourself. Trust your own strength."],
  ['gandalf', "If in doubt, Meriadoc, always follow your nose."],
  ['gandalf', "Death is just another path, one that we all must take."],
  ['frodo', "There are some things that time cannot mend."],
  ['frodo', "How do you go on, when in your heart you begin to understand there is no going back?"],
  ['frodo', "I think a servant of the enemy would look fairer, but feel fouler."],
  ['gollum', "Don't follow the lights."]
];

// ---------------------------------------------------------------------------
// Matching
//
// Keyword syntax:
//   deploy          the word and its ordinary endings: deploys, deployed,
//                   deploying, deployment. Never a longer word that merely
//                   starts the same way ("tea" is not "team").
//   =deployed       exactly this form and no other
//   without review  a phrase: the words in a row
//   without ~ test  ~ allows up to two words in between ("without any tests")
// ---------------------------------------------------------------------------

const BREAK = '|';   // marks a clause boundary in the token list
const GAP = '~';
const MAX_GAP = 2;
const NEGATION_REACH = 3;   // how many words back "not" still applies
const MAX_MATCHED_LENGTH = 500;   // only the start of a very long message is read

const NEGATORS = new Set([
  'not', 'no', 'never', 'without', 'dont', 'doesnt', 'didnt', 'isnt', 'arent', 'wasnt', 'werent', 'havent',
  'hasnt', 'hadnt', 'wont', 'wouldnt', 'cant', 'cannot', 'couldnt', 'shouldnt', 'aint', 'nobody', 'nothing',
  'neither', 'nor', 'hardly', 'barely'
]);
// Words that start a new thought, so an earlier "not" stops applying.
const CLAUSE_WORDS = new Set(['but', 'and', 'then', 'because', 'though', 'although', 'however']);

const ENDINGS = ['s', 'es', 'ed', 'd', 'ing', 'er', 'ers', 'ment', 'ments'];
const ENDINGS_AFTER_DROPPED_E = ['ing', 'er', 'ers', 'ion', 'ions'];
const ENDINGS_AFTER_Y_TO_I = ['es', 'ed', 'er', 'est'];
const ENDINGS_AFTER_DOUBLING = ['ed', 'ing', 'er', 'ers'];

// The words of a message, lower-cased, with a BREAK between clauses. Slack
// mentions, channels, links, e-mail addresses and :emoji: are removed first,
// so a keyword inside a URL or a channel name can't trigger anything.
function tokenize(text) {
  const cleaned = String(text || '')
    .slice(0, MAX_MATCHED_LENGTH)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')                           // sméagol → smeagol
    .replace(/[‘’]/g, "'")
    .replace(/<(?:https?:|mailto:)[^>|]*\|([^>]*)>/g, ' $1 ')  // <url|label> keeps its label
    .replace(/<[^>]*>/g, ' ')                                  // <@U123>, <#C123|general>, <!here>, <url>
    .replace(/\bhttps?:\/\/\S+/g, ' ')
    .replace(/\S+@\S+\.\S+/g, ' ')
    .replace(/(^|\s)[@#][\w.-]+/g, ' ')                        // @someone, #channel
    .replace(/:[a-z0-9_+-]+:/g, ' ')                           // :emoji:
    .replace(/tl;dr/g, 'tldr')
    .replace(/'/g, '')                                         // can't → cant
    .replace(/[.,;:!?()[\]{}"“”…|\n]+|\s[-–—]+\s/g, ` ${BREAK} `);
  return cleaned.match(/[a-z0-9]+|\|/g) || [];
}

// True when `token` is `word` or `word` with an ordinary ending.
function isFormOf(token, word) {
  if (token === word) return true;
  if (word.length < 3 || token.length <= word.length - 1) return false;
  const last = word[word.length - 1];
  const rest = token.slice(word.length);

  if (token.startsWith(word) && ENDINGS.includes(rest)) return true;
  // merge → merging, release → releasing
  if (last === 'e' && token.startsWith(word.slice(0, -1)) && ENDINGS_AFTER_DROPPED_E.includes(token.slice(word.length - 1))) {
    return true;
  }
  // worry → worried, hungry → hungrier
  if (last === 'y' && /[^aeiou]y$/.test(word) && token.startsWith(`${word.slice(0, -1)}i`) && ENDINGS_AFTER_Y_TO_I.includes(rest)) {
    return true;
  }
  // ship → shipped, quit → quitting, plan → planning
  if (/[aeiou][bdgklmnprt]$/.test(word) && token.startsWith(word + last) && ENDINGS_AFTER_DOUBLING.includes(token.slice(word.length + 1))) {
    return true;
  }
  return false;
}

const compiledKeywords = new Map();

// "without ~ test" → the parts to look for, plus how much a hit is worth:
// one point per word, so a phrase outweighs a single word.
function compile(keyword) {
  if (!compiledKeywords.has(keyword)) {
    const parts = keyword
      .toLowerCase()
      .replace(/[‘’']/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .map(part => {
        if (part === GAP) return GAP;
        return part.startsWith('=') ? { word: part.slice(1), exact: true } : { word: part, exact: false };
      });
    compiledKeywords.set(keyword, { parts, weight: parts.filter(part => part !== GAP).length });
  }
  return compiledKeywords.get(keyword);
}

// Do `parts[p...]` match the tokens starting at `i`?
function matchesAt(tokens, i, parts, p = 0) {
  if (p === parts.length) return true;
  const part = parts[p];
  if (part === GAP) {
    for (let skipped = 0; skipped <= MAX_GAP; skipped++) {
      if (skipped > 0 && (i + skipped > tokens.length || tokens[i + skipped - 1] === BREAK)) break;
      if (matchesAt(tokens, i + skipped, parts, p + 1)) return true;
    }
    return false;
  }
  if (i >= tokens.length) return false;
  const hit = part.exact ? tokens[i] === part.word : isFormOf(tokens[i], part.word);
  return hit && matchesAt(tokens, i + 1, parts, p + 1);
}

// Is the word at `i` negated by a "not", "never", "haven't"... shortly before it?
function isNegated(tokens, i) {
  for (let j = i - 1; j >= 0 && j >= i - NEGATION_REACH; j--) {
    if (tokens[j] === BREAK || CLAUSE_WORDS.has(tokens[j])) return false;
    if (NEGATORS.has(tokens[j])) return true;
  }
  return false;
}

// Where a keyword shows up: stated plainly, only in the negative, or both.
function occurrence(tokens, keyword) {
  const { parts, weight } = compile(keyword);
  let plain = false;
  let negated = false;
  for (let i = 0; i < tokens.length; i++) {
    if (!matchesAt(tokens, i, parts)) continue;
    if (isNegated(tokens, i)) negated = true;
    else plain = true;
  }
  return { plain, negated, weight };
}

// True when any keyword appears in `text`.
function matchesAny(text, keywords) {
  const tokens = tokenize(text);
  return keywords.some(keyword => {
    const { plain, negated } = occurrence(tokens, keyword);
    return plain || negated;
  });
}

// The best-scoring rule for `text`, or null when nothing fits.
function bestRule(rules, text) {
  const tokens = tokenize(text);
  if (tokens.length === 0) return null;

  const hits = new Map(rules.map(rule => [rule.id, rule.keywords.map(keyword => occurrence(tokens, keyword))]));
  let best = null;
  for (const rule of rules) {
    let score = 0;
    for (const hit of hits.get(rule.id)) {
      if (hit.plain || (hit.negated && !rule.negatable)) score += hit.weight;
    }
    for (const hit of hits.get(rule.negationOf) || []) {
      if (hit.negated && !hit.plain) score += hit.weight;
    }
    if (score > 0 && (!best || score > best.score)) best = { rule, score };
  }
  return best;
}

// ---------------------------------------------------------------------------
// What Gollum is being asked for
// ---------------------------------------------------------------------------

const WANT_OPENERS = new RegExp(
  '^(?:(?:please|pls|ok|so|hey|and|but|man|ugh|honestly)[, ]+)*' +
  "(?:(?:i|we|he|she|they|you|someone|everyone)(?:'d|'m|'ve|'re| would| could| am| have| really| just| so| still| also| kinda| totally| desperately| badly)* +)?" +
  '(?:(?:really|just|so|still|totally|desperately|badly) +)*' +
  '(?:wants?|wanted|needs?|needed|craves?|craving|like|love|kill for|use|go for|do with|wish(?:es)? for|' +
  'gotta have|got to have|must have|have to have|dying for|give me|gimme|get me|bring me|hand over|' +
  "where is|where's|wheres|(?:can|could|may) (?:i|we) (?:have|get|please have|please get)|let me have|looking for)" +
  ' +(?:to (?:have|get|eat|drink|buy|grab|see) +)?',
  'i'
);
const WANT_ARTICLE = '(?:some|a|an|the|my|our|your|his|her|their|more|another|that|this|those|these|any|all|of)';
const WANT_ARTICLES = new RegExp(`^(?:${WANT_ARTICLE} +)+`, 'i');
const ONLY_AN_ARTICLE = new RegExp(`^${WANT_ARTICLE}$`, 'i');
const WANT_CLOSERS = /(?:[, ]+(?:please|pls|plz|now|right now|asap|today|so bad|so badly|badly|really bad|immediately|too|thanks))+$/i;

// The thing being asked for: "I really need some coffee, please" → "coffee".
// Falls back to the whole text when nothing sensible is left.
function wanted(input) {
  const text = String(input || '').slice(0, MAX_MATCHED_LENGTH).replace(/\s+/g, ' ').replace(/[‘’]/g, "'").trim();
  const thing = text
    .replace(/[.!?…]+$/, '')
    .replace(WANT_CLOSERS, '')
    .replace(WANT_OPENERS, '')
    .replace(WANT_ARTICLES, '')
    .trim();
  return thing && !ONLY_AN_ARTICLE.test(thing) ? thing : text;
}

// ---------------------------------------------------------------------------
// Cleaning quotes that come from the API
// ---------------------------------------------------------------------------

const MIN_LENGTH = 15;   // drops fragments like "Sam!"
const MAX_LENGTH = 280;  // keeps replies readable in a channel
const MIN_WORDS = 4;     // drops "Yes. Yes. Yes." and people calling each other's names
const MIN_QUESTION_WORDS = 6;  // "What did you say?" means nothing out of context
const MIN_POOL = 5;      // fewer usable quotes than this: keep the built-in set

// Fine in the film, unpleasant when a bot posts it into a work channel.
const TOO_GRIM = /\b(kill|kills|killed|murder|murderer|stab|stabs|throat|wring|massacre)\b/i;

const pick = list => list[Math.floor(Math.random() * list.length)];

// A line reduced to its bare words, for comparing two versions of a quote.
const bareWords = text => String(text).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Repairs the API's most common transcription slips.
function tidyDialog(raw) {
  return String(raw || '')
    .replace(/\s+/g, ' ')
    .replace(/\s*\.{3,}\s*/g, '... ')                        // "you......from" → "you... from"
    .replace(/\s+([,.!?;:])/g, '$1')                         // "malice , The" → "malice, The"
    .replace(/([a-z])([.!?,;:])([A-Za-z])/g, '$1$2 $3')      // "rises.Blood" → "rises. Blood"
    .replace(/\bIet\b/g, 'let')                              // capital I typed for l
    .replace(/\bIook\b/g, 'look')
    .replace(/\s+(They hug|Aragorn smiles)\.?$/, '')         // stage directions
    .trim();
}

// Is this line worth saying on its own in a channel?
function usable(quote) {
  if (quote.length < MIN_LENGTH || quote.length > MAX_LENGTH) return false;
  const words = quote.split(' ').length;
  if (words < MIN_WORDS) return false;
  if (quote.endsWith('?') && words < MIN_QUESTION_WORDS) return false;
  if (/([a-z])\1{3,}/i.test(quote)) return false;                              // "Nooooo!", "Yessssss"
  if (/[a-z]'(?!(?:s|t|d|m|ll|re|ve|em)\b)[a-z]/i.test(quote)) return false;   // "Nazg'l": a lost accent
  if (/[a-rt-z]'(?=[\s,.!?]|$)/i.test(quote)) return false;                    // "them'. Dead": lost punctuation
  if (TOO_GRIM.test(quote)) return false;
  return true;
}

// Normalise raw API dialog: tidy it, then drop fragments and duplicates.
function cleanQuotes(docs) {
  const seen = new Set();
  const out = [];
  for (const doc of docs || []) {
    const quote = tidyDialog(doc && doc.dialog);
    if (!usable(quote)) continue;
    const key = bareWords(quote);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(quote);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The quotes manager
// ---------------------------------------------------------------------------

class QuotesManager {
  constructor(apiToken) {
    this.apiToken = apiToken;
    this.quotes = {};
    this.source = 'built-in quotes';
    this.lastSaid = new Map();
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
      const loaded = await Promise.all(
        Object.keys(CHARACTERS).map(async key => {
          if (!ids[key]) return false;
          const quotes = await this.fetchQuotes(ids[key]);
          if (quotes.length < MIN_POOL) return false;
          // The built-in lines stay in the pool, in their tidier wording.
          const builtIn = new Set(FALLBACK_QUOTES[key].map(bareWords));
          this.quotes[key] = [...FALLBACK_QUOTES[key], ...quotes.filter(quote => !builtIn.has(bareWords(quote)))];
          return true;
        })
      );
      if (loaded.some(Boolean)) {
        this.source = 'The One API';
      } else {
        console.error('⚠️  The One API returned no usable quotes, using built-in quotes.');
      }
    } catch (error) {
      console.error(`⚠️  ${describeApiError(error)} Using built-in quotes.`);
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
      params: { limit: 1000 },
      timeout: API_TIMEOUT_MS
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
      params: { limit: 1000 },
      timeout: API_TIMEOUT_MS
    });
    return cleanQuotes(response.data.docs);
  }

  // Picks from `lines`, avoiding whatever was last said in this `slot` when
  // there is something else to say.
  fresh(slot, lines) {
    const text = entry => (typeof entry === 'string' ? entry : entry.line);
    const last = this.lastSaid.get(slot);
    const others = lines.filter(entry => text(entry) !== last);
    const choice = pick(others.length > 0 ? others : lines);
    this.lastSaid.set(slot, text(choice));
    return choice;
  }

  // Any quote from this character's pool.
  random(character) {
    const pool = this.quotes[character];
    return this.fresh(character, pool && pool.length ? pool : FALLBACK_QUOTES[character]);
  }

  // Which situation `text` describes for this character (for Gollum, which
  // kind of thing is wanted), with how strongly it matched. Null if none.
  match(character, text) {
    const rules = character === 'gollum' ? GOLLUM_WANTS : SITUATIONS[character] || [];
    const found = bestRule(rules, text);
    return found ? { rule: found.rule.id, score: found.score } : null;
  }

  // What this character says to `text`: a line that fits the situation, or a
  // random one when nothing fits. `speaker` is usually the character, but a
  // guest's line is spoken by the guest.
  reply(character, text) {
    const found = bestRule(SITUATIONS[character] || [], text);
    const said = found ? this.fresh(character, found.rule.quotes) : this.random(character);
    return {
      speaker: typeof said === 'string' ? character : said.by,
      line: typeof said === 'string' ? said : said.line,
      rule: found ? found.rule.id : null
    };
  }

  // A pep-talk line: fitted to `text` when it gives a cue, encouraging otherwise.
  rally(character, text = '') {
    if (bestRule(SITUATIONS[character] || [], text)) return this.reply(character, text);
    return { speaker: character, line: this.fresh(`rally:${character}`, RALLY[character]), rule: null };
  }

  // The characters whose rules fit `text` best. Empty when it fits no one.
  bestFor(text) {
    const scores = Object.keys(CHARACTERS).map(key => [key, (this.match(key, text) || { score: 0 }).score]);
    const top = Math.max(...scores.map(([, score]) => score));
    return top > 0 ? scores.filter(([, score]) => score === top).map(([key]) => key) : [];
  }

  // Gollum coveting `thing`. `thing` is inserted as given, so format it first.
  gollumWants(thing, matchText = thing) {
    const found = bestRule(GOLLUM_WANTS, matchText);
    const line = this.fresh('gollum:wants', found ? found.rule.lines : GOLLUM_DEFAULT);
    return line.replace('%s', () => thing);
  }

  // Frodo stepping up, for /quest.
  volunteer() {
    return this.fresh('frodo:volunteer', SITUATIONS.frodo.find(rule => rule.id === 'start').quotes);
  }

  wisdom() {
    const { by, line } = this.fresh('wisdom', WISDOM.map(([who, quote]) => ({ by: who, line: quote })));
    return { character: by, quote: line };
  }
}

module.exports = QuotesManager;
module.exports.CHARACTERS = CHARACTERS;
module.exports.GUESTS = GUESTS;
module.exports.FALLBACK_QUOTES = FALLBACK_QUOTES;
module.exports.SITUATIONS = SITUATIONS;
module.exports.GOLLUM_WANTS = GOLLUM_WANTS;
module.exports.GOLLUM_DEFAULT = GOLLUM_DEFAULT;
module.exports.RALLY = RALLY;
module.exports.WISDOM = WISDOM;
module.exports.matchesAny = matchesAny;
module.exports.cleanQuotes = cleanQuotes;
module.exports.tokenize = tokenize;
module.exports.wanted = wanted;
