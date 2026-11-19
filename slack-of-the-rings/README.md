# 🧙‍♂️ Slack of the Rings

Ten slash commands that answer your team with a fitting line from Middle-earth. Type `/gandalf merge without tests` and get told you shall not pass.

An unofficial, fan-made Slack bot. Not affiliated with or endorsed by the Tolkien Estate, Middle-earth Enterprises or Warner Bros.

<!-- Demo: record a short GIF of the commands in Slack, save it as docs/demo.gif, then uncomment the next line. -->
<!-- ![Slack of the Rings in action](docs/demo.gif) -->

## Commands

| Command | What you get | Try |
|---|---|---|
| `/lotr [anything]` | One command to rule them all: runs one of the others at random | `/lotr` |
| `/frodo [situation]` | Frodo on burdens, beginnings and not being able to go on | `/frodo feeling overwhelmed` |
| `/gandalf [situation]` | A warning for risky moves, or wisdom on lateness and hard choices | `/gandalf merge without tests` |
| `/legolas [achievement]` | Your achievement, downplayed | `/legolas closed 10 tickets` |
| `/gollum [thing]` | Gollum covets whatever you name | `/gollum coffee` |
| `/fellowship` | A pep talk from all four | `/fellowship` |
| `/council [topic]` | Frodo, Gandalf and Legolas weigh in on your topic | `/council deploy to production` |
| `/versus [a] [b]` | A quote battle between two characters | `/versus frodo gollum` |
| `/wisdom` | A line worth pausing on | `/wisdom` |
| `/quest [task]` | Your task, announced as a quest | `/quest fix the auth bug` |

Replies post in the channel for everyone. The full keyword list is in [COMMANDS.md](COMMANDS.md).

## How it decides what to say

- **Situations get hand-picked lines.** When your text contains a keyword the bot knows ("deploy", "deadline", "overwhelmed"), the reply comes from a short curated list for that situation. An earlier version searched the whole quote pool by keyword, which sounded clever and returned nonsense: any Gandalf quote containing the word "fool" counted as a warning.
- **Everything else is a surprise.** With no keyword match, the character answers with a random quote from their pool: a small built-in set, or hundreds of film quotes if you add a free [The One API](https://the-one-api.dev) token.
- **Gollum doesn't quote, he covets.** `/gollum coffee` builds a line in his voice around the thing you named.
- **Messages use Slack's Block Kit**, so each speaker gets a name, a block quote and a context line showing what prompted it.
- **What you type is escaped** before it is echoed back, so `/quest <!channel>` can't ping the channel.

## Setup

About five minutes. You need a Slack workspace where you can install apps, and [Node.js](https://nodejs.org) 18 or newer.

1. **Create the Slack app.** Go to [api.slack.com/apps](https://api.slack.com/apps), choose **Create New App → From a manifest**, pick your workspace, and paste in the contents of [`manifest.json`](manifest.json). This registers all ten commands at once.
2. **Install it.** On the app's **Install App** page, click **Install to Workspace** and copy the **Bot User OAuth Token** (starts with `xoxb-`).
3. **Create an app-level token.** On **Basic Information → App-Level Tokens**, click **Generate Token and Scopes**, add the `connections:write` scope, and copy the token (starts with `xapp-`).
4. **Start the bot.**
   - **Mac:** double-click `start.command`. The first run installs dependencies and asks for your two tokens. If macOS blocks the file, right-click it and choose **Open**.
   - **Any platform:**
     ```bash
     npm install
     npm run setup
     npm start
     ```
5. **Try `/lotr`** in any channel.

The bot answers for as long as it is running. It uses Slack's Socket Mode, which means it connects out to Slack: no public URL, tunnel or server is needed.

### More quotes (optional)

Sign up at [the-one-api.dev](https://the-one-api.dev/sign-up), then add the token to `.env` as `LOTR_API_TOKEN` (or run `npm run setup` again). Quotes are fetched once at startup and kept in memory. If the API is down, the bot falls back to its built-in quotes.

## Project layout

| File | Role |
|---|---|
| `index.js` | Checks the configuration and starts the bot |
| `slack.js` | Registers the slash commands |
| `messages.js` | Builds the Slack message for each command |
| `quotes.js` | Quote pools, situation matching, The One API client |
| `manifest.json` | Slack app definition, for one-paste setup |
| `setup.js` / `start.command` | First-run token prompts and the double-click launcher |
| `test/` | Tests for matching, message layout and the manifest |

Run the tests with `npm test`.

## Troubleshooting

- **"/command failed because the app did not respond"**: the bot isn't running. Start it again.
- **"The .env file needs attention"**: a token is missing or in the wrong slot. Run `npm run setup`.
- **A command "is not a valid command"**: it isn't registered in your Slack app. Compare the app's **Slash Commands** page with `manifest.json`.

## Security

Your tokens live in `.env`, which is gitignored. Never commit it, and regenerate the tokens in your Slack app settings if they are ever exposed.

## License

MIT
