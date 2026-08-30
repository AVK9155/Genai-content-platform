// Quick test script — finds working free models for your OpenRouter key
// Usage: OPENROUTER_API_KEY=sk-or-... node test-models.mjs
const KEY = process.env.OPENROUTER_API_KEY || '';
if (!KEY) { console.error('Set OPENROUTER_API_KEY env var first'); process.exit(1); }


const FREE_MODELS = [
  'google/gemma-3-12b-it:free',
  'mistralai/mistral-7b-instruct:free',
  'qwen/qwen3-8b:free',
  'microsoft/phi-3-mini-128k-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'nousresearch/deephermes-3-llama-3-8b-preview:free',
  'moonshotai/moonlight-16b-a3b-instruct:free',
  'tngtech/deepseek-r1t-chimera:free',
];

async function test(model) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
    body: JSON.stringify({ model, max_tokens: 20, messages: [{ role: 'user', content: 'Say hi' }] }),
  });
  const data = await res.json();
  if (res.ok && data?.choices?.[0]?.message?.content) {
    return { ok: true, text: data.choices[0].message.content };
  }
  return { ok: false, error: data?.error?.message || data?.message || JSON.stringify(data) };
}

(async () => {
  console.log('Testing free models...\n');
  for (const model of FREE_MODELS) {
    process.stdout.write(`Testing ${model}... `);
    try {
      const result = await test(model);
      if (result.ok) {
        console.log(`✅ WORKS! Response: "${result.text}"`);
      } else {
        console.log(`❌ ${result.error}`);
      }
    } catch (e) {
      console.log(`❌ Error: ${e.message}`);
    }
  }
})();
