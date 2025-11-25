// AI Client - supports both Vertex AI and OpenRouter as fallback

const VERTEX_API_KEY = process.env.VERTEX_AI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';

// Default models
const VERTEX_MODEL = 'gemini-2.5-flash';
const OPENROUTER_MODEL = 'moonshotai/kimi-k2-instruct';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface GenerateOptions {
  systemInstruction?: string;
  messages?: ChatMessage[];
  functions?: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
}

// Generate content using OpenRouter API (OpenAI-compatible)
async function generateWithOpenRouter(prompt: string, options: GenerateOptions = {}) {
  const messages: Array<{ role: string; content: string }> = [];

  if (options.systemInstruction) {
    messages.push({ role: 'system', content: options.systemInstruction });
  }

  if (options.messages) {
    for (const msg of options.messages) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: 'user', content: prompt });

  const body: Record<string, unknown> = {
    model: OPENROUTER_MODEL,
    messages,
  };

  if (options.functions && options.functions.length > 0) {
    body.tools = options.functions.map((fn) => ({
      type: 'function',
      function: {
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters,
      },
    }));
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://arcane-gamemaster.app',
      'X-Title': 'Arcane Gamemaster',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data;
}

// Generate content using Vertex AI Express Mode
async function generateWithVertex(prompt: string, options: GenerateOptions = {}) {
  if (!VERTEX_API_KEY) {
    throw new Error('Vertex AI API key not configured');
  }

  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  if (options.messages) {
    for (const msg of options.messages) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }
  }

  contents.push({
    role: 'user',
    parts: [{ text: prompt }],
  });

  const body: Record<string, unknown> = {
    contents,
  };

  if (options.systemInstruction) {
    body.systemInstruction = { parts: [{ text: options.systemInstruction }] };
  }

  if (options.functions && options.functions.length > 0) {
    body.tools = [{
      functionDeclarations: options.functions.map((fn) => ({
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters,
      })),
    }];
  }

  const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${VERTEX_MODEL}:generateContent?key=${VERTEX_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vertex AI error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data;
}

// Main generate function - tries Vertex first, falls back to OpenRouter
export async function generateContent(prompt: string, systemInstruction?: string): Promise<string> {
  // Try Vertex AI first
  if (VERTEX_API_KEY) {
    try {
      const result = await generateWithVertex(prompt, { systemInstruction });
      return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (error) {
      console.warn('Vertex AI failed, falling back to OpenRouter:', error);
    }
  }

  // Fall back to OpenRouter
  const result = await generateWithOpenRouter(prompt, { systemInstruction });
  return result.choices?.[0]?.message?.content || '';
}

// Generate with function calling support
export async function generateContentWithFunctions(
  prompt: string,
  systemInstruction: string,
  functions: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
) {
  const messages = conversationHistory?.map((msg) => ({
    role: msg.role as 'user' | 'assistant' | 'system',
    content: msg.content,
  }));

  // Try Vertex AI first
  if (VERTEX_API_KEY) {
    try {
      return await generateWithVertex(prompt, { systemInstruction, messages, functions });
    } catch (error) {
      console.warn('Vertex AI failed, falling back to OpenRouter:', error);
    }
  }

  // Fall back to OpenRouter
  return await generateWithOpenRouter(prompt, { systemInstruction, messages, functions });
}

// Test the connection
export async function testConnection(): Promise<{ success: boolean; message: string; provider: string }> {
  // Try Vertex AI first
  if (VERTEX_API_KEY) {
    try {
      const text = await generateContent('Say "Connection successful!" and nothing else.');
      return {
        success: true,
        message: text || 'Connected but no response text',
        provider: 'Vertex AI',
      };
    } catch (error) {
      console.warn('Vertex AI test failed:', error);
    }
  }

  // Try OpenRouter
  try {
    const text = await generateContent('Say "Connection successful!" and nothing else.');
    return {
      success: true,
      message: text || 'Connected but no response text',
      provider: 'OpenRouter',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      provider: 'none',
    };
  }
}
