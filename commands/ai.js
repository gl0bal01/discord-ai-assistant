/**
 * File: ai.js
 * Description: AI Assistant command for Discord Bot
 *
 * This command provides AI chat functionality with multiple models through the
 * latest 1min.ai API.
 *
 * Version: 2.0.2
 * Author: gl0bal01
 * Tags: Discord, AI, GPT, Claude, Gemini, Perplexity
 */

const { SlashCommandBuilder, AttachmentBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
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

// Map order doubles as LRU order: entries are re-inserted on every access
function getConversations(userId) {
  const entry = userConversations.get(userId) ?? { conversations: new Map() };
  entry.lastAccess = Date.now();
  userConversations.delete(userId);
  userConversations.set(userId, entry);
  // Hard cap: evict least recently used
  if (userConversations.size > MAX_USERS) {
    userConversations.delete(userConversations.keys().next().value);
  }
  return entry.conversations;
}

function evictStaleEntries() {
  const now = Date.now();
  for (const [userId, entry] of userConversations) {
    if (now - entry.lastAccess <= CONVERSATION_TTL_MS) break; // the rest are newer
    userConversations.delete(userId);
  }
  for (const [userId, entry] of rateLimitMap) {
    if (now >= entry.resetAt) rateLimitMap.delete(userId);
  }
}

// Run eviction every 5 minutes
setInterval(evictStaleEntries, 5 * 60 * 1000).unref();

// --- Axios instance with timeout ---
const API_BASE = 'https://api.1min.ai/api';
const API_TIMEOUT_MS = 120000; // 1min.ai generation deadline is two minutes

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

// Next real <tag> opener (tag name followed by whitespace or ">") at or after `from`
function findTag(text, tag, from) {
  const open = `<${tag}`;
  for (let i = text.indexOf(open, from); i !== -1; i = text.indexOf(open, i + 1)) {
    if (/[\s>]/.test(text.charAt(i + open.length))) return i;
  }
  return -1;
}

// Index of the ">" ending the tag that starts at `start`, skipping quoted attribute values
function findTagEnd(text, start) {
  let quoted = false;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '"') quoted = !quoted;
    else if (text[i] === '>' && !quoted) return i;
  }
  return -1;
}

// CODE_GENERATOR replies use 1min.ai's web UI format: <thinking>...</thinking>
// blocks and <artifact language="js">code</artifact> blocks. Drop the reasoning and
// turn artifacts into Discord code blocks. One forward pass with indexOf (no lazy
// regexes), so hostile output stays linear-time; tags inside an artifact are code.
// ponytail: a literal </artifact> or ``` inside code ends the block early, like 1min.ai's own UI.
function formatCodeReply(text) {
  let out = '';
  let pos = 0;
  let thinking = findTag(text, 'thinking', 0);
  let artifact = findTag(text, 'artifact', 0);

  while (thinking !== -1 || artifact !== -1) {
    const isThinking = thinking !== -1 && (artifact === -1 || thinking < artifact);
    const start = isThinking ? thinking : artifact;
    const closeTag = isThinking ? '</thinking>' : '</artifact>';
    const openEnd = findTagEnd(text, start);
    const close = openEnd === -1 ? -1 : text.indexOf(closeTag, openEnd);

    if (close === -1) {
      // Unclosed reasoning with nothing before it means the reply was cut off mid-thought
      if (isThinking && !(out + text.slice(pos, start)).trim()) pos = text.length;
      break;
    }

    out += text.slice(pos, start);
    pos = close + closeTag.length;
    if (isThinking) {
      while (/\s/.test(text.charAt(pos))) pos++;
    } else {
      const lang = text.slice(start, openEnd).match(/language="([^"]*)"/)?.[1] ?? '';
      out += '```' + lang + '\n' + text.slice(openEnd + 1, close).replace(/^\n|\n$/g, '') + '\n```';
    }

    if (thinking !== -1 && thinking < pos) thinking = findTag(text, 'thinking', pos);
    if (artifact !== -1 && artifact < pos) artifact = findTag(text, 'artifact', pos);
  }
  return out + text.slice(pos);
}

