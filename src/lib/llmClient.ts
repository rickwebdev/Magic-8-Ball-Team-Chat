const DEFAULT_MAX_TOKENS = 120
const DEFAULT_TEMPERATURE = 0.9
const LLM_TIMEOUT_MS = 4000

export interface LlmRequestBody {
  system: string
  userMessage: string
  maxTokens?: number
  temperature?: number
}

/**
 * Calls same-origin `/api/llm` (Vercel serverless in production).
 * Uses relative URL so it works with the site root; SPA lives under `/magic-8-ball/`.
 */
export async function callLlm(body: LlmRequestBody): Promise<string> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS)
  try {
    const res = await fetch('/api/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: body.system,
        userMessage: body.userMessage,
        maxTokens: body.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: body.temperature ?? DEFAULT_TEMPERATURE,
      }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}`)
    const data: unknown = await res.json()
    if (typeof data !== 'object' || data === null || !('text' in data)) {
      throw new Error('Invalid LLM response')
    }
    const text = (data as { text: unknown }).text
    if (typeof text !== 'string') throw new Error('Invalid LLM text')
    return text.trim()
  } finally {
    clearTimeout(t)
  }
}
