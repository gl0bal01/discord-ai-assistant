/**
 * Discord AI Assistant - Command Deployment Script
 * 
 * This script deploys slash commands to Discord.
 * Run this script whenever you add, modify, or remove commands.
 * 
 * Version: 1.0.0
 * Author: gl0bal01
 * Tags: Discord, AI, GPT, Claude, Gemini, Perplexity
 */

const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const commands = [];

// Grab all the command files from the commands directory
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
    console.log(`✅ Loaded command: ${command.data.name}`);
  } else {
    console.log(`⚠️  [WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Deploy commands
(async () => {
  try {
    console.log(`🚀 Started refreshing ${commands.length} application (/) commands.`);

    // Check if we should deploy globally or to a specific guild
    const guildId = process.env.GUILD_ID;
    
    let data;
    if (guildId) {
      // Deploy to specific guild (faster for development)
      console.log(`📍 Deploying to guild: ${guildId}`);
      data = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
        { body: commands },
      );
    } else {
      // Deploy globally (takes up to 1 hour to propagate)
      console.log('🌍 Deploying globally...');
      data = await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands },
      );
    }

    console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
    
    if (!guildId) {
      console.log('ℹ️  Global commands may take up to 1 hour to appear in all servers.');
    }
    
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
})();