// Model roster from https://api.1min.ai/models?feature=UNIFY_CHAT_WITH_AI|CODE_GENERATOR
// Discord allows max 25 choices per option; reset reuses CHAT_MODELS plus 2 extras.
const CHAT_MODELS = [
  { name: 'Claude Haiku 5.5', value: 'us.anthropic.claude-haiku-5-5' },
  { name: 'Claude Sonnet 5.5', value: 'us.anthropic.claude-sonnet-5-5' },
  { name: 'Claude Opus 5.5', value: 'us.anthropic.claude-opus-5-5' },
  { name: 'Claude Fable 5.1', value: 'us.anthropic.claude-fable-5-1' },
  { name: 'GPT-6 Luna', value: 'gpt-6-luna' },
  { name: 'GPT-6.1 Sol', value: 'gpt-6.1-sol' },
  { name: 'GPT-6 Astra', value: 'gpt-6-astra' },
  { name: 'Gemini 3.8 Flash', value: 'gemini-3.8-flash' },
  { name: 'Gemini 4 Argon', value: 'gemini-4-argon' },
  { name: 'Grok 4.7', value: 'grok-4.7' },
  { name: 'DeepSeek V4.1 Flash', value: 'deepseek-flash' },
  { name: 'DeepSeek V4 Pro', value: 'deepseek-v4-pro' },
  { name: 'Qwen3.8 Max', value: 'qwen3.8-max' },
  { name: 'Kimi K3', value: 'moonshotai/kimi-k3' },
  { name: 'GLM-5.3', value: 'glm-5.3' },
  { name: 'Mistral Medium 3.5', value: 'mistral-medium-3-5' },
  { name: 'Muse Wonder', value: 'meta/muse-wonder' },
  { name: 'Sonar', value: 'sonar' },
  { name: 'Sonar Pro', value: 'sonar-pro' },
  { name: 'Sonar Reasoning Pro', value: 'sonar-reasoning-pro' },
  { name: 'Sonar Deep Research', value: 'sonar-deep-research' }
];
const CODE_MODELS = [
  { name: 'Claude Sonnet 5.5', value: 'us.anthropic.claude-sonnet-5-5' },
  { name: 'Claude Opus 5.5', value: 'us.anthropic.claude-opus-5-5' },
  { name: 'Gemini 4 Argon', value: 'gemini-4-argon' },
  { name: 'Grok 4.7', value: 'grok-4.7' },
  { name: 'Kimi K2.7 Code', value: 'moonshotai/kimi-k2.7-code' },
  { name: 'DeepSeek V4 Pro', value: 'deepseek-v4-pro' },
  { name: 'GLM-5.3', value: 'glm-5.3' }
];
const CHAT_DEFAULT_MODEL = 'us.anthropic.claude-haiku-5-5';
const CODE_DEFAULT_MODEL = 'us.anthropic.claude-sonnet-5-5';
const MODEL_LABELS = new Map([...CHAT_MODELS, ...CODE_MODELS].map(m => [m.value, m.name]));
const WEB_SEARCH_MODELS = new Set([
  'sonar',
  'sonar-pro',
  'sonar-reasoning-pro',
  'sonar-deep-research'
]);

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
            .setDescription(`AI model to use (default: ${MODEL_LABELS.get(CHAT_DEFAULT_MODEL)})`)
            .setRequired(false)
            .addChoices(...CHAT_MODELS)))
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
            .setDescription(`AI model to use (default: ${MODEL_LABELS.get(CODE_DEFAULT_MODEL)})`)
            .setRequired(false)
            .addChoices(...CODE_MODELS))
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
              ...CHAT_MODELS,
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
          flags: MessageFlags.Ephemeral
        });
      }
    }

    await interaction.deferReply();

    const api = createApiClient();
    const maxDiscordLength = 2000;
    const conversations = getConversations(userId);

    let progressTimer = null;
    let progressDone = false;
    // Must run before the final editReply, or a late tick can overwrite the answer
    const stopProgress = () => {
      progressDone = true;
      clearInterval(progressTimer);
    };

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
          return interaction.editReply(`Conversation context for **${MODEL_LABELS.get(modelToReset) ?? modelToReset}** has been reset.`);
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
        const model = interaction.options.getString('model') || CHAT_DEFAULT_MODEL;

        let conversationId = conversations.get(model);

        if (!conversationId) {
          const conversationResponse = await api.post('/conversations', {
            title: `Discord Chat - ${userId}`,
            type: 'UNIFY_CHAT_WITH_AI',
            model: model
          });
          conversationId = conversationResponse.data.conversation.uuid;
          conversations.set(model, conversationId);
        }

        const chatPromptObject = {
          prompt: message,
          conversationId: conversationId,
          settings: {
            historySettings: {
              isMixed: false,
              historyMessageLimit: 10
            }
          }
        };

        if (WEB_SEARCH_MODELS.has(model)) {
          chatPromptObject.settings = {
            ...chatPromptObject.settings,
            webSearchSettings: {
              webSearch: true,
              numOfSite: model === 'sonar-deep-research' ? 10 : 5,
              maxWord: 1000
            }
          };
        }

        apiResponse = await api.post('/chat-with-ai', {
          type: 'UNIFY_CHAT_WITH_AI',
          model: model,
          promptObject: chatPromptObject
        });

      } else if (subcommand === 'code') {
        const prompt = interaction.options.getString('prompt');
        const model = interaction.options.getString('model') || CODE_DEFAULT_MODEL;
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

      stopProgress();

      // Extract response from API (resultObject is a list of strings)
      const resultObject = apiResponse.data?.aiRecord?.aiRecordDetail?.resultObject ??
        apiResponse.data?.result?.response;

      // 1min.ai can report errors (e.g. INSUFFICIENT_CREDITS) with a 2xx status,
      // either as the whole body or as an object in place of resultObject
      if (resultObject == null || (typeof resultObject === 'object' && !Array.isArray(resultObject))) {
        const noResult = new Error('AI API response has no result');
        noResult.apiCode = resultObject?.code ?? apiResponse.data?.code ?? apiResponse.data?.errorCode;
        throw noResult;
      }

      let resultText = Array.isArray(resultObject) ? resultObject.join('\n') : String(resultObject);

      if (subcommand === 'code') resultText = formatCodeReply(resultText);
      if (!resultText.trim()) throw new Error('AI API response is empty');

      // Determine model used
      const modelUsed = interaction.options.getString('model') ||
        (subcommand === 'chat' ? CHAT_DEFAULT_MODEL : CODE_DEFAULT_MODEL);

      const basePrefix = `**${MODEL_LABELS.get(modelUsed) ?? modelUsed}** (${subcommand})\n`;
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
      stopProgress();
      const apiCode = error.apiCode ?? error.response?.data?.errorCode ?? error.response?.data?.code;
      console.error('AI API Error:', error.response?.status, apiCode ?? '', error.message);

      let userMessage;
      if (error.response?.status === 401) {
        userMessage = 'Authentication error. Please contact the bot administrator.';
      } else if (error.response?.status === 429) {
        userMessage = 'The AI service is rate limiting requests. Please try again later.';
      } else if (apiCode === 'INSUFFICIENT_CREDITS') {
        userMessage = 'The AI service is out of credits. Please contact the bot administrator.';
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
      stopProgress();
    }
  },

  formatCodeReply
};
