/**
 * File: ai.js
 * Description: AI Assistant command for Discord Bot
 *
 * This command provides AI chat functionality with multiple models including
 * GPT-4o, Claude 4 Sonnet, Gemini, Sonar Pro/Reasoning and others through the 1min.ai API.
 *
 * Version: 1.0.0
 * Author: gl0bal01
 * Tags: Discord, AI, GPT, Claude, Gemini, Perplexity
 */

const { SlashCommandBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');

// --- Rate limiter ---
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX, 10) || 10;
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000;
const rateLimitMap = new Map(); // userId -> { count, resetAt }

function checkRateLimit(userId) {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    const remainingSec = Math.ceil((entry.resetAt - now) / 1000);
    return remainingSec;
  }

  entry.count++;
  return true;
}

// --- Conversation store with TTL eviction ---
const CONVERSATION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_USERS = 1000;
const userConversations = new Map(); // userId -> { lastAccess, conversations: Map }

function getConversations(userId) {
  let entry = userConversations.get(userId);
  if (!entry) {
    entry = { lastAccess: Date.now(), conversations: new Map() };
    userConversations.set(userId, entry);
  } else {
    entry.lastAccess = Date.now();
  }
  return entry.conversations;
}

function evictStaleConversations() {
  const now = Date.now();
  for (const [userId, entry] of userConversations) {
    if (now - entry.lastAccess > CONVERSATION_TTL_MS) {
      userConversations.delete(userId);
    }
  }
  // Hard cap: evict oldest if over limit
  if (userConversations.size > MAX_USERS) {
    let oldest = null;
    let oldestTime = Infinity;
    for (const [userId, entry] of userConversations) {
      if (entry.lastAccess < oldestTime) {
        oldest = userId;
        oldestTime = entry.lastAccess;
      }
    }
    if (oldest) userConversations.delete(oldest);
  }
}

// Run eviction every 5 minutes
setInterval(evictStaleConversations, 5 * 60 * 1000);

// --- Axios instance with timeout ---
const API_BASE = 'https://api.1min.ai/api';
const API_TIMEOUT_MS = 60000;

function createApiClient() {
  const apiKey = process.env.AI_TOKEN;
  return axios.create({
    baseURL: API_BASE,
    timeout: API_TIMEOUT_MS,
    headers: {
      'API-KEY': apiKey,
      'Content-Type': 'application/json'
    }
  });
}

// --- Helpers ---
const MAX_PROMPT_LENGTH = 2000;

