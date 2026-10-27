/**
 * Discord AI Assistant - Model Smoke Test
 *
 * Runs the real /ai chat and /ai code handlers against the live 1min.ai API
 * for every model choice, using a stub interaction. Spends 1min.ai credits.
 *
 * Usage: bun run check:models [model-substring]
 *
 * Version: 2.0.1
 * Author: gl0bal01
 */

require('dotenv').config({ quiet: true });

if (!process.env.AI_TOKEN) {
  console.error('AI_TOKEN is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const ai = require('../commands/ai.js');

const FEATURES = { chat: 'UNIFY_CHAT_WITH_AI', code: 'CODE_GENERATOR' };
const PROMPTS = {
  chat: 'Reply with exactly one word: OK',
  code: 'Write a JavaScript function add(a, b) that returns a + b. Code only.'
};
const filter = process.argv[2] || '';

// Capture the handler's console.error output for the case being run
let currentLog = null;
const originalError = console.error;
console.error = (...args) => {
  if (currentLog) currentLog.push(args.join(' '));
  else originalError(...args);
};

const cases = ai.data.toJSON().options
  .filter(sub => sub.name in FEATURES)
  .flatMap(sub => sub.options.find(o => o.name === 'model').choices
    .map(choice => ({ sub: sub.name, model: choice.value, label: choice.name })))
  .filter(c => c.model.includes(filter));

if (!cases.length) {
  console.error(`No model choice matches "${filter}".`);
  process.exit(1);
}

async function run({ sub, model, label }, index) {
  let reply;
  const interaction = {
    user: { id: `check-models-${index}` },
    options: {
      getSubcommand: () => sub,
      getString: name => (name === 'model' ? model : PROMPTS[sub]),
      getBoolean: () => true
    },
    deferReply: async () => {},
    editReply: async msg => {
      const content = typeof msg === 'string' ? msg : msg.content;
      if (!content.startsWith('Processing your request')) reply = msg;
    }
  };

  const log = currentLog = [];
  const started = Date.now();
  await ai.execute(interaction);
  currentLog = null;
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  const content = typeof reply === 'string' ? reply : reply?.content ?? '';
  const prefix = `**${label}** (${sub})\n`;
  const body = typeof reply === 'object' && reply.files
    ? reply.files[0].attachment.toString('utf-8')
    : content.slice(prefix.length);
  // Raw JSON or leftover 1min.ai web UI tags mean the reply was not cleaned up
  const ok = content.startsWith(prefix) && body.trim() !== '' &&
    !/^[[{]/.test(body.trimStart()) && !/<(thinking|artifact)\b/.test(body);
  const detail = ok ? body.trim().split('\n')[0].slice(0, 60) : (log.join(' | ') || content || body).slice(0, 300);

  return { ok, sub, model, seconds, detail };
}

(async () => {
  // Free check: every choice must be ACTIVE in the public 1min.ai roster for its feature
  const retired = [];
  for (const [sub, feature] of Object.entries(FEATURES)) {
    const { models } = await (await fetch(`https://api.1min.ai/models?feature=${feature}`)).json();
    const active = new Map(models.filter(m => m.status === 'ACTIVE').map(m => [m.modelId, m]));
    for (const c of cases.filter(c => c.sub === sub)) {
      const deprecation = active.get(c.model)?.deprecationDate;
      if (!active.has(c.model)) retired.push(c);
      else if (deprecation) console.log(`WARN  ${c.sub.padEnd(4)}  ${c.model.padEnd(32)}  deprecated on ${deprecation.slice(0, 10)}`);
    }
  }
  for (const c of retired) console.log(`FAIL  ${c.sub.padEnd(4)}  ${c.model.padEnd(32)}  not ACTIVE in 1min.ai ${FEATURES[c.sub]} roster`);
  console.log(`Roster: ${cases.length - retired.length}/${cases.length} choices active\n`);

  const live = cases.filter(c => !retired.includes(c));
  // One at a time: 1min.ai reserves credits per in-flight call (Fable alone can
  // reserve over a million), so parallel calls fail with INSUFFICIENT_CREDITS
  console.log(`Checking ${live.length} model choice(s), one at a time...\n`);

  const results = [];
  for (const [index, c] of live.entries()) {
    const result = await run(c, index);
    results.push(result);
    console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.sub.padEnd(4)}  ${result.model.padEnd(32)}  ${result.seconds.padStart(5)}s  ${result.detail}`);
  }

  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length || retired.length ? 1 : 0);
})().catch(err => {
  console.error('Check failed:', err.message);
  process.exit(1);
});
