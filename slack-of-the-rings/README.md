# 🧙‍♂️ Slack of the Rings

Ten slash commands that answer your team with a fitting line from Middle-earth. Type `/gandalf merge without tests` and Gandalf warns you off; type `/gandalf deployed successfully` and he is pleased for you.

An unofficial, fan-made Slack bot. Not affiliated with or endorsed by the Tolkien Estate, Middle-earth Enterprises or Warner Bros.

<!-- Demo: record a short GIF of the commands in Slack, save it as docs/demo.gif, then uncomment the next line. -->
<!-- ![Slack of the Rings in action](docs/demo.gif) -->

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

Replies post in the channel for everyone. Every situation the characters know, with an example for each, is in [COMMANDS.md](COMMANDS.md).

## How it decides what to say

It is all rules, with no AI service behind it, so there is nothing extra to sign up or pay for.

- **Situations get hand-picked lines.** Each character knows a set of situations (Gandalf has eighteen, from risky deploys to someone's last day). Your text is scored against all of them and the best fit answers from a short curated list. An earlier version searched the whole quote pool by keyword, which sounded clever and returned nonsense: any Gandalf quote containing the word "fool" counted as a warning.
- **It reads words, not letters.** "deploy" matches "deployed" and "deploying" but "tea" never matches "team". `/legolas not done yet` is not treated as an achievement, and `/gandalf deployed successfully` is good news where `/gandalf deploy on friday` is a warning.
- **The lines are checked.** Every hand-picked line was verified against [The One API](https://the-one-api.dev) for speaker and wording. That is why Gimli, not Legolas, delivers "That still only counts as one!": he cuts in on `/legolas` to say it.
- **Everything else is a surprise.** With no match, the character answers with a random quote from their pool: a built-in set, plus a few hundred film quotes if you add a free The One API token.
- **Gollum doesn't quote, he covets.** `/gollum I really need some coffee` builds a line in his voice around the *coffee*.
- **Messages use Slack's Block Kit**, so each speaker gets a name, a block quote and a context line showing what prompted it.
- **What you type is escaped** before it is echoed back, so `/quest <!channel>` can't ping the channel.

## Setup

About five minutes. You need a Slack workspace where you can install apps, and [Node.js](https://nodejs.org) 18 or newer. The bot runs on your own computer.

1. **Download the project.** On GitHub, click **Code → Download ZIP** and unzip it, or `git clone` the repository. The bot is the `slack-of-the-rings` folder.
2. **Create the Slack app.** Click **[Create the Slack app][create-app]**, pick your workspace, then click **Next** and **Create**. The link carries [`manifest.json`](manifest.json), so all ten commands are registered for you.
3. **Install it.** On the app's **Install App** page, click **Install to Workspace** and copy the **Bot User OAuth Token** (starts with `xoxb-`).
4. **Create an app-level token.** On **Basic Information → App-Level Tokens**, click **Generate Token and Scopes**, add the `connections:write` scope, and copy the token (starts with `xapp-`).
5. **Start the bot.**
   - **Mac:** double-click `start.command`. The first run installs dependencies, offers to open the link from step 2, and asks for your two tokens. If macOS blocks the file, right-click it and choose **Open**.
   - **Any platform:**
     ```bash
     npm install
     npm run setup
     npm start
     ```
6. **Try `/lotr`** in any channel.

If the link in step 2 doesn't work, go to [api.slack.com/apps](https://api.slack.com/apps), choose **Create New App → From a manifest**, and paste in the contents of `manifest.json`.

The bot answers for as long as it is running. It uses Slack's Socket Mode, which means it connects out to Slack: no public URL, tunnel or server is needed.

### More quotes (optional)

Sign up at [the-one-api.dev](https://the-one-api.dev/sign-up), then add the token to `.env` as `LOTR_API_TOKEN` (or run `npm run setup` again). Quotes are fetched once at startup, filtered, and kept in memory. If the API is down, slow or rejects the token, the bot says why and carries on with its built-in quotes.

## Project layout

| File | Role |
|---|---|
| `index.js` | Checks the configuration and starts the bot |
| `slack.js` | Registers the slash commands |
| `messages.js` | Builds the Slack message for each command |
| `quotes.js` | The lines, the situations and their keywords, the matching, The One API client |
| `manifest.json` | Slack app definition, used by the one-click link |
| `setup.js` / `start.command` | First-run setup (opens the Slack link, asks for tokens) and the double-click launcher |
| `test/` | Tests: 90 example phrases and the situation each should hit, message layout, setup, the manifest, and that the docs match the code |

Run the tests with `npm test`.

## Troubleshooting

- **"/command failed because the app did not respond"**: the bot isn't running. Start it again.
- **"The .env file needs attention"**: a token is missing or in the wrong slot. Run `npm run setup`.
- **A command "is not a valid command"**: it isn't registered in your Slack app. Compare the app's **Slash Commands** page with `manifest.json`.

## Security

Your tokens live in `.env`, which is gitignored. Never commit it, and regenerate the tokens in your Slack app settings if they are ever exposed.

## License

MIT

[create-app]: https://api.slack.com/apps?new_app=1&manifest_json=%7B%22display_information%22%3A%7B%22name%22%3A%22Slack%20of%20the%20Rings%22%2C%22description%22%3A%22Middle-earth%20quotes%20for%20every%20occasion.%20An%20unofficial%20fan%20project.%22%2C%22background_color%22%3A%22%232c3e2d%22%7D%2C%22features%22%3A%7B%22bot_user%22%3A%7B%22display_name%22%3A%22Slack%20of%20the%20Rings%22%2C%22always_online%22%3Afalse%7D%2C%22slash_commands%22%3A%5B%7B%22command%22%3A%22%2Flotr%22%2C%22description%22%3A%22One%20command%20to%20rule%20them%20all%3A%20whoever%20fits%20answers%22%2C%22usage_hint%22%3A%22%5Banything%2C%20or%20help%5D%22%2C%22should_escape%22%3Afalse%7D%2C%7B%22command%22%3A%22%2Ffrodo%22%2C%22description%22%3A%22Frodo%20responds%20to%20your%20situation%22%2C%22usage_hint%22%3A%22%5Bwhat%27s%20going%20on%5D%22%2C%22should_escape%22%3Afalse%7D%2C%7B%22command%22%3A%22%2Fgandalf%22%2C%22description%22%3A%22Gandalf%20offers%20wisdom%20or%20a%20warning%22%2C%22usage_hint%22%3A%22%5Bwhat%20you%27re%20about%20to%20do%5D%22%2C%22should_escape%22%3Afalse%7D%2C%7B%22command%22%3A%22%2Flegolas%22%2C%22description%22%3A%22Legolas%20downplays%20your%20achievement%22%2C%22usage_hint%22%3A%22%5Bwhat%20you%20achieved%5D%22%2C%22should_escape%22%3Afalse%7D%2C%7B%22command%22%3A%22%2Fgollum%22%2C%22description%22%3A%22Gollum%20covets%20whatever%20you%20want%22%2C%22usage_hint%22%3A%22%5Bthe%20thing%20you%20want%5D%22%2C%22should_escape%22%3Afalse%7D%2C%7B%22command%22%3A%22%2Ffellowship%22%2C%22description%22%3A%22A%20pep%20talk%20from%20the%20whole%20fellowship%22%2C%22usage_hint%22%3A%22%5Btopic%5D%22%2C%22should_escape%22%3Afalse%7D%2C%7B%22command%22%3A%22%2Fcouncil%22%2C%22description%22%3A%22The%20Council%20of%20Elrond%20weighs%20in%22%2C%22usage_hint%22%3A%22%5Btopic%5D%22%2C%22should_escape%22%3Afalse%7D%2C%7B%22command%22%3A%22%2Fversus%22%2C%22description%22%3A%22Quote%20battle%20between%20two%20characters%22%2C%22usage_hint%22%3A%22%5Bfrodo%7Cgandalf%7Clegolas%7Cgollum%5D%20vs%20%5Bfrodo%7Cgandalf%7Clegolas%7Cgollum%5D%22%2C%22should_escape%22%3Afalse%7D%2C%7B%22command%22%3A%22%2Fwisdom%22%2C%22description%22%3A%22Wisdom%20from%20Middle-earth%22%2C%22should_escape%22%3Afalse%7D%2C%7B%22command%22%3A%22%2Fquest%22%2C%22description%22%3A%22Turn%20your%20task%20into%20an%20epic%20quest%22%2C%22usage_hint%22%3A%22%5Btask%5D%22%2C%22should_escape%22%3Afalse%7D%5D%7D%2C%22oauth_config%22%3A%7B%22scopes%22%3A%7B%22bot%22%3A%5B%22commands%22%5D%7D%7D%2C%22settings%22%3A%7B%22interactivity%22%3A%7B%22is_enabled%22%3Afalse%7D%2C%22org_deploy_enabled%22%3Afalse%2C%22socket_mode_enabled%22%3Atrue%2C%22token_rotation_enabled%22%3Afalse%7D%7D
