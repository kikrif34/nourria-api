import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.includes('VOTRE_CLE')) {
      throw new Error('[NourrIA] ANTHROPIC_API_KEY manquante dans .env');
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export type ImageInput = {
  base64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
};

export type ClaudeResponse = {
  content: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
};

export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 1000
): Promise<ClaudeResponse> {
  const client = getClaudeClient();
  const start = Date.now();

  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const content = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');

  return {
    content,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    durationMs: Date.now() - start,
  };
}

export async function callClaudeVision(
  systemPrompt: string,
  userPrompt: string,
  image: ImageInput,
  maxTokens = 1000
): Promise<ClaudeResponse> {
  const client = getClaudeClient();
  const start = Date.now();

  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: image.mimeType,
            data: image.base64,
          },
        },
        { type: 'text', text: userPrompt },
      ],
    }],
  });

  const content = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');

  return {
    content,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    durationMs: Date.now() - start,
  };
}

// Parse JSON robuste — gère tous les formats de réponse Claude
export function parseClaudeJson<T>(raw: string): T {
  // Tentative 1 : parse direct
  try {
    return JSON.parse(raw.trim()) as T;
  } catch {}

  // Tentative 2 : extrait le bloc ```json ... ```
  const matchJson = raw.match(/```json\s*([\s\S]*?)\s*```/i);
  if (matchJson) {
    try {
      return JSON.parse(matchJson[1].trim()) as T;
    } catch {}
  }

  // Tentative 3 : extrait le bloc ``` ... ```
  const matchCode = raw.match(/```\s*([\s\S]*?)\s*```/);
  if (matchCode) {
    try {
      return JSON.parse(matchCode[1].trim()) as T;
    } catch {}
  }

  // Tentative 4 : cherche le premier { ... } ou [ ... ]
  const matchObj = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (matchObj) {
    try {
      return JSON.parse(matchObj[1].trim()) as T;
    } catch {}
  }

  throw new Error(`[NourrIA] Réponse Claude non parseable : ${raw.slice(0, 200)}`);
}
