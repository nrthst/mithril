# Command reference

Text in brackets is optional. Keywords match at the start of a word, in any case: "deploy" matches "deployed" and "Deploying".

## `/lotr [anything]`

Runs one of the other commands at random and passes your text along. With no text it picks from the four characters, `/fellowship` and `/wisdom`; with text, `/council` and `/quest` join the draw.

## Characters

### `/frodo [situation]`

| If your text mentions | Frodo answers about |
|---|---|
| can't, continue, go on, keep going, anymore, give up, quit | Not being able to go on |
| overwhelm, burden, heavy, tired, exhaust, hard, stress, too much | The burden |
| start, begin, take, accept, do it, volunteer, kick off, new project | Taking it on |
| anything else | A random Frodo quote |

### `/gandalf [situation]`

| If your text mentions | Gandalf answers with |
|---|---|
| deploy, merge, push, release, without test, no test, skip, force, friday | A warning |
| late, deadline, behind, delay, overdue, out of time | A word on timing |
| decide, choice, choose, decision, what to do, option | A word on decisions |
| anything else | A random Gandalf quote |

### `/legolas [achievement]`

| If your text mentions | Legolas answers with |
|---|---|
| fixed, closed, completed, deployed, finished, solved, shipped, merged, launched, done | "That still only counts as one!" |
| anything else | A random Legolas quote |

### `/gollum [thing]`

Gollum builds a line around the thing you name. These are written in his voice, not film quotes.

| If your text mentions | Gollum goes with |
|---|---|
| access, permission, password, login, admin, credential, key | Pocketses |
| food, coffee, drink, lunch, dinner, breakfast, pizza, snack, cake, tea, beer, fish | Raw and wriggling |
| code, deploy, merge, review, approval, commit, branch, pull request | My precious |
| anything else | Wanting it, generally |
| nothing | A random Gollum quote |

## Group commands

- **`/fellowship`**: a line each from Frodo, Gandalf, Legolas and Gollum.
- **`/council [topic]`**: Frodo, Gandalf and Legolas each respond to your topic, using the same keyword rules as their own commands. `/council deploy on friday` gets a warning from Gandalf.
- **`/versus [a] [b]`**: a random quote from each of two characters. Choose from `frodo`, `gandalf`, `legolas`, `gollum`. Mistakes get a usage hint only you can see.
- **`/wisdom`**: one line from a short list of the wiser things said in Middle-earth.
- **`/quest [task]`**: announces your task as a quest, with Frodo volunteering.

## Where the quotes come from

Situation replies and `/wisdom` use hand-picked lines in `quotes.js`. Random replies use the built-in set, or film quotes from [The One API](https://the-one-api.dev) when a token is configured.
