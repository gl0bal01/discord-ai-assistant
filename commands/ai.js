/**
 * File: ai.js
 * Description: AI Assistant command for Discord Bot
 * 
 * This command provides AI chat functionality with multiple models including
 * GPT-4o, Claude 4 Sonnet, Gemini, Sonar Pro/Reasoning and others through the 1min.ai API.
 * 
 * Features:
 * - Multi-model AI chat support
 * - Code generation with dedicated context
 * - Conversation context management per user/model
 * - Automatic long response handling via file attachments
 * - Smart command suggestions
 * 
 * Version: 1.0.0
 * Author: gl0bal01
 * Tags: Discord, AI, GPT, Claude, Gemini, Perplexity
 */

const { SlashCommandBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');

// Map to store conversation IDs for each user
const userConversations = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Interact with AI Assistant')
    .addSubcommand(subcommand =>
      subcommand
        .setName('chat')
        .setDescription('Start a chat with AI')
        .addStringOption(option =>
          option
            .setName('message')
            .setDescription('Your message to AI')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('model')
            .setDescription('AI model to use')
            .setRequired(false)
            .addChoices(
              { name: 'GPT-4o Mini (Default)', value: 'gpt-4o-mini' },
              { name: 'GPT-4o', value: 'gpt-4o' },
              { name: 'Claude 3.7 Sonnet', value: 'claude-3-7-sonnet-20250219' },
              { name: 'Claude 4 Sonnet', value: 'claude-sonnet-4-20250514' },
              { name: 'O3 Mini', value: 'o3-mini' },
              { name: 'O1 Mini', value: 'o1-mini' },
              { name: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
              { name: 'Sonar Reasoning', value: 'sonar-reasoning' },
              { name: 'Sonar', value: 'sonar' },
              { name: 'DeepSeek Chat', value: 'deepseek-chat' },
              { name: 'DeepSeek R1', value: 'deepseek-reasoner' },
              { name: 'Grok 2', value: 'grok-2' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('code')
        .setDescription('Generate code with AI')
        .addStringOption(option =>
          option
            .setName('prompt')
            .setDescription('Your code generation prompt')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('model')
            .setDescription('AI model to use')
            .setRequired(false)
            .addChoices(
              { name: 'Claude 3.7 Sonnet', value: 'claude-3-7-sonnet-20250219' },
   	          { name: 'Claude 4 Sonnet', value: 'claude-sonnet-4-20250514' },
              { name: 'GPT-4o (Default)', value: 'gpt-4o' },
              { name: 'DeepSeek Chat', value: 'deepseek-chat' },
              { name: 'DeepSeek R1', value: 'deepseek-reasoner' }
            ))
        .addBooleanOption(option =>
          option
            .setName('new_context')
            .setDescription('Start a new code conversation context? (default: false)')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('Reset conversation context')
        .addStringOption(option =>
          option
            .setName('model')
            .setDescription('AI model to reset (defaults to all)')
            .setRequired(false)
            .addChoices(
              { name: 'All Models', value: 'all' },
              { name: 'GPT-4o Mini', value: 'gpt-4o-mini' },
              { name: 'GPT-4o', value: 'gpt-4o' },
              { name: 'Claude 3.7 Sonnet', value: 'claude-3-7-sonnet-20250219' },
              { name: 'Claude 4 Sonnet', value: 'claude-sonnet-4-20250514' },
              { name: 'O3 Mini', value: 'o3-mini' },
              { name: 'O1 Mini', value: 'o1-mini' },
              { name: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
              { name: 'DeepSeek Chat', value: 'deepseek-chat' },
              { name: 'DeepSeek R1', value: 'deepseek-reasoner' },
              { name: 'Sonar Reasoning', value: 'sonar-reasoning' },
              { name: 'Sonar', value: 'sonar' },
              { name: 'Grok 2', value: 'grok-2' },
              { name: 'Code Context', value: 'code' }
            ))),

  async execute(interaction) {
    await interaction.deferReply();

    const API_KEY = process.env.AI_TOKEN;
    if (!API_KEY) {
      return interaction.editReply({
        content: '❌ **Error:** API key not found! Please check your environment variables.',
        flags: MessageFlags.Ephemeral
      });
    }

    const maxDiscordLength = 2000;
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    // Initialize conversations map for this user if it doesn't exist
    if (!userConversations.has(userId)) {
      userConversations.set(userId, new Map());
    }

    // Progress indicator
    let secondsElapsed = 0;
    const progressTimer = setInterval(async () => {
      secondsElapsed++;
      try {
        await interaction.editReply(`🤖 Processing your request... ${secondsElapsed}s elapsed`);
      } catch (err) {
        console.error('Progress update error:', err);
      }
    }, 1000);

    try {
      // Handle reset subcommand
      if (subcommand === 'reset') {
        clearInterval(progressTimer);
        const modelToReset = interaction.options.getString('model') || 'all';
        
        if (modelToReset === 'all') {
          userConversations.get(userId).clear();
          return interaction.editReply('✅ All conversation contexts have been reset.');
        } else if (modelToReset === 'code') {
          userConversations.get(userId).delete('code_context');
          return interaction.editReply('✅ Code conversation context has been reset.');
        } else {
          userConversations.get(userId).delete(modelToReset);
          return interaction.editReply(`✅ Conversation context for **${modelToReset}** has been reset.`);
        }
      }

      let apiResponse;
      if (subcommand === 'chat') {
        const message = interaction.options.getString('message');
        const model = interaction.options.getString('model') || 'gpt-4o-mini';
        
        // Smart suggestion for code-related requests
        const codeKeywords = ['create', 'build', 'script', 'function', 'class', 'program', 'write code', 'generate code'];
        const messageLC = message.toLowerCase();
        const shouldUseCodeCommand = codeKeywords.some(keyword => messageLC.includes(keyword));
        
        if (shouldUseCodeCommand) {
          clearInterval(progressTimer);
          return interaction.editReply(
            "💡 **Suggestion:** It looks like you're trying to generate code. Consider using `/ai code` instead for better code generation results with dedicated context!"
          );
        }

        // Get or create conversation ID for this user and model
        let conversationId = userConversations.get(userId).get(model);
        
        if (!conversationId) {
          const conversationResponse = await axios.post(
            'https://api.1min.ai/api/conversations',
            {
              title: `Discord Chat - ${interaction.user.username}`,
              type: 'CHAT_WITH_AI',
              model: model
            },
            {
              headers: {
                'API-KEY': API_KEY,
                'Content-Type': 'application/json'
              }
            }
          );
          conversationId = conversationResponse.data.conversation.uuid;
          userConversations.get(userId).set(model, conversationId);
        }

        apiResponse = await axios.post(
          'https://api.1min.ai/api/features',
          {
            type: 'CHAT_WITH_AI',
            model: model,
            conversationId: conversationId,
            promptObject: { prompt: message }
          },
          {
            headers: {
              'API-KEY': API_KEY,
              'Content-Type': 'application/json'
            }
          }
        );

      } else if (subcommand === 'code') {
        const prompt = interaction.options.getString('prompt');
        const model = interaction.options.getString('model') || 'gpt-4o';
        const newContext = interaction.options.getBoolean('new_context') || false;
        
        const codeContextKey = 'code_context';
        let conversationId = userConversations.get(userId).get(codeContextKey);
        
        if (newContext || !conversationId) {
          const conversationResponse = await axios.post(
            'https://api.1min.ai/api/conversations',
            {
              title: `Code Generation - ${interaction.user.username}`,
              type: 'CODE_GENERATOR',
              model: model
            },
            {
              headers: {
                'API-KEY': API_KEY,
                'Content-Type': 'application/json'
              }
            }
          );
          conversationId = conversationResponse.data.conversation.uuid;
          userConversations.get(userId).set(codeContextKey, conversationId);
        }

        apiResponse = await axios.post(
          'https://api.1min.ai/api/features',
          {
            type: 'CODE_GENERATOR',
            model: model,
            conversationId: conversationId,
            promptObject: { prompt: prompt }
          },
          {
            headers: {
              'API-KEY': API_KEY,
              'Content-Type': 'application/json'
            }
          }
        );
      }

      clearInterval(progressTimer);

      // Extract response from API
      let resultObject;
      if (
        apiResponse.data?.aiRecord?.aiRecordDetail?.resultObject
      ) {
        resultObject = apiResponse.data.aiRecord.aiRecordDetail.resultObject;
      } else if (apiResponse.data?.result?.response) {
        resultObject = apiResponse.data.result.response;
      } else {
        resultObject = typeof apiResponse.data === 'string'
          ? apiResponse.data
          : JSON.stringify(apiResponse.data, null, 2);
      }

      // Convert to readable string
      let resultText;
      if (Array.isArray(resultObject)) {
        resultText = resultObject.join("\n");
      } else if (typeof resultObject === 'object') {
        resultText = JSON.stringify(resultObject, null, 2);
      } else {
        resultText = resultObject;
      }

      // Determine model used and context info
      const modelUsed = interaction.options.getString('model') || 
                      (subcommand === 'chat' ? 'gpt-4o-mini' : 'claude-3-7-sonnet-20250219');
      
      let contextInfo = '';
      if (subcommand === 'chat') {
        contextInfo = `\n*Context ID: ${userConversations.get(userId).get(modelUsed)}*`;
      } else if (subcommand === 'code') {
        contextInfo = `\n*Code Context ID: ${userConversations.get(userId).get('code_context')}*`;
      }
      
      const basePrefix = `**🤖 ${modelUsed}**${contextInfo}\n`;
      const safeLimit = Math.floor(maxDiscordLength * 0.75);
      
      if (resultText.length <= (safeLimit - basePrefix.length)) {
        await interaction.editReply(basePrefix + resultText);
      } else {
        const file = new AttachmentBuilder(Buffer.from(resultText, 'utf-8'), { 
          name: `ai_${subcommand}_response.txt` 
        });
        
        await interaction.editReply({
          content: `**🤖 ${modelUsed}** (${subcommand})${contextInfo}\n📄 Response was too long for Discord. See attached file.`,
          files: [file]
        });
      }

    } catch (error) {
      clearInterval(progressTimer);
      console.error('AI API Error:', error.response?.data || error.message);
      
      const errorMessage = error.response?.status === 401 
        ? '❌ **Authentication Error:** Invalid API key'
        : error.response?.status === 429
        ? '⏱️ **Rate Limited:** Please try again later'
        : `❌ **Error:** ${error.message}`;
      
      await interaction.editReply(errorMessage);
    }
  }
};