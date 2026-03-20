/**
 * Discord AI Assistant Bot
 *
 * A Discord bot that provides AI chat functionality with multiple models
 * including GPT-4o, Claude, Gemini, Perplexity and others through the 1min.ai API.
 *
 * Version: 1.0.0
 * Author: gl0bal01
 * Tags: Discord, AI, GPT, Claude, Gemini, Perplexity
 */

const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

// Validate required environment variables at startup
const REQUIRED_ENV = ['DISCORD_TOKEN', 'AI_TOKEN', 'CLIENT_ID'];
const missing = REQUIRED_ENV.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill in your credentials.');
  process.exit(1);
}

// Parse optional guild allowlist
const ALLOWED_GUILDS = process.env.ALLOWED_GUILD_IDS
  ? process.env.ALLOWED_GUILD_IDS.split(',').map(id => id.trim()).filter(Boolean)
  : [];

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

// Create a collection for commands
client.commands = new Collection();

// Load commands from the commands directory
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    console.log(`Loaded command: ${command.data.name}`);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

// When the client is ready, run this code
client.once(Events.ClientReady, readyClient => {
  console.log(`Discord AI Assistant is ready! Logged in as ${readyClient.user.tag}`);
  console.log(`Serving ${readyClient.guilds.cache.size} servers`);
  if (ALLOWED_GUILDS.length > 0) {
    console.log(`Guild allowlist active: ${ALLOWED_GUILDS.length} guild(s)`);
  }

  // Set bot status
  client.user.setActivity('with AI models | /ai', { type: 'PLAYING' });
});

// Handle slash command interactions
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // Guild allowlist check
  if (ALLOWED_GUILDS.length > 0 && !ALLOWED_GUILDS.includes(interaction.guildId)) {
    return interaction.reply({
      content: 'This bot is not authorized for this server.',
      ephemeral: true
    });
  }

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('Error executing command:', error);

    const errorMessage = {
      content: 'There was an error while executing this command.',
      ephemeral: true
    };

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    } catch {
      // Interaction may have expired, nothing we can do
    }
  }
});

// Error handling
client.on('error', error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
