# Discord AI Assistant

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.18.0-brightgreen.svg)](https://nodejs.org/)
[![DOI](https://zenodo.org/badge/1005640682.svg)](https://doi.org/10.5281/zenodo.15722664)

A lightweight Discord bot that gives every member of your server access to 12 AI models (GPT-4o, Claude Sonnet 4, Gemini, DeepSeek, Sonar, Grok, and others) through a single `/ai` slash command — all routed through the [1min.ai](https://1min.ai) API.

No per-model API keys. No heavyweight framework. One `.env`, three dependencies, and you're running.

---

**Also available as a CLI:** If you prefer working from the terminal, check out **[llm-1minai](https://github.com/gl0bal01/llm-1minai)** — a plugin for [Simon Willison's LLM CLI](https://llm.datasette.io/en/stable/) that connects the same 1min.ai backend to your shell and [Datasette](https://github.com/simonw/datasette).

---

## What it does

- `/ai chat` — conversational AI with persistent per-user, per-model context
- `/ai code` — dedicated code generation mode with its own context window
- `/ai reset` — clear conversation state (per model or all at once)

Long responses are automatically sent as file attachments. Model selection is a dropdown, not a config file edit.

<details>
<summary>Screenshots</summary>

**Reasoning with DeepSeek R1**

`/ai chat message:Histoire d'un enfant qui mange une tarte et qui met une tarte à son copain model: DeepSeek R1`

![Reasoning example](/assets/ai-reasoning.png)

**Code generation with GPT-4o**

`/ai code prompt:quicksort in go`

![Code generation example](/assets/ai-code.png)

</details>

## Supported models

| Model | Type | Speed |
|-------|------|-------|
| GPT-4o Mini | General chat | Fast |
| GPT-4o | Complex reasoning | Medium |
| Claude Sonnet 4 | Advanced reasoning, code | Medium |
| Claude 3.7 Sonnet | Code, analysis | Medium |
| O3 Mini | Math, logic | Medium |
| O1 Mini | Reasoning | Medium |
| Gemini 1.5 Pro | Multimodal | Medium |
| DeepSeek Chat | General purpose | Medium |
| DeepSeek R1 | Chain-of-thought reasoning | Slow |
| Grok 2 | Creative, conversational | Medium |
| Sonar / Sonar Reasoning | Web-grounded search | Medium/Slow |

## Setup

### Prerequisites

- Node.js >= 18.18.0
- A [Discord application](https://discord.com/developers/applications) with a bot token
- A [1min.ai](https://1min.ai) API key

### Install

```bash
git clone https://github.com/gl0bal01/discord-ai-assistant.git
cd discord-ai-assistant
bun install
```

### Configure

```bash
cp .env.example .env
```

Fill in your `.env`:

```env
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_client_id
GUILD_ID=your_dev_server_id          # optional, for faster dev deploys
AI_TOKEN=your_1min_ai_api_key

# Security (optional)
ALLOWED_GUILD_IDS=                   # comma-separated guild IDs to restrict access
RATE_LIMIT_MAX=10                    # max requests per user per window
RATE_LIMIT_WINDOW_MS=60000           # rate limit window in ms (default: 1 minute)
```

<details>
<summary>Where to find these credentials</summary>

**Discord Bot Token** — [Developer Portal](https://discord.com/developers/applications) > your app > Bot > Reset Token

**Client ID** — Developer Portal > your app > General Information > Application ID

**Guild ID** — Enable Developer Mode in Discord settings, then right-click your server > Copy Server ID

**1min.ai API Key** — [1min.ai](https://1min.ai) > Account > API settings

</details>

### Deploy commands and start

```bash
# Register slash commands (dev server — instant)
bun run deploy

# Or register globally (takes up to 1 hour to propagate)
bun run deploy:global

# Run the bot
bun start

# Or with auto-reload during development
bun run dev
```

### Invite the bot

Replace `YOUR_CLIENT_ID` in this URL and open it in a browser:

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2147483648&scope=bot%20applications.commands
```

Required permissions: Send Messages, Use Slash Commands, Attach Files.

## Project structure

```
discord-ai-assistant/
├── commands/
│   └── ai.js            # All /ai subcommands
├── index.js              # Bot client, command loader, event handlers
├── deploy-commands.js    # Slash command registration script
├── .env.example          # Environment template
└── package.json
```

## Extending

Add a new command by dropping a file in `commands/`:

```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Pong'),
  async execute(interaction) {
    await interaction.reply('Pong!');
  },
};
```

Then run `bun run deploy`.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Interaction failed" | Verify `DISCORD_TOKEN` and bot permissions |
| Commands not appearing | Run `bun run deploy`; global commands take up to 1 hour |
| API errors | Check `AI_TOKEN` validity and 1min.ai credit balance |

## License

MIT — see [LICENSE](LICENSE).

## Contributing

PRs, bug reports, and feature requests are welcome. Open an [issue](https://github.com/gl0bal01/discord-ai-assistant/issues) or submit a pull request.

## Links

- [Bug reports](https://github.com/gl0bal01/discord-ai-assistant/issues/new?template=bug_report.md)
- [Feature requests](https://github.com/gl0bal01/discord-ai-assistant/issues/new?template=feature_request.md)
- [1min.ai API](https://1min.ai)
- [discord.js](https://discord.js.org/)
