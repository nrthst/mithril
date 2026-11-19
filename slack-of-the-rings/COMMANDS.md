# Command reference

Text in brackets is optional.

## How your text is read

- **Whole words, with their endings.** "deploy" also matches "deploys", "deployed", "deploying" and "deployment". It never matches a longer word that just starts the same way: "tea" is not "team", "key" is not "keyboard".
- **The best fit wins.** Every situation a character knows is scored against your text. A phrase ("without tests") counts for more than a single word, and the highest score answers.
- **"Not" is understood where it changes the meaning.** `/legolas not done yet` is not an achievement, and `/gandalf don't skip the tests` earns no warning.
- **Tense matters to Gandalf.** `deploy on friday` is a plan and gets a warning; `deployed successfully` is good news.
- **Mentions, channels, links and emoji are ignored**, so `#deploy-friday` triggers nothing.
- **No match means a random quote** from that character's pool.

The same line is never given twice in a row when the character has another to choose from.

## `/lotr [anything]`

One command to rule them all. It sends your text to whoever suits it:

1. If it describes a situation a character knows, that character answers: `/lotr merge without tests` goes to Gandalf, `/lotr coffee` to Gollum, `/lotr closed 10 tickets` to Legolas.
2. If it reads as a job to be done (it starts with a verb such as fix, write or build), it becomes a `/quest`.
3. Anything else gets a surprise: a character, `/council` or `/fellowship`.

With no text it picks from the four characters, `/fellowship` and `/wisdom`. `/lotr help` shows the command list, visible only to you.

## Characters

Each table lists what the character can speak to, with an example that triggers it. The full keyword lists are in `quotes.js`.

### `/frodo [situation]`

| When your text is about | Try |
|---|---|
| Not being able to go on | `/frodo can't continue` |
| The weight of it all | `/frodo feeling overwhelmed` |
| Taking it on | `/frodo starting a new project` |
| It being over | `/frodo it's finally done` |
| The people who got you there | `/frodo thanks for the help` |
| Someone keeping secrets | `/frodo what is he hiding` |
| Who to trust | `/frodo can we trust this vendor` |
| Going round in circles | `/frodo same bug again` |
| Tempting fate | `/frodo what could go wrong` |
| Lateness and waiting | `/frodo running late` |
| Trouble arriving | `/frodo prod is down` |
| Heading home | `/frodo heading home` |
| Leaving for good | `/frodo it's my last day` |
| Food | `/frodo lunch?` |

### `/gandalf [situation]`

| When your text is about | Try |
|---|---|
| A warning | `/gandalf merge without tests` |
| Good news | `/gandalf deployed successfully` |
| Things on fire | `/gandalf prod is down` |
| Someone's blunder | `/gandalf I broke the build` |
| Lateness and deadlines | `/gandalf missed the deadline` |
| Hurrying | `/gandalf need this asap` |
| Hard choices | `/gandalf tough decision` |
| Secrets and leaks | `/gandalf can I share the api key` |
| Passwords and locked doors | `/gandalf locked out of my account` |
| Nerves and doubt | `/gandalf nervous about the demo` |
| Being lost | `/gandalf who wrote this` |
| Needing help | `/gandalf I need help` |
| Waiting on something | `/gandalf still waiting on review` |
| Plans being set in motion | `/gandalf sprint planning` |
| Goodbyes | `/gandalf it's my last day` |
| Arrivals and returns | `/gandalf I'm back` |
| Too much talking | `/gandalf too many meetings` |
| Being offered a drink | `/gandalf a cup of tea` |

### `/legolas [achievement]`

Tell Legolas what you achieved and it is downplayed. "That still only counts as one!" is Gimli's line in the films, so Gimli cuts in to say it; Legolas's own answer is "Final count: 42."

| When your text is about | Try |
|---|---|
| Your achievement, downplayed | `/legolas closed 10 tickets` |
| Work still in progress | `/legolas not done yet` |
| Keeping score | `/legolas how many tickets` |
| Blood in the water | `/legolas the build is red` |
| Something feeling off | `/legolas something feels off` |
| Old code | `/legolas legacy codebase` |
| Things being taken away | `/legolas they are taking my team` |
| Stubbornness | `/legolas he won't listen` |
| Standing together | `/legolas team effort` |
| Drinks | `/legolas happy hour` |
| Looking rough | `/legolas didn't sleep` |
| A shut door | `/legolas access denied` |
| Wanting it spelled out | `/legolas what happened` |
| Falling behind | `/legolas falling behind` |
| No surprise at all | `/legolas of course it broke again` |
| Things that might be saved | `/legolas we lost the backup` |

### `/gollum [thing]`

Gollum builds a line around the thing you name. He picks it out of a sentence: `/gollum I really need some coffee, please` covets *coffee*. These lines are written in his voice from his own phrases; they are not film quotes.

| When you want | Try |
|---|---|
| Pocketses | `/gollum production access` |
| Raw and wriggling | `/gollum coffee` |
| My precious | `/gollum code review approval` |
| Birthday presents | `/gollum a raise` |
| Being free | `/gollum the weekend` |
| Thieves | `/gollum my stapler` |

Anything else is simply wanted. With no text, Gollum gives a random quote.

## Group commands

- **`/fellowship [topic]`**: a line each from Frodo, Gandalf, Legolas and Gollum. With a topic, each speaks to it where they can: `/fellowship demo tomorrow` gets courage from Gandalf.
- **`/council [topic]`**: Frodo, Gandalf and Legolas each respond to your topic, using the same rules as their own commands. `/council deploy on friday` gets a warning from Gandalf.
- **`/versus [a] vs [b]`**: a random quote from each of two characters. Choose from `frodo`, `gandalf`, `legolas`, `gollum`; "vs" is optional, and `smeagol`, `mithrandir` and `baggins` work too. Mistakes get a usage hint only you can see.
- **`/wisdom`**: one line from a short list of the wiser things said in Middle-earth.
- **`/quest [task]`**: announces your task as a quest, with Frodo stepping up.

## Where the quotes come from

- **Situation replies, `/wisdom` and the built-in pool** are hand-picked lines in `quotes.js`. Each was checked against [The One API](https://the-one-api.dev) for the right speaker and wording. The API covers the three films, so book-only lines are not used.
- **Random replies** draw from the built-in pool, plus a few hundred film quotes from The One API when a token is configured. API quotes are filtered first: fragments, lines that only make sense in their scene, transcription glitches and the grimmest lines are dropped.
