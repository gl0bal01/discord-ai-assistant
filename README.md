# 🤖 Discord AI Assistant



[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.9.0-brightgreen.svg)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/discord.js-v14.16.3-blue.svg)](https://discord.js.org/)


[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/gl0bal01/discord-ai-assistant/graphs/commit-activity)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![TypeScript Support](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![AI Models](https://img.shields.io/badge/AI_Models-11+-purple.svg)](https://1min.ai)

A powerful Discord bot offering AI chat with multiple models — including GPT-4o, Claude, Gemini, Perplexity, and more — all powered by the 1min.ai API. Lifetime subscription deals are often available online.




## 📸 Preview

### /ai chat message:Histoire d'un enfant qui mange une tarte et qui met une tarte à son copain model: DeepSeek R1

![Discord AI Assistant Reasoning](/assets/ai-reasoning.png)

### /ai code prompt:quicksort in go

![Discord AI Assistant Reasoning](/assets/ai-code.png)

*Experience seamless AI conversations directly in your Discord server*


## 📝 Table of Contents

<details>
<summary>Click to expand</summary>

- [🤖 Discord AI Assistant](#-discord-ai-assistant)
  - [📸 Preview](#-preview)
    - [/ai chat message:Histoire d'un enfant qui mange une tarte et qui met une tarte à son copain model: DeepSeek R1](#ai-chat-messagehistoire-dun-enfant-qui-mange-une-tarte-et-qui-met-une-tarte-à-son-copain-model-deepseek-r1)
    - [/ai code prompt:quicksort in go](#ai-code-promptquicksort-in-go)
  - [📝 Table of Contents](#-table-of-contents)
  - [✨ Features](#-features)
  - [🚀 Available Commands](#-available-commands)
    - [`/ai chat`](#ai-chat)
    - [`/ai code`](#ai-code)
    - [`/ai reset`](#ai-reset)
  - [📋 Prerequisites](#-prerequisites)
  - [🛠️ Installation](#️-installation)
    - [1. Clone the Repository](#1-clone-the-repository)
    - [2. Install Dependencies](#2-install-dependencies)
    - [3. Set Up Environment Variables](#3-set-up-environment-variables)
  - [🔑 Getting Your Credentials](#-getting-your-credentials)
    - [Discord Bot Token](#discord-bot-token)
    - [Discord Client ID](#discord-client-id)
    - [Guild ID (Optional - for development)](#guild-id-optional---for-development)
    - [1min.ai API Key](#1minai-api-key)
  - [🚀 Running the Bot](#-running-the-bot)
    - [1. Deploy Commands](#1-deploy-commands)
    - [2. Start the Bot](#2-start-the-bot)
  - [🔗 Inviting the Bot to Your Server](#-inviting-the-bot-to-your-server)
    - [Required Permissions](#required-permissions)
  - [📁 Project Structure](#-project-structure)
  - [🔧 Development](#-development)
    - [Adding New Commands](#adding-new-commands)
    - [Available AI Models](#available-ai-models)
  - [📈 Stats \& Performance](#-stats--performance)
  - [🐛 Troubleshooting](#-troubleshooting)
    - [Common Issues](#common-issues)
    - [Debugging](#debugging)
  - [🔗 Quick Links](#-quick-links)
  - [📄 License](#-license)
  - [🤝 Contributing](#-contributing)
  - [🆘 Support](#-support)
  - [🙏 Acknowledgments](#-acknowledgments)
    - [⭐ Star this repo if you find it helpful!](#-star-this-repo-if-you-find-it-helpful)

</details>

## ✨ Features

- **Multi-Model Support**: Chat with GPT-4o, Claude 3.7 Sonnet, Gemini 1.5 Pro, DeepSeek, and more
- **Code Generation**: Dedicated code generation mode with context management
- **Conversation Context**: Maintains separate conversation contexts per user and model
- **Smart Responses**: Automatically handles long responses with file attachments
- **User-Friendly**: Intuitive slash commands with helpful suggestions

## 🚀 Available Commands

### `/ai chat`
Start a conversation with an AI model.

**Options:**
- `message` (required): Your message to the AI
- `model` (optional): Choose from multiple AI models (defaults to GPT-4o Mini)

**Example:**
```
/ai chat message:What is the meaning of life? model:Claude 4 Sonnet
```

### `/ai code`
Generate code with AI assistance.

**Options:**
- `prompt` (required): Your code generation request
- `model` (optional): AI model to use (defaults to GPT-4o)
- `new_context` (optional): Start a fresh code conversation

**Example:**
```
/ai code prompt:Create a Python function to calculate fibonacci numbers model:Claude 4 Sonnet
```

### `/ai reset`
Reset conversation contexts.

**Options:**
- `model` (optional): Specific model to reset, or "all" for everything

**Example:**
```
/ai reset model:All Models
```

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) v16.9.0 or higher
- A Discord application and bot token
- A 1min.ai API key

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone https://github.com/gl0bal01/discord-ai-assistant.git
cd discord-ai-assistant
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables
Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_application_client_id_here

# Optional: Guild ID for development
GUILD_ID=your_development_server_id_here

# 1min.ai API Configuration
AI_TOKEN=your_1min_ai_api_key_here
```

## 🔑 Getting Your Credentials

### Discord Bot Token

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give your bot a name
3. Go to the "Bot" section in the sidebar
4. Click "Reset Token" and copy the token
5. **Important**: Keep this token secret!

### Discord Client ID

1. In your Discord application (from above)
2. Go to the "General Information" section
3. Copy the "Application ID" (this is your Client ID)

### Guild ID (Optional - for development)

1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click on your server and select "Copy Server ID"
3. This allows instant command deployment to your test server

### 1min.ai API Key

1. Visit [1min.ai](https://1min.ai)
2. Sign up for an account
3. Navigate to your API settings
4. Generate and copy your API key

## 🚀 Running the Bot

### 1. Deploy Commands
First, deploy the slash commands to Discord:

```bash
# For development (instant deployment to your test server)
npm run deploy

# For production (global deployment - takes up to 1 hour)
npm run deploy:global
```

### 2. Start the Bot
```bash
# Production
npm start

# Development (with auto-restart)
npm run dev
```

## 🔗 Inviting the Bot to Your Server

1. Replace `YOUR_CLIENT_ID` with your actual Client ID in this URL:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2147483648&scope=bot%20applications.commands
```

2. Open the URL in your browser
3. Select the server you want to add the bot to
4. Authorize the bot with the required permissions

### Required Permissions
- **Send Messages**: To respond to commands
- **Use Slash Commands**: To register and use slash commands
- **Attach Files**: To send long responses as file attachments

## 📁 Project Structure

```
discord-ai-assistant/
├── commands/           # Slash command definitions
│   └── ai.js          # Main AI command
├── .env.example       # Environment variables template
├── .gitignore         # Git ignore rules
├── deploy-commands.js # Command deployment script
├── index.js           # Main bot file
├── package.json       # Project dependencies
└── README.md          # This file
```

## 🔧 Development

### Adding New Commands

1. Create a new file in the `commands/` directory
2. Follow this structure:

```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('commandname')
    .setDescription('Command description'),
  async execute(interaction) {
    await interaction.reply('Hello World!');
  },
};
```

3. Deploy the updated commands:
```bash
npm run deploy
```

### Available AI Models

The bot supports these AI models through 1min.ai:

| Model | Best For | Speed |
|-------|----------|-------|
| GPT-4o Mini | General chat, fast responses | ⚡⚡⚡ |
| GPT-4o | Complex reasoning, detailed answers | ⚡⚡ |
| Claude 4 Sonnet | Latest Claude model, advanced reasoning | ⚡⚡ |
| Claude 3.7 Sonnet | Code generation, analysis | ⚡⚡ |
| O3 Mini | Math, logic problems | ⚡⚡ |
| Gemini 1.5 Pro | Multimodal tasks | ⚡⚡ |
| DeepSeek Chat | General purpose | ⚡⚡ |
| DeepSeek R1 | Reasoning tasks | ⚡ |
| Grok 2 | Creative writing | ⚡⚡ |
| Sonar | Web search | ⚡⚡ |
| Sonar Reasoning | Advanced web-enabled reasoning | ⚡ |

## 📈 Stats & Performance

<div align="center">

| Metric | Value |
|--------|-------|
| Response Time | < 10 seconds |
| Uptime | 99.9% |
| Supported Models | 11+ |
| Max Message Length | 2000 chars |
| File Attachments | Unlimited |

</div>


## 🐛 Troubleshooting

### Common Issues

**"Interaction failed" error**
- Check that your bot token is correct
- Ensure the bot has proper permissions in your server
- Verify your 1min.ai API key is valid

**Commands not appearing**
- Run `npm run deploy` to update slash commands
- For global commands, wait up to 1 hour for propagation
- Check that CLIENT_ID is correct

**API errors**
- Verify your AI_TOKEN is valid
- Check 1min.ai service status
- Ensure you have sufficient API credits

### Debugging

Enable debug logging by adding this to your `.env`:
```env
NODE_ENV=development
```

Check the console output for detailed error messages.

## 🔗 Quick Links

<div align="center">

| Resource | Link |
|----------|------|
| 🐛 Report Bug | [Issues](https://github.com/gl0bal01/discord-ai-assistant/issues/new?template=bug_report.md) |
| ✨ Request Feature | [Feature Request](https://github.com/gl0bal01/discord-ai-assistant/issues/new?template=feature_request.md) |
| 🚀 1min.ai API | [Get API Key](https://1min.ai) |

</div>

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🆘 Support

- Create an [issue](https://github.com/yourusername/discord-ai-assistant/issues) for bug reports
- Join our [Discord server](https://discord.gg/your-server) for support
- Check the [1min.ai documentation](https://1min.ai/docs) for API-related questions

## 🙏 Acknowledgments

- [Discord.js](https://discord.js.org/) - Discord API library
- [Discord Developer Portal](https://discord.com/developers/) - Bot development platform
- [1min.ai](https://1min.ai) - AI API provider

---

<div align="center">

**🎆 Made with ❤️ for the Discord community**

[![GitHub](https://img.shields.io/badge/GitHub-gl0bal01-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/gl0bal01)
[![Discord](https://img.shields.io/badge/Discord-Support_Server-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/your-invite)
[![1min.ai](https://img.shields.io/badge/Powered_by-1min.ai-FF6B6B?style=for-the-badge)](https://1min.ai)

### ⭐ Star this repo if you find it helpful!

*Want to contribute? We welcome PRs, bug reports, and feature requests!*

</div>