function sanitizeResponse(text) {
  if (typeof text !== 'string') return text;
  // Strip Discord mentions that could cause mass pings
  return text.replace(/@(everyone|here)/g, '@\u200b$1');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Interact with AI Assistant')
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
    .addSubcommand(subcommand =>
      subcommand
        .setName('chat')
        .setDescription('Start a chat with AI')
        .addStringOption(option =>
          option
            .setName('message')
            .setDescription('Your message to AI')
            .setRequired(true)
            .setMaxLength(MAX_PROMPT_LENGTH))
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
            .setRequired(true)
            .setMaxLength(MAX_PROMPT_LENGTH))
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
    const userId = interaction.user.id;
    const subcommand = interaction.options.getSubcommand();

    // Rate limit check (skip for reset)
    if (subcommand !== 'reset') {
      const rateCheck = checkRateLimit(userId);
      if (rateCheck !== true) {
        return interaction.reply({
          content: `You're sending requests too fast. Try again in ${rateCheck}s.`,
          ephemeral: true
        });
      }
    }

    await interaction.deferReply();

    const api = createApiClient();
    const maxDiscordLength = 2000;
    const conversations = getConversations(userId);

    let progressTimer = null;
    let progressDone = false;

    try {
      // Handle reset subcommand
      if (subcommand === 'reset') {
        const modelToReset = interaction.options.getString('model') || 'all';

        if (modelToReset === 'all') {
          conversations.clear();
          return interaction.editReply('All conversation contexts have been reset.');
        } else if (modelToReset === 'code') {
          conversations.delete('code_context');
          return interaction.editReply('Code conversation context has been reset.');
        } else {
          conversations.delete(modelToReset);
          return interaction.editReply(`Conversation context for **${modelToReset}** has been reset.`);
        }
      }

      // Start progress indicator (5s interval to avoid Discord rate limits)
      let secondsElapsed = 0;
      progressTimer = setInterval(async () => {
        if (progressDone) return;
        secondsElapsed += 5;
        try {
          await interaction.editReply(`Processing your request... ${secondsElapsed}s elapsed`);
        } catch {
          // Interaction may have expired
        }
      }, 5000);

      let apiResponse;
      if (subcommand === 'chat') {
        const message = interaction.options.getString('message');
        const model = interaction.options.getString('model') || 'gpt-4o-mini';

        let conversationId = conversations.get(model);

        if (!conversationId) {
          const conversationResponse = await api.post('/conversations', {
            title: `Discord Chat - ${userId}`,
            type: 'CHAT_WITH_AI',
            model: model
          });
          conversationId = conversationResponse.data.conversation.uuid;
          conversations.set(model, conversationId);
        }

        apiResponse = await api.post('/features', {
          type: 'CHAT_WITH_AI',
          model: model,
          conversationId: conversationId,
          promptObject: { prompt: message }
        });

      } else if (subcommand === 'code') {
        const prompt = interaction.options.getString('prompt');
        const model = interaction.options.getString('model') || 'gpt-4o';
        const newContext = interaction.options.getBoolean('new_context') || false;

        const codeContextKey = 'code_context';
        let conversationId = conversations.get(codeContextKey);

        if (newContext || !conversationId) {
          const conversationResponse = await api.post('/conversations', {
            title: `Code Generation - ${userId}`,
            type: 'CODE_GENERATOR',
            model: model
          });
          conversationId = conversationResponse.data.conversation.uuid;
          conversations.set(codeContextKey, conversationId);
        }

        apiResponse = await api.post('/features', {
          type: 'CODE_GENERATOR',
          model: model,
          conversationId: conversationId,
          promptObject: { prompt: prompt }
        });
      }

      // Extract response from API
      let resultObject;
      if (apiResponse.data?.aiRecord?.aiRecordDetail?.resultObject) {
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
        resultText = resultObject.join('\n');
      } else if (typeof resultObject === 'object') {
        resultText = JSON.stringify(resultObject, null, 2);
      } else {
        resultText = String(resultObject);
      }

      // Sanitize Discord mentions
      resultText = sanitizeResponse(resultText);

      // Determine model used
      const modelUsed = interaction.options.getString('model') ||
        (subcommand === 'chat' ? 'gpt-4o-mini' : 'gpt-4o');

      const basePrefix = `**${modelUsed}** (${subcommand})\n`;
      const safeLimit = Math.floor(maxDiscordLength * 0.75);

      if (resultText.length <= (safeLimit - basePrefix.length)) {
        await interaction.editReply(basePrefix + resultText);
      } else {
        const file = new AttachmentBuilder(Buffer.from(resultText, 'utf-8'), {
          name: `ai_${subcommand}_response.txt`
        });

        await interaction.editReply({
          content: `${basePrefix}Response was too long for Discord. See attached file.`,
          files: [file]
        });
      }

    } catch (error) {
      console.error('AI API Error:', error.response?.status, error.message);

      let userMessage;
      if (error.response?.status === 401) {
        userMessage = 'Authentication error. Please contact the bot administrator.';
      } else if (error.response?.status === 429) {
        userMessage = 'The AI service is rate limiting requests. Please try again later.';
      } else if (error.code === 'ECONNABORTED') {
        userMessage = 'The request timed out. Please try again with a shorter prompt.';
      } else {
        userMessage = 'An unexpected error occurred. Please try again later.';
      }

      try {
        await interaction.editReply(userMessage);
      } catch {
        // Interaction may have expired
      }
    } finally {
      progressDone = true;
      if (progressTimer) clearInterval(progressTimer);
    }
  }
};
