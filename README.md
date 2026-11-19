# 🧙‍♂️ Slack of the Rings

```text
                                                  (   )
                                               ( )
                                             o
                                            |=|
                   _..---'''''''''''''''''''|_|---.._
             _.-''                                    ''-._
         .-'         .-'''''''''-.                          '-.
      .'           .'             '.             .-'''-.        '.
    /             /                 \           /   |   \          \
   /             |        (o)        |         |----+----|          \
  |               \                 /           \   |   /            |
  |                '.             .'             '-...-'             |
^^^^^^*^^^^^^^^^^^^^^'-._______.-'^^^^^^^*^^^^^^^^^^^^^^^*^^^^^^^^^^^^
                    /   .     .   \
                  /  .     .     .  \
                /   .    .     .   .  \

           In a hole in the ground there lived a Slack bot.
```

**Ten slash commands that answer your team with a fitting line from Middle-earth.**

Type `/gandalf merge without tests` and Gandalf warns you off. Type `/gandalf deployed successfully` and he is pleased for you. Tell Legolas you closed ten tickets and Gimli cuts in to say it still only counts as one.

The bot runs on your own computer and takes about five minutes to set up. It needs no server, no AI service and nothing paid. Film quotes come from [The One API](https://the-one-api.dev), which is optional: without it the bot uses the lines it ships with.

> An unofficial, fan-made Slack bot. Not affiliated with or endorsed by the Tolkien Estate, Middle-earth Enterprises or Warner Bros.

<!-- Demo: record a short GIF of the commands in Slack, save it as docs/demo.gif, then uncomment the next line. -->
<!-- ![Slack of the Rings in action](docs/demo.gif) -->

## Contents

- [What it looks like](#what-it-looks-like)
- [Commands](#commands)
- [The cast](#the-cast)
- [Installation](#installation)
- [The One API](#the-one-api)
- [How it decides what to say](#how-it-decides-what-to-say)
- [Architecture](#architecture)
- [Make it your own](#make-it-your-own)
- [Tests](#tests)
- [Troubleshooting](#troubleshooting)
- [Questions](#questions)
- [Privacy and security](#privacy-and-security)
- [Credits](#credits)
- [License](#license)

## What it looks like

Replies post in the channel for everyone. These are real replies; most situations have several lines, so yours may differ.

| You type | Who answers | What they say |
|---|---|---|
| `/gandalf merge without tests` | 🧙‍♂️ Gandalf | “You shall not pass!” |
| `/gandalf deployed successfully` | 🧙‍♂️ Gandalf | “Breathe the free air again, my friend.” |
| `/gandalf missed the deadline` | 🧙‍♂️ Gandalf | “A wizard is never late, Frodo Baggins. Nor is he early. He arrives precisely when he means to.” |
| `/gandalf too many meetings` | 🧙‍♂️ Gandalf | “Silence!” |
| `/frodo feeling overwhelmed` | 💍 Frodo | “It's such a weight to carry.” |
| `/legolas closed 10 tickets` | 🪓 Gimli, cutting in on Legolas | “That still only counts as one!” |
| `/legolas not done yet` | 🏹 Legolas | “We must move on, we cannot linger.” |
| `/gollum I really need some coffee` | 🐟 Gollum | We wants it, we needs it! Must have the **coffee**… raw and wriggling! |

The group commands stack several speakers into one message:

```text
/council deploy on friday

⚔️ The Council of Elrond
On: deploy on friday

💍  Frodo
┃ “I'm glad to be with you, Samwise Gamgee, here at the end of all things.”
🧙‍♂️  Gandalf
┃ “You shall not pass!”
🏹  Legolas
┃ “The horses are restless and the men are quiet.”
──────────────────────────────
The council has spoken.
```

Gandalf knows what he thinks of Friday deploys. Frodo and Legolas have no particular view, so each offers a random line of his own.

## Commands

| Command | What you get | Try |
|---|---|---|
| `/lotr [anything]` | One command to rule them all: whoever suits your text answers. `/lotr help` lists the commands | `/lotr coffee` |
| `/frodo [situation]` | Frodo on burdens, beginnings and not being able to go on | `/frodo feeling overwhelmed` |
| `/gandalf [situation]` | A warning for risky moves, or wisdom on lateness, nerves and hard choices | `/gandalf merge without tests` |
| `/legolas [achievement]` | Your achievement, downplayed | `/legolas closed 10 tickets` |
| `/gollum [thing]` | Gollum covets whatever you name | `/gollum coffee` |
| `/fellowship [topic]` | A pep talk from all four | `/fellowship demo tomorrow` |
| `/council [topic]` | Frodo, Gandalf and Legolas weigh in on your topic | `/council deploy to production` |
| `/versus [a] vs [b]` | A quote battle between two characters | `/versus frodo vs gollum` |
| `/wisdom` | A line worth pausing on | `/wisdom` |
| `/quest [task]` | Your task, announced as a quest | `/quest fix the auth bug` |

Text in brackets is optional. Every situation the characters know, with an example that triggers each one, is in [COMMANDS.md](slack-of-the-rings/COMMANDS.md).

## The cast

| | Speaks to | Knows |
|---|---|---|
| 💍 **Frodo** | The weight of the work: being overwhelmed, wanting to quit, taking something on, finishing it, thanking the people who helped | 14 situations |
| 🧙‍♂️ **Gandalf** | Judgement: warnings for risky moves, good news, lateness, hard choices, secrets, nerves, meetings that run long | 18 situations |
| 🏹 **Legolas** | Dry understatement: achievements downplayed, things feeling off, old code, stubborn colleagues, drinks | 16 situations |
| 🐟 **Gollum** | Wanting things. He doesn't quote; he covets whatever you name | 6 kinds of wanting |
| 🪓 **Gimli** | One line. He has no command and appears only to deliver it | A guest |

Each of the four also has a pool of general quotes for when nothing specific fits: 16 built in for Frodo, 32 for Gandalf, 21 for Legolas and 26 for Gollum. A The One API token adds a few hundred more between them.

`/versus` also answers to `baggins`, `mithrandir` and `smeagol`.

## Installation

About five minutes, in four steps: get the code, create the Slack app, start the bot, try it. The bot runs on your own computer, on Mac, Windows or Linux.

### Before you start

| You need | How to check |
|---|---|
| A Slack workspace where you can install apps | Some workspaces need an admin to approve new apps |
| [Node.js](https://nodejs.org) 18 or newer | Run `node --version` in a terminal. If it prints `v18` or higher you are set; otherwise install the LTS version from nodejs.org |

Node.js comes with `npm`, which is the only other tool used.

### 1. Get the code

**Without git:** on the GitHub page, click **Code → Download ZIP** and unzip it. The bot is the `slack-of-the-rings` folder inside.

**With git:** click **Code** on the GitHub page, copy the address it shows, and clone it:

```bash
git clone <the address you copied>
cd mithril/slack-of-the-rings
```

### 2. Create the Slack app

1. Click **[Create the Slack app][create-app]**, pick your workspace, then click **Next** and **Create**. The link carries [`manifest.json`](slack-of-the-rings/manifest.json), so all ten commands are registered for you.
2. On the app's **Install App** page, click **Install to Workspace** and copy the **Bot User OAuth Token** (starts with `xoxb-`).
3. On **Basic Information → App-Level Tokens**, click **Generate Token and Scopes**, add the `connections:write` scope, and copy the token (starts with `xapp-`).

Keep both tokens to hand for the next step.

If the link doesn't work, go to [api.slack.com/apps](https://api.slack.com/apps), choose **Create New App → From a manifest**, and paste in the contents of `manifest.json`.

### 3. Install and start the bot

**On a Mac, by double-click:** open `start.command` in the `slack-of-the-rings` folder. The first run installs the dependencies, offers to open the Slack link from step 2, and asks for your two tokens. After that it just starts the bot. If macOS blocks the file, right-click it and choose **Open**. On newer versions of macOS, allow it under **System Settings → Privacy & Security** instead.

**On any platform, from a terminal** opened in the `slack-of-the-rings` folder:

```bash
npm install      # downloads the three dependencies into node_modules (first time only)
npm run setup    # asks for your tokens and saves them in .env (first time only)
npm start        # starts the bot
```

`npm run setup` begins by offering to open the Slack link. Type `s` to skip that if you have already created the app.

### 4. Try it

Type `/lotr` in any channel, then `/lotr help` to see everything it can do.

### When it is running

The window ends with:

```text
✨ Slack of the Rings is running!
   Quotes: built-in quotes
   Try /lotr in any Slack channel.
   Keep this window open. Press Ctrl+C to stop.
```

The bot answers for as long as that window stays open. It uses Slack's Socket Mode, which means it connects out to Slack: no public URL, tunnel or server is needed. To start it again later, double-click `start.command` or run `npm start`. To have it answer around the clock, run it on any machine that stays on.

### Configuration

Setup writes these to a file named `.env` in the `slack-of-the-rings` folder. You can also copy [`.env.example`](slack-of-the-rings/.env.example) to `.env` and fill it in by hand.

| Variable | Required | Starts with | Where it comes from |
|---|---|---|---|
| `SLACK_BOT_TOKEN` | Yes | `xoxb-` | Slack app → **OAuth & Permissions** → Bot User OAuth Token |
| `SLACK_APP_TOKEN` | Yes | `xapp-` | Slack app → **Basic Information** → App-Level Tokens (scope `connections:write`) |
| `LOTR_API_TOKEN` | No | | Your account at [the-one-api.dev](https://the-one-api.dev) |

To change a token, run `npm run setup` again. It asks before replacing an existing `.env`.

### Updating and removing

**To update,** run `git pull`, or download the ZIP again and copy your `.env` into the new folder. Then run `npm install` once more. If the update added or renamed commands, paste the new `manifest.json` into your Slack app's **App Manifest** page.

**To remove it,** stop the bot and delete the folder. Then delete the Slack app: at [api.slack.com/apps](https://api.slack.com/apps), open the app and choose **Delete App** at the bottom of **Basic Information**.

## The One API

[The One API](https://the-one-api.dev) is a free, community-run database of *The Lord of the Rings*: the books and their chapters, the films, the characters, and the dialogue of the film trilogy. Slack of the Rings uses it in two ways.

**As the reference for every hand-picked line.** Every film line the bot ships with (139 at last count, across the replies to situations, the built-in pools, the pep talks and `/wisdom`) was compared against the API for speaker and wording before it went in. Lines the API could not confirm were left out. This is why Gimli has a part: "That still only counts as one!" is his line, not Legolas's, so he cuts in on `/legolas` to say it.

**As a bigger pool of random quotes, if you want one.** With a token in `.env`, each character's general pool grows from a couple of dozen lines to many more. In testing that came to 137 for Frodo, 173 for Gandalf, 39 for Legolas and 126 for Gollum.

### Getting a token

1. Sign up at [the-one-api.dev/sign-up](https://the-one-api.dev/sign-up). It is free.
2. Copy the access token from your account.
3. Run `npm run setup` again and paste it at the third question, or add it to `.env` yourself as `LOTR_API_TOKEN=...`.
4. Restart the bot. The startup message changes to `Quotes: The One API`.

### What happens at startup

```text
🔮 Fetching quotes from The One API...
   Frodo: 137 quotes
   Gandalf: 173 quotes
   Legolas: 39 quotes
   Gollum: 126 quotes
```

1. One request to `/v2/character` finds Frodo Baggins, Gandalf, Legolas and Gollum by name.
2. One request each to `/v2/character/{id}/quote` fetches their film dialogue.
3. Every line is tidied and filtered (see below).
4. What is left joins the built-in pool. Where the API and the built-in set have the same line, the built-in wording is kept.
5. The quotes stay in memory until the bot stops. Nothing more is fetched.

That is five requests per start, against the API's limit of 100 every ten minutes. Starting took about two seconds in testing.

### What is filtered out

Film dialogue is written to be heard in its scene, and the API's transcription has slips. A line has to stand on its own in a work channel, so these are dropped:

| Dropped | For example |
|---|---|
| Fragments: under 15 characters or under 4 words | “Sam!” |
| Speeches over 280 characters | |
| Short questions, which mean nothing out of context | “What did you say?” |
| Drawn-out shouts and hisses | “Yessssss” |
| Lines with transcription damage, such as a lost accent | “Nazg'l” |
| The grimmest lines: killing, murder and the like | “No! That would kill us! Kill us!” |
| Duplicates | |

Small slips are repaired instead: doubled spaces, a missing space after a full stop (“rises.Blood”), a capital I typed for an l (“Iet”), and stray stage directions. The filter is a set of simple rules, so the odd awkward line may still get through.

The grim-line filter is one line, `TOO_GRIM` in `quotes.js`, if you would rather have them.

### When the API is unavailable

The bot always starts. The console says what happened and the built-in quotes are used.

| Situation | What the console says |
|---|---|
| No token set | `No LOTR_API_TOKEN set, using built-in quotes.` |
| Token rejected | `The One API rejected the token. Check LOTR_API_TOKEN in .env.` |
| Rate limit reached | `The One API rate limit was reached. Try again in ten minutes.` |
| No answer within 8 seconds | `The One API took too long to answer.` |
| Anything else | `Could not reach The One API (...)` with the reason |

### What it does and doesn't change

| | Without a token | With a token |
|---|---|---|
| Replies to a situation (`/gandalf merge without tests`) | Hand-picked lines | The same hand-picked lines |
| `/wisdom`, `/quest`, pep talks, Gollum's coveting | Built in | The same |
| Replies when nothing fits, and `/versus` | Built-in pool | Built-in pool plus the API's quotes |

Two limits are worth knowing. The API's dialogue comes from the three films, so book-only lines aren't used anywhere in the bot. And nothing anyone types in Slack is ever sent to the API: the only thing it receives is your token, at startup.

## How it decides what to say

It is all rules, with no AI service behind it, so there is nothing extra to sign up or pay for. Here is one command, start to finish:

```text
/gandalf deploy on friday without tests
        │
        ▼
 1. Read the words       Lower-cased and split into words and clauses.
                         Mentions, #channels, links and :emoji: are removed.
        │
        ▼
 2. Score every          Gandalf's 18 situations are each checked for keywords:
    situation              "A warning"   without ~ test  2 points
                                         friday          1 point
                                         =deploy         1 point
                                                         4 points in all
                           (nothing else scores)
        │
        ▼
 3. Best score wins      "A warning" answers with one of its hand-picked lines,
                         never the one it gave last time.
        │
        ▼
 4. Build the message    🧙‍♂️ Gandalf: “Fly, you fools!”
                         On: deploy on friday without tests
```

### Keywords

Each situation is a list of keywords in `quotes.js`. A keyword scores one point per word, so a phrase outweighs a single word. The situation with the highest total answers, and a tie goes to the one listed first.

| Written as | Matches |
|---|---|
| `deploy` | The word and its ordinary endings: deploys, deployed, deploying, deployment. Never a longer word that starts the same way, so `tea` is not “team” |
| `=deployed` | Exactly that form and no other |
| `without review` | The words in a row |
| `without ~ test` | The words with up to two others in between: “without any tests” |

### The details that make it read well

- **Hand-picked lines, not a search.** An earlier version searched the whole quote pool by keyword, which sounded clever and returned nonsense: any Gandalf quote containing the word “fool” counted as a warning. Now a situation answers only from its own short list.
- **“Not” is understood where it changes the meaning.** A “not”, “never”, “don't” or “without” up to three words before a keyword, in the same clause, marks it as negated. `/gandalf don't skip the tests` earns no warning. `/legolas not done yet` is not an achievement; it is work still in progress, and gets a different line.
- **Tense carries meaning.** `/gandalf deploy on friday` is a plan and gets a warning. `/gandalf deployed successfully` is a report and gets good news.
- **Links and mentions can't trigger anything.** A channel named `#deploy-friday` or a URL containing “merge” is removed before the words are read.
- **No repeats.** A character never gives the same line twice in a row when there is another to choose from.
- **No match means a surprise**: a random quote from that character's pool.

### `/lotr`: one command to rule them all

`/lotr` works out who should answer.

1. If your text describes a situation someone knows, that character answers. `/lotr merge without tests` goes to Gandalf, `/lotr coffee` to Gollum, `/lotr closed 10 tickets` to Legolas. When several fit equally well (`/lotr prod is down`), one of them is picked.
2. If it reads as a job to be done, starting with a verb such as fix, write or build, it becomes a `/quest`.
3. Anything else gets a surprise: a character, `/council` or `/fellowship`.

With no text it picks from the four characters, `/fellowship` and `/wisdom`. `/lotr help` shows the command list, visible only to you.

### Gollum

Gollum doesn't quote, he covets. He picks the thing out of your sentence, so `/gollum I really need some coffee, please` covets *coffee*, and he has a different line for each of six kinds of wanting: access, food and drink, code, money, time off, and office kit. His coveting lines are written for the bot from his own phrases; they are not film quotes.

### The message itself

- **Slack's Block Kit** gives each speaker a name, a block quote and a context line showing what prompted it. A plain-text version goes along for notifications.
- **What you type is escaped** before it is echoed back, so `/quest <!channel>` can't ping the channel.
- **Long text is trimmed.** The first 500 characters are read, and 150 are echoed back.

## Architecture

The bot is four JavaScript files, plus a setup script and a Slack manifest, all in the `slack-of-the-rings` folder. This section is for anyone who wants to read the code, change it, or know what is running on their machine.

### The big picture

```text
        SLACK                                    YOUR COMPUTER
+-----------------------+              +----------------------------------------+
|                       |   command    |  slack.js      one handler per command |
|  /gandalf merge       | -----------> |     |                                  |
|  without tests        |              |     v                                  |
|                       |              |  messages.js   lays out the reply      |
|                       |              |     |                                  |
|  Gandalf              |              |     v                                  |
|  "You shall not       |    reply     |  quotes.js     chooses the line        |
|   pass!"              | <----------- |                                        |
|                       |              +----------------------------------------+
+-----------------------+                                  ^
  commands arrive over a WebSocket                         |  film quotes, once,
  that the bot opens                                       |  at startup (optional)
                                                  +-----------------+
                                                  |   The One API   |
                                                  +-----------------+
```

Three things to notice:

- **The bot dials out.** It opens one connection to Slack (Socket Mode) and commands arrive through it. Nothing on your computer has to be reachable from the internet.
- **Replies are made locally.** By the time a command arrives, every quote is already in memory. Nothing is looked up while answering.
- **The One API is a startup step, not a dependency.** If it is missing, slow or down, the bot starts anyway with its built-in lines.

### The files

| File | Size | What it does |
|---|---|---|
| `index.js` | 60 lines | The entry point. Checks the configuration, loads the quotes, starts the Slack connection |
| `slack.js` | 80 lines | The only file that touches Slack's library. A table of the ten commands and one loop that registers them |
| `messages.js` | 210 lines | Builds the Slack message for each command: layout, escaping, and the `/lotr` routing |
| `quotes.js` | 1,240 lines | Everything about what is said. About two thirds is data (the lines, the situations and their keywords); the rest is the matcher, the quote filter and The One API client |
| `setup.js` | 140 lines | First-run setup: builds the Slack link from the manifest, asks for tokens, writes `.env` |
| `start.command` | 30 lines | The double-click launcher for Mac. Installs, sets up if needed, starts |
| `manifest.json` | 35 lines | The Slack app definition: the ten commands, the one permission, Socket Mode |
| `test/bot.test.js` | 670 lines | The tests |
| `.env.example`, `COMMANDS.md` | | The configuration template and the full command reference |

It has three dependencies: [`@slack/bolt`](https://github.com/slackapi/bolt-js) for Slack, `axios` for The One API and `dotenv` for the configuration file.

### Four layers, one direction

```text
index.js  -->  slack.js  -->  messages.js  -->  quotes.js
startup        Slack          layout            lines, rules, The One API
```

Each file uses only what is to its right. (`index.js` also creates the quotes manager and hands it down the line.)

| Layer | Knows about | Knows nothing about |
|---|---|---|
| `index.js` | The configuration and the order things start in | Commands or quotes |
| `slack.js` | Slack's library, the command names, what to say if a command fails | What any character says |
| `messages.js` | How a reply is laid out in Slack, and who should answer `/lotr` | Slack's library or the network |
| `quotes.js` | Every line, every rule, how text is matched, The One API | Slack |

The split is what makes the bot testable. Neither `messages.js` nor `quotes.js` needs Slack, so the tests can run every command without a workspace. With The One API stubbed, they need no network either.

### Startup

`index.js` does five things in order:

1. Reads `.env`.
2. Checks that both Slack tokens are present and start with the right prefix. If not, it says which one is wrong and where to find it, and stops.
3. Loads the quotes: the built-in ones first, then the film quotes from The One API if a token is set.
4. Registers the ten commands and connects to Slack.
5. Prints that it is running, and where its quotes came from.

### The life of a command

1. Someone types `/gandalf merge without tests`. Slack sends the command to the bot.
2. `slack.js` acknowledges it straight away, because Slack gives up after three seconds, and looks the command up in its table.
3. The table calls `messages.character(quotes, 'gandalf', text)`.
4. `messages.js` asks `quotes.reply('gandalf', text)` for a line. `quotes.js` reads the words, scores Gandalf's situations and picks a line from the winner, as described in [How it decides what to say](#how-it-decides-what-to-say).
5. `messages.js` wraps the line in Slack blocks (the speaker, the quote, an “On: …” footer) with a plain-text version alongside, and escapes what the user typed.
6. `slack.js` sends the finished message back to Slack, which posts it in the channel.

### What it remembers

Two things, both in memory only:

- **The quote pools**, loaded at startup.
- **The last line each character said**, so that it isn't repeated straight away.

Nothing is written to disk and nothing survives a restart.

### When something goes wrong

| What fails | What happens |
|---|---|
| A Slack token is missing or in the wrong slot | The bot explains which and stops before connecting |
| The One API fails, hangs or returns too little | The bot starts with its built-in quotes and says why |
| A command throws an error | The person who typed it gets a private apology in character (“Even wizards make mistakes. Try again!”), the error is printed in the console, and the bot keeps running |
| `/versus` is given names it doesn't know | A usage hint, visible only to the person who typed it |

### Why it is built this way

**Socket Mode instead of a web server.** An ordinary Slack app is a web server: Slack sends each command to a public address, so you need hosting or a tunnel before anything works. With Socket Mode the bot opens the connection itself, so it runs from a laptop behind any network and setup is two tokens. The price is that it only answers while it is running.

**Rules instead of a language model.** The bot is free to run, needs no API key, and gives the same kind of answer to the same kind of message. Every quote it gives is a real film line with the right speaker, which a model can't promise. And because it is rules, it can be tested: 90 example phrases are checked on every run. The price is that it only understands the keywords it has been given.

**Hand-picked lines instead of searching the quotes.** Searching a few hundred film quotes for a keyword finds lines that contain the word, not lines that suit the moment. So each situation has its own short list, and the big pool is only used when nothing fits and a surprise is the point.

**Quotes loaded once, kept in memory.** Five requests at startup, then none. Replies are instant, the API's rate limit never matters, and an outage after startup changes nothing. The price is that a new token needs a restart.

**One large `quotes.js`.** It is the file you edit to change what the bot says, so everything a character can say, and when, is in one place as plain data. Adding a situation means adding an entry to a list; the matching code doesn't change.

**Messages built by plain functions.** Each command's builder takes the quotes and the typed text and returns an object. That keeps `slack.js` down to a table and a loop, and lets the tests check the message for every command.

**The manifest as the single source for the Slack side.** The one-click link is generated from `manifest.json`, and the tests fail if the link in this README, the manifest and the commands in `slack.js` ever disagree.

**No build step.** It is plain JavaScript for Node.js, with no TypeScript, no bundler and no development dependencies. The tests use Node's built-in test runner. Download, `npm install`, run.

## Make it your own

Everything a character can say is in `quotes.js`, written to be edited.

**Add or change a situation.** Each one is an entry in `SITUATIONS`:

```js
{
  id: 'burden',                      // a stable name, used by the tests
  about: 'The weight of it all',     // shown in COMMANDS.md
  keywords: ['overwhelm', 'burden', 'heavy', 'too much', 'on call'],
  quotes: [
    "The Ring is my burden.",
    "It's such a weight to carry."
  ]
}
```

Two optional flags handle “not”: `negatable: true` makes the situation ignore negated keywords, and `negationOf: 'other-id'` makes it answer when another situation's keywords appear only in the negative.

The tests expect each situation to be documented and exercised, so after adding one, add a row to [COMMANDS.md](slack-of-the-rings/COMMANDS.md) and a phrase to the `PHRASES` table in `test/bot.test.js`. `npm test` tells you if either is missing.

**Change the commands.** Their names and descriptions are in `manifest.json`, and their handlers in `slack.js`. The setup link in this README is built from the manifest, so after changing it, print a new link from the `slack-of-the-rings` folder and replace the last line of this file:

```bash
node -p "require('./setup').createAppUrl()"
```

For a Slack app that already exists, paste the new manifest into its **App Manifest** page.

**Add a character.** This is a bigger job. A character needs an entry in `CHARACTERS`, `SITUATIONS`, `FALLBACK_QUOTES` and `RALLY` in `quotes.js`, a command in `slack.js` and `manifest.json`, and a line in the help text in `messages.js`. Some tests name the four characters and will need updating too.

## Tests

From the `slack-of-the-rings` folder:

```bash
npm test
```

28 tests, which run in about a second and need neither Slack nor the network (The One API is stubbed). They cover:

- **Matching:** 90 realistic phrases and the situation each should be read as, including ones that should match nothing (“the push notification”, “team offsite”).
- **The lines:** situations answer only from their hand-picked lists, never twice in a row, and Gimli gets the credit for his line.
- **The One API:** tidying and filtering, the timeout, and falling back to built-in quotes when the API fails, hangs or returns too little.
- **Messages:** every command builds a valid Slack message, and user text can't trigger mentions.
- **Setup and docs:** the link in this README matches `manifest.json`, the manifest registers exactly the commands the bot handles, and every example in `COMMANDS.md` triggers the situation it claims to.

## Troubleshooting

| What you see | What it means | What to do |
|---|---|---|
| Slack says the command failed or the app did not respond (often shown as `dispatch_failed`) | The bot isn't running | Start it again |
| `The .env file needs attention` | A token is missing or in the wrong slot | Run `npm run setup` |
| Slack says the command “is not a valid command” | It isn't registered in your Slack app | Compare the app's **Slash Commands** page with `manifest.json` |
| `Failed to start: An API error occurred: invalid_auth` | Slack rejected a token: it is mistyped, was revoked, or belongs to a different app | Copy fresh tokens from the Slack app and run `npm run setup` |
| Commands work only some of the time | A second copy of the bot is running with the same tokens, and Slack sends each command to just one of them | Stop the other copy |
| `Quotes: built-in quotes` although you set a The One API token | The API couldn't be used | Read the line above it; see [When the API is unavailable](#when-the-api-is-unavailable) |
| `Slack of the Rings needs Node.js 18 or newer` | Node.js isn't installed, or isn't on the path | Install it from [nodejs.org](https://nodejs.org) |
| macOS won't open `start.command` | It was downloaded from the internet | Right-click it and choose **Open**, or allow it under **System Settings → Privacy & Security**. The terminal commands always work |
| A reply that doesn't fit what you typed | No situation matched, so you got a random quote | Check [COMMANDS.md](slack-of-the-rings/COMMANDS.md) for what each character knows, or add a keyword |

## Questions

**Does it use AI?**
No. Replies are chosen by keyword rules from lists written in advance, so the same kind of message gets the same kind of answer, and there is no model, API key or bill.

**Does it cost anything?**
No. Node.js is free, creating a Slack app is free, and so is The One API.

**Do I need a server?**
No. The bot connects out to Slack from wherever it runs, so a laptop is enough. It only answers while it is running.

**Can it read our messages?**
No. Its only Slack permission is `commands`, so Slack sends it just the text typed after one of its own slash commands.

**Can I use it without The One API?**
Yes. Every command works with the built-in lines. The token only widens the pool of random quotes.

**Are the quotes from the books?**
From the films. The One API's dialogue covers the film trilogy, and every hand-picked line was checked against it.

**Why does Gimli answer when I asked Legolas?**
Because the line is his. Legolas keeps his own count: “Final count: 42.”

**Can another workspace use my copy?**
Each workspace creates its own Slack app from the link and runs its own copy.

## Privacy and security

- **Tokens stay on your computer.** They live in `.env`, which is gitignored. On Mac and Linux, setup creates the file readable only by your user account.
- **Never commit `.env`.** If a token is ever exposed, regenerate it in your Slack app settings (or your The One API account) and run `npm run setup`.
- **Nothing is stored.** There is no database. The bot keeps no record of what people type, and writes nothing to disk apart from `.env`.
- **It talks to two places:** Slack, and The One API at startup if you gave it a token.
- **It asks Slack for one permission**, `commands`.

## Credits

- [The One API](https://the-one-api.dev) for the film dialogue, and for being the reference the lines were checked against.
- [Bolt for JavaScript](https://github.com/slackapi/bolt-js), Slack's framework for apps like this one.
- J.R.R. Tolkien for Middle-earth. The lines quoted are dialogue from the film trilogy.

This is a fan project made for fun. It is not affiliated with or endorsed by the Tolkien Estate, Middle-earth Enterprises or Warner Bros.

## License

MIT. See [LICENSE](LICENSE).

[create-app]: https://api.slack.com/apps?new_app=1&manifest_json=%7B%22display_information%22%3A%7B%22name%22%3A%22Slack%20of%20the%20Rings%22%2C%22description%22%3A%22Middle-earth%20quotes%20for%20every%20occasion.%20An%20unofficial%20fan%20project.%22%2C%22background_color%22%3A%22%232c3e2d%22%7D%2C%22features%22%3A%7B%22bot_user%22%3A%7B%22display_name%22%3A%22Slack%20of%20the%20Rings%22%2C%22always_online%22%3Afalse%7D%2C%22slash_commands%22%3A%5B%7B%22command%22%3A%22%2Flotr%22%2C%22description%22%3A%22One%20command%20to%20rule%20them%20all%3A%20whoever%20fits%20answers%22%2C%22usage_hint%22%3A%22%5Banything%2C%20or%20help%5D%22%2C%22should_escape%22%3Afalse%7D%2C%7B%22command%22%3A%22%2Ffrodo%22%2C%22description%22%3A%22Frodo%20responds%20to%20your%20situation%22%2C%22usage_hint%22%3A%22%5Bwhat%27s%20going%20on%5D%22%2C%22should_escape%22%3Afalse%7D%2C%7B%22command%22%3A%22%2Fgandalf%22%2C%22description%22%3A%22Gandalf%20offers%20wisdom%20or%20a%20warning%22%2C%22usage_hint%22%3A%22%5Bwhat%20you%27re%20about%20to%20do%5D%22%2C%22should_escape%22%3Afalse%7D%2C%7B%22command%22%3A%22%2Flegolas%22%2C%22description%22%3A%22Legolas%20downplays%20your%20achievement%22%2C%22usage_hint%22%3A%22%5Bwhat%20you%20achieved%5D%22%2C%22should_escape%22%3Afalse%7D%2C%7B%22command%22%3A%22%2Fgollum%22%2C%22description%22%3A%22Gollum%20covets%20whatever%20you%20want%22%2C%22usage_hint%22%3A%22%5Bthe%20thing%20you%20want%5D%22%2C%22should_escape%22%3Afalse%7D%2C%7B%22command%22%3A%22%2Ffellowship%22%2C%22description%22%3A%22A%20pep%20talk%20from%20the%20whole%20fellowship%22%2C%22usage_hint%22%3A%22%5Btopic%5D%22%2C%22should_escape%22%3Afalse%7D%2C%7B%22command%22%3A%22%2Fcouncil%22%2C%22description%22%3A%22The%20Council%20of%20Elrond%20weighs%20in%22%2C%22usage_hint%22%3A%22%5Btopic%5D%22%2C%22should_escape%22%3Afalse%7D%2C%7B%22command%22%3A%22%2Fversus%22%2C%22description%22%3A%22Quote%20battle%20between%20two%20characters%22%2C%22usage_hint%22%3A%22%5Bfrodo%7Cgandalf%7Clegolas%7Cgollum%5D%20vs%20%5Bfrodo%7Cgandalf%7Clegolas%7Cgollum%5D%22%2C%22should_escape%22%3Afalse%7D%2C%7B%22command%22%3A%22%2Fwisdom%22%2C%22description%22%3A%22Wisdom%20from%20Middle-earth%22%2C%22should_escape%22%3Afalse%7D%2C%7B%22command%22%3A%22%2Fquest%22%2C%22description%22%3A%22Turn%20your%20task%20into%20an%20epic%20quest%22%2C%22usage_hint%22%3A%22%5Btask%5D%22%2C%22should_escape%22%3Afalse%7D%5D%7D%2C%22oauth_config%22%3A%7B%22scopes%22%3A%7B%22bot%22%3A%5B%22commands%22%5D%7D%7D%2C%22settings%22%3A%7B%22interactivity%22%3A%7B%22is_enabled%22%3Afalse%7D%2C%22org_deploy_enabled%22%3Afalse%2C%22socket_mode_enabled%22%3Atrue%2C%22token_rotation_enabled%22%3Afalse%7D%7D